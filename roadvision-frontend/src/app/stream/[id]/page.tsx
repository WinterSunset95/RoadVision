// app/stream/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { Stream } from '@/app/lib/types';
import VideoPlayer from '@/app/components/VideoPlayer';
import Link from 'next/link';
import { AlertCircle, ArrowLeft } from 'lucide-react';

// This component fetches data for a single stream
async function getStreamById(id: string): Promise<Stream | null> {
  try {
    const res = await fetch(`http://127.0.0.1:8000/api/streams`, { cache: 'no-store' });
    if (!res.ok) throw new Error('Failed to fetch data');
    const streams: Stream[] = await res.json();
    return streams.find(s => s.id === id) || null;
  } catch (error) {
    console.error(error);
    return null;
  }
}

export default function StreamDetailPage({ params }: { params: { id: string } }) {
  const [stream, setStream] = useState<Stream | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!params.id) return;

    const fetchData = async () => {
      const data = await getStreamById(params.id);
      setStream(data);
      setIsLoading(false);
    };

    fetchData();
  }, [params.id]);

  if (isLoading) {
    return <div className="text-center p-10">Loading stream details...</div>;
  }

  if (!stream) {
    return <div className="text-center p-10 text-red-500">Stream not found.</div>;
  }

  // Logic to determine the correct video type
  const getSourceType = (sourceUrl: string) => {
    if (sourceUrl.endsWith('.m3u8')) {
      return 'application/x-mpegURL';
    }
    if (sourceUrl.endsWith('.mp4')) {
      return 'video/mp4';
    }
    // Default or add more types as needed
    return 'application/x-mpegURL';
  };

  return (
    <main className="container mx-auto p-4">
      <Link href="/" className="inline-flex items-center text-blue-600 hover:underline mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Link>
      <h1 className="text-3xl font-bold mb-4">{stream.name}</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <VideoPlayer
            options={{
              autoplay: true,
              controls: true,
              responsive: true,
              fluid: true,
              sources: [{
                src: stream.source,
                type: getSourceType(stream.source), // Dynamically set the type
              }],
            }}
          />
        </div>

        <div className="bg-white p-4 rounded-lg shadow-md border">
          <h2 className="text-xl font-bold mb-3 border-b pb-2">Analytics & Alerts</h2>
          <div className="space-y-3">
            <div><strong>Source:</strong> <span className="text-gray-600 break-all">{stream.source}</span></div>
            <div><strong>Defects Found:</strong> <span className="text-gray-600 font-mono">{stream.detections}</span></div>
            <div><strong>Last Update:</strong> <span className="text-gray-600">{stream.last_update}</span></div>
          </div>
          
          <div className="mt-4">
            <h3 className="font-bold mb-2">Alerts ({stream.alerts.length})</h3>
            {stream.alerts.length > 0 ? (
              <ul className="space-y-2 max-h-60 overflow-y-auto bg-red-50 p-3 rounded-md">
                {stream.alerts.map((alert, index) => (
                  <li key={index} className="text-sm text-red-800 flex items-start">
                    <AlertCircle className="w-4 h-4 mr-2 mt-0.5 flex-shrink-0" />
                    <span>{alert}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-gray-500">No alerts for this stream.</p>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

