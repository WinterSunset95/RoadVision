import os
from sys import stdin
import time
import threading
import subprocess
from typing import Dict, List
import shutil
import json

import numpy as np
from numpy.lib import source
import torch
import uvicorn
import cv2
from ultralytics import YOLO
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

# This is a rushed version of the RoadVision backend
# considering the very tight timeframe given for such a complex application
# We are going to first focus on bringing out the MVP in this one file,
# And then we will refactor the codebase to make it more maintainable

HLS_OUTPUT_DIR = "hls_output"
if not os.path.exists(HLS_OUTPUT_DIR):
    os.makedirs(HLS_OUTPUT_DIR)

MODEL_PATH = "best.pt"
MODEL_PATH_FULL = os.path.join(os.getcwd(), MODEL_PATH)
print(MODEL_PATH_FULL)
if not os.path.exists(MODEL_PATH_FULL):
    print(f"ERROR: Model file not found at {MODEL_PATH_FULL}")
    model = None
else:
    # model = torch.hub.load('yolov7', 'custom', MODEL_PATH_FULL, source='local')
    model = YOLO(MODEL_PATH)


# Core logic
class StreamManager:
    def __init__(self):
        self.streams: Dict[str, Dict] = {}
        self.active_processes: Dict[str, subprocess.Popen] = {}
        self.processing_threads: Dict[str, List[threading.Thread]] = {}
        self.lock = threading.RLock()

    def add_stream(self, name, source):
        with self.lock:
            stream_id = str(len(self.streams) + 1)
            self.streams[stream_id] = {
                'id': stream_id, 'name': name, 'source': source,
                'status': 'Running', 'detections': 0, 'alerts': [], 'hls_url': None,
                'last_update': time.strftime('%Y-%m-%d %H:%M:%S')
            }
            print(f"INFO: Added new stream '{name}' with ID {stream_id}")
            if source.startswith("rtsp://"):
                self.start_processing(stream_id)
            return self.streams[stream_id]

    def remove_stream(self, stream_id):
        with self.lock:
            if stream_id in self.streams:
                del self.streams[stream_id]
                print(f"INFO: Removed stream with ID {stream_id}")
                return True
            return False

    def get_all_streams(self):
        with self.lock:
            return list(self.streams.values())

    def get_stream(self, stream_id):
        with self.lock:
            if stream_id in self.streams:
                return self.streams[stream_id]
            raise HTTPException(status_code=404, detail="Stream not found")

    def start_processing(self, stream_id):
        with self.lock:
            if stream_id in self.processing_threads and self.processing_threads[stream_id].is_alive():
                print(f"INFO: Stream {stream_id} is already being processed")
                return
            stream = self.get_stream(stream_id)
            if not stream:
                print(f"ERROR: Cannot start processing, stream {stream_id} not found")
                return
            hls_thread = threading.Thread(target=self._run_hls_conversion, args=(stream_id,), daemon=True)
            ai_thread = threading.Thread(target=self._run_ai_analysis, args=(stream_id,), daemon=True)
            self.processing_threads[stream_id] = [hls_thread, ai_thread]
            hls_thread.start()
            ai_thread.start()
            stream['status'] = 'Starting'

    def stop_processing(self, stream_id):
        with self.lock:
            if stream_id in self.active_processes:
                process = self.active_processes.pop(stream_id)
                print(f"INFO: Stopping FFmpeg processing for stream {stream_id}")
                process.terminate()
                try:
                    process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    process.kill()

            self.processing_threads.pop(stream_id, None)
            stream = self.get_stream(stream_id)
            if stream:
                stream['status'] = 'Idle'

            self.cleanup_stream_hls(stream_id)

    def _log_ffmpeg_output(self, stream_id, pipe):
        try:
            with pipe:
                for line in iter(pipe.readline, b''):
                    print(f"FFMPEG-{stream_id}: {line.decode('utf-8').strip()}")
        except Exception as e:
            print(f"ERROR: Failed to read FFmpeg output for stream {stream_id}: {e}")

    def _run_hls_conversion(self, stream_id):
        stream = self.get_stream(stream_id)
        if not stream: 
            return

        source_url = stream.get('source')
        stream_output_dir = os.path.join(HLS_OUTPUT_DIR, stream_id)
        os.makedirs(stream_output_dir, exist_ok=True)
        playlist_path = os.path.join(stream_output_dir, "playlist.m3u8")

        command = [
            'ffmpeg', '-y', '-rtsp_transport', 'tcp', '-i', source_url,
            '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-preset', 'veryfast',
            '-tune', 'zerolatency', '-c:a', 'aac', '-f', 'hls',
            '-hls_time', '2', '-hls_list_size', '3',
            '-hls_flags', 'delete_segments+omit_endlist',
            playlist_path
        ]

        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
        with self.lock:
            self.active_processes[stream_id] = process
            stream["status"] = "Running"
            stream["hls_url"] = f"http://localhost:8000/hls/{stream_id}/playlist.m3u8"
        # threading.Thread(target=self._log_ffmpeg_output, args=(f"{stream_id}-hls", process.stderr), daemon=True).start()
        process.wait()
        print(f"HLS_THREAD: FFmpeg process for stream {stream_id} has stopped.")
        with self.lock:
            self.active_processes.pop(stream_id, None)
            if stream_id in self.streams:
                self.streams[stream_id]['status'] = 'Idle'

    def _run_ai_analysis(self, stream_id: str):
        while True:
            with self.lock:
                if stream_id not in self.streams:
                    print(f"AI_THREAD: Stream {stream_id} removed. Stopping analysis.")
                    break
                stream = self.streams[stream_id]
                source_url = stream['source']
            if model is None:
                print("AI_THREAD: Model not loaded, skipping analysis.")
                time.sleep(10)
                continue

            # --- Frame Sampling Logic ---
            cap = cv2.VideoCapture(source_url)
            if not cap.isOpened():
                print(f"AI_THREAD: Could not open stream {source_url} for analysis.")
                time.sleep(10) # Wait before retrying
                continue
            ret, frame = cap.read()
            cap.release() # Immediately release the capture
            if ret:
                print(f"AI_THREAD: Analyzing frame from stream {stream_id}...")
                results = model(frame, verbose=False)
                num_detections = len(results[0].boxes)
                if num_detections > 0:
                    with self.lock:
                        stream["detections"] += num_detections
                        stream["last_update"] = time.strftime('%Y-%m-%d %H:%M:%S')
                        for box in results[0].boxes:
                            class_name = model.names[int(box.cls[0])]
                            stream['alerts'].append(f"{class_name} detected")
            else:
                print(f"AI_THREAD: Failed to grab frame from {source_url}.")

    def cleanup_stream_hls(self, stream_id):
        stream_output_dir = os.path.join(HLS_OUTPUT_DIR, stream_id)
        if os.path.exists(stream_output_dir):
            print(f"Removing HLS output directory for stream {stream_id}")
            shutil.rmtree(stream_output_dir)

    def shutdown(self):
        print("INFO: Shutting down the RoadVision backend...")
        with self.lock:
            for stream_id in list(self.streams.keys()):
                self.stop_processing(stream_id)

        if os.path.exists(HLS_OUTPUT_DIR):
            print("Removing HLS output directory")
            shutil.rmtree(HLS_OUTPUT_DIR)
        os.mkdir(HLS_OUTPUT_DIR)


