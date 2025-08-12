'use client'
import React, { useEffect, useState } from "react";
import Navbar from "../components/Navbar";
import Link from "next/link";
import { ArrowLeft, PlusIcon } from "lucide-react";
import { Stream } from "../lib/types";
import VideoPlayer from "../components/VideoPlayer";
import StreamCard from "../components/StreamCard";

const MonitorView = ({ streams, setStreams }: { streams: Stream[], setStreams: React.Dispatch<React.SetStateAction<Stream[]>>}) => {

  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [showSelector, setShowSelector] = useState(false);

  const getSourceType = (sourceUrl: string) => {
    return sourceUrl.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
  };

  return (
    <div className="bg-white flex justify-center items-center text-black rounded-md overflow-hidden shadow-md">

      <div className={`absolute top-0 left-0 flex w-full h-full z-10 bg-white rounded-md p-2 shadow-md ${showSelector ? 'block' : 'hidden'}`}>
        <div className="relative w-full h-full flex justify-center items-center">
          <div className="absolute w-full h-full bg-[rgba(0,0,0,0.1)] z-20" onClick={() => setShowSelector(false)}></div>
          <div className=" grid grid-flow-col gap-2 z-30">
            {streams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} button="yes" onClick={() => {
                console.log(stream);
                setPlayerUrl(stream.hls_url);
                setShowSelector(false);
                // Remove the stream from the list
                setStreams((streams) => streams.filter(s => s.id !== stream.id));
              }} />
            ))}
          </div>
        </div>
      </div>

      {playerUrl ? (
        <div className="w-full h-full bg-black flex justify-center items-center">
          <VideoPlayer options={{ autoplay: true, controls: true, responsive: true, fluid: true, sources: [{ src: playerUrl, type: getSourceType(playerUrl) }] }} />
        </div>
      ): (
        <div>
          <button className="flex justify-center items-center p-4 shadow-md rounded-lg bg-slate-100 cursor-pointer" onClick={() => setShowSelector(!showSelector)}>
            <PlusIcon size={20} className="" />
          </button>
        </div>
      )}
    </div>
  )
}

export default function MultiMonitor() {
  const [streams, setStreams] = useState<Stream[]>([]);

  const loadStreams = async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/streams', { cache: 'no-store' });
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Failed to fetch streams: ${errorData}`);
      }
      const data = await res.json();
      setStreams(data);
    } catch (e: any) {
      console.error(e);
    }
  }

  useEffect(() => {
    loadStreams();
  }, []);

  return (
    <div className="bg-slate-100 h-screen flex flex-col text-black relative">
      <Navbar />
      <main className="grid grid-cols-2 grid-rows-2 gap-4 p-4 w-full h-full">
        <MonitorView streams={streams} setStreams={setStreams}/>
        <MonitorView streams={streams} setStreams={setStreams}/>
        <MonitorView streams={streams} setStreams={setStreams}/>
        <MonitorView streams={streams} setStreams={setStreams}/>
      </main>
    </div>
  );
}
