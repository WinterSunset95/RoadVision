import os
import time
import random
import threading
import subprocess
from typing import List

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel

### This is a rushed version of the RoadVision backend
### considering the very tight timeframe given for such a complex application
### We are going to first focus on bringing out the MVP in this one file,
### And then we will refactor the codebase to make it more maintainable

HLS_OUTPUT_DIR = "hls_output"
if not os.path.exists(HLS_OUTPUT_DIR):
    os.makedirs(HLS_OUTPUT_DIR)

## Core logic
class StreamManager:
    def __init__(self):
        self.streams = {}
        self.active_conversions = {}
        self.lock = threading.Lock()
        self.processing_thread = threading.Thread(target=self._simulate_processing, daemon=True)
        self.processing_thread.start()

    def _simulate_processing(self):
        while True:
            time.sleep(5)
            with self.lock:
                if not self.streams:
                    continue
                print("SIMULATOR: Running AI model simulation on active streams...")
                for stream_id, stream in self.streams.items():
                    if random.random() < 0.7:
                        stream['detections'] += random.randint(1, 5)
                        stream['last_update'] = time.strftime('%Y-%m-%d %H:%M:%S')
                    if random.random() < 0.1:
                        alert_msg = f"Critical event detected on {stream['name']}"
                        stream['alerts'].append(alert_msg)
                        print(f"ALERT: {alert_msg}")

    def add_stream(self, name, source):
        with self.lock:
            stream_id = str(len(self.streams) + 1)
            self.streams[stream_id] = {
                'id': stream_id, 'name': name, 'source': source,
                'status': 'Running', 'detections': 0, 'alerts': [], 'hls_url': None,
                'last_update': time.strftime('%Y-%m-%d %H:%M:%S')
            }
            print(f"INFO: Added new stream '{name}' with ID {stream_id}")
            return stream_id

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

    def start_hls_conversion(self, stream_id):
        with self.lock:
            stream = self.streams.get(stream_id)
            if not stream:
                raise ValueError("Stream not found")
            if not stream['source'].startswith("rtsp://"):
                raise ValueError("Only RTSP streams are supported for HLS conversion")
            if stream_id in self.active_conversions:
                print(f"INFO: HLS Conversion for stream {stream_id} is already in progress")
                return stream["hls_url"]
            stream_output_dir = os.path.join(HLS_OUTPUT_DIR, stream_id)
            if not os.path.exists(stream_output_dir):
                os.makedirs(stream_output_dir)
            playlist_path = os.path.join(stream_output_dir, "playlist.m3u8")

            ## Ffmpeg command to convert RTSP stream to HLS
            command = [
                "ffmpeg",
                "-i", stream["source"],
                "-c:v", "copy",
                "-c:a", "aac",
                "-f", "hls",
                "-hls_time", "4",
                "-hls_list_size", "5",
                "-hls_flags", "delete_segments",
                playlist_path
            ]

            print(f"Starting FFmpeg for stream {stream_id}: {' '.join(command)}")

            ## Run ffmpeg in a separate process
            process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.PIPE)
            self.active_conversions[stream_id] = process

            ## Update stream status
            stream["status"] = "Converting"
            stream["hls_url"] = f"http://localhost:8000/hls/{stream_id}/playlist.m3u8"

            return stream["hls_url"]


## Pydantic Models
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

## The API Layer
app = FastAPI(title="RoadVision API", version="0.1.0")

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
    stream_id = stream_manager.add_stream(stream.name, stream.source)
    return stream_manager.get_stream(stream_id)

@app.post("/api/play/{stream_id}", response_model=PlayResponse, tags=["Playback"])
async def play_stream(stream_id: str):
    stream = stream_manager.get_stream(stream_id)
    if not stream:
        raise HTTPException(status_code=404, detail="Stream not found")
    if not stream['source'].startswith("rtsp://"):
        raise HTTPException(status_code=400, detail="Only RTSP streams are supported for playback")

    try:
        hls_url = stream_manager.start_hls_conversion(stream_id)
        return PlayResponse(hls_url=hls_url)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.on_event("startup")
async def startup_event():
    print("INFO: Starting up the RoadVision backend...")
    stream_manager.add_stream("Test Cam1 (RTSP)", "rtsp://807e9439d5ca.entrypoint.cloud.wowza.com:1935/app-rC94792j/068b9c9a_stream2")
    stream_manager.add_stream("Test Cam2 (RTSP)", "rtsp://demo:demo@ipvmdemo.dyndns.org:5541/onvif-media/media.amp?profile=profile_1_h264&sessiontimeout=60&streamtype=unicast")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

