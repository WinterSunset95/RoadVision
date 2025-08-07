import time
import random
import threading
from typing import List

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

### This is a rushed version of the RoadVision backend
### considering the very tight timeframe given for such a complex application
### We are going to first focus on bringing out the MVP in this one file,
### And then we will refactor the codebase to make it more maintainable

## Core logic
class StreamManager:
    def __init__(self):
        self.streams = {}
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
                'status': 'Running', 'detections': 0, 'alerts': [],
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
    last_update: str

## The API Layer
app = FastAPI(title="RoadVision API", version="0.1.0")

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

@app.on_event("startup")
async def startup_event():
    print("INFO: Starting up the RoadVision backend...")
    stream_manager.add_stream("Highway 101 - North", "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)

