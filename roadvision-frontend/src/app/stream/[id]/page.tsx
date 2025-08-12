// app/stream/[id]/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { Stream } from '@/app/lib/types';
import VideoPlayer from '@/app/components/VideoPlayer';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, PlayCircle, StopCircle } from 'lucide-react';
import Navbar from '@/app/components/Navbar';

export default function StreamDetailPage() {
  const params = useParams();
  const [stream, setStream] = useState<Stream | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [playerUrl, setPlayerUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const fetchStreamDetails = useCallback(async () => {
    if (!params.id) return;
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/streams`);
      if (!res.ok) throw new Error('Failed to fetch stream data');
      const streams: Stream[] = await res.json();
      const currentStream = streams.find(s => s.id === params.id) || null;
      setStream(currentStream);
      console.log(currentStream)

      if (currentStream) {
        if (currentStream.status === 'Running' && currentStream.hls_url) {
          console.log(currentStream.hls_url)
          setPlayerUrl(`${currentStream.hls_url}`);
        } else if (!currentStream.source.startsWith('rtsp://')) {
          setPlayerUrl(currentStream.source);
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  }, [params.id]);

  useEffect(() => {
    fetchStreamDetails();
  }, []);

  const handlePlayRTSP = async () => {
    if (!stream) return;
    setIsProcessing(true);
    try {
      setPlayerUrl(`${stream.hls_url}`);
    } catch (error) {
      console.error("Error starting RTSP stream:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStopRTSP = async () => {
    if (!stream) return;
    setIsProcessing(true);
    try {
      setPlayerUrl(null);
    } catch (error) {
      console.error("Error stopping RTSP stream:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  const getSourceType = (sourceUrl: string) => {
    return sourceUrl.endsWith('.m3u8') ? 'application/x-mpegURL' : 'video/mp4';
  };

  if (isLoading) return <div className="text-center p-10 text-slate-500">Loading stream details...</div>;
  if (!stream) return <div className="text-center p-10 text-red-500">Stream not found.</div>;

  const isRTSP = stream.source.startsWith('rtsp://');
  console.log(stream.status)
  const isStreaming = stream.status == 'Running';
  console.log("isStreaming:", isStreaming)

  return (
    <div className="bg-slate-100 min-h-screen">
      <Navbar />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <Link href="/" className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-6">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Dashboard
        </Link>
        <h1 className="text-3xl font-bold mb-6 text-slate-800">{stream.name}</h1>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-black rounded-lg shadow-lg flex items-center justify-center min-h-[400px]">
            {playerUrl ? (
              <VideoPlayer options={{ autoplay: true, controls: true, responsive: true, fluid: true, sources: [{ src: playerUrl, type: getSourceType(playerUrl) }] }} />
            ) : (
              <div className="text-center text-white p-8">
                <h3 className="text-xl font-semibold mb-4">RTSP Stream Ready</h3>
                <p className="text-slate-400 mb-6">Click to start the live conversion for playback.</p>
                <button onClick={handlePlayRTSP} disabled={isProcessing} className="flex items-center justify-center px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-all disabled:bg-blue-400">
                  <PlayCircle className="w-6 h-6 mr-2" /> {isProcessing ? 'Starting...' : 'Start Stream'}
                </button>
              </div>
            )}
          </div>
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-bold mb-4 border-b border-slate-200 pb-3 text-slate-800">Stream Controls & Analytics</h2>
            {isRTSP && (
              <div className="mb-6">
                <button onClick={isStreaming ? handleStopRTSP : handlePlayRTSP} disabled={isProcessing} className={`w-full flex items-center justify-center p-3 rounded-md text-white font-bold transition-all ${isStreaming ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700'} disabled:bg-slate-400`}>
                  {isStreaming ? <StopCircle className="w-5 h-5 mr-2"/> : <PlayCircle className="w-5 h-5 mr-2"/>}
                  {isProcessing ? 'Processing...' : (isStreaming ? 'Stop Conversion' : 'Start Conversion')}
                </button>
              </div>
            )}
            <div className="space-y-4 text-sm">
              <div><strong className="text-slate-600">Source:</strong> <span className="text-slate-500 break-all font-mono">{stream.source}</span></div>
              <div><strong className="text-slate-600">Defects Found:</strong> <span className="text-slate-800 font-semibold">{stream.detections}</span></div>
              <div><strong className="text-slate-600">Last Update:</strong> <span className="text-slate-500">{stream.last_update}</span></div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