# Pydantic Models
class StreamBase(BaseModel):
    name: str
    source: str


class StreamCreate(StreamBase):
    pass


class Stream(StreamBase):
    id: str
    status: str
    detections: int
    alerts: List[str]
    hls_url: str | None
    last_update: str


class PlayResponse(BaseModel):
    hls_url: str


# The API Layer
app = FastAPI(title="RoadVision API", version="0.1.0")


@app.middleware("http")
async def add_no_cache_headers(request: Request, call_next):
    response = await call_next(request)
    if request.url.path.startswith("/hls"):
        response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
        response.headers["Expires"] = "0"
        response.headers["Pragma"] = "no-cache"
    return response


app.mount("/hls", StaticFiles(directory=HLS_OUTPUT_DIR), name="hls")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

stream_manager = StreamManager()


@app.get("/")
async def root():
    return {"message": "Hello there programmer!"}


@app.get("/api/streams", response_model=List[Stream])
async def get_all_streams():
    return stream_manager.get_all_streams()


@app.post("/api/streams", response_model=Stream)
async def create_stream(stream: StreamCreate):
    return stream_manager.add_stream(stream.name, stream.source)


@app.post(
    "/api/play/{stream_id}",
    response_model=PlayResponse,
    tags=["Playback"]
)
async def play_stream(stream_id: str):
    stream = stream_manager.get_stream(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    if not stream['source'].startswith("rtsp://"):
        raise HTTPException(status_code=400, detail="Only RTSP streams are supported for playback")

    return PlayResponse(hls_url=stream['hls_url'])


@app.on_event("startup")
async def startup_event():
    print("INFO: Starting up the RoadVision backend...")


@app.on_event("shutdown")
async def shutdown_event():
    stream_manager.shutdown()

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)
