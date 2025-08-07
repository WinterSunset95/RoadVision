// app/page.tsx
'use client';

import { useCallback, useEffect, useState } from 'react';
import { Stream } from '@/app/lib/types';
import StreamCard from '@/app/components/StreamCard';
import AddStreamModal from './components/AddStreamModal';
import { Plus } from 'lucide-react';

export default function DashboardPage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchStreams = useCallback(async () => {
    try {
      const res = await fetch('http://localhost:8000/api/streams', {
        cache: 'no-store',
      })
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(errorData);
      }
      const data = await res.json();
      setStreams(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, [])

  useEffect(() => {
    fetchStreams();
    const intervalId = setInterval(fetchStreams, 5000); // Refresh data every 5 seconds
    return () => clearInterval(intervalId);
  }, [fetchStreams]);

  if (isLoading) {
    return <div className="text-center p-10">Loading streams...</div>;
  }

  if (error) {
    return <div className="text-center p-10 text-red-500">Error: {error}</div>;
  }

  return (
    <>
      <AddStreamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStreamAdded={fetchStreams}
      />
      <main className="container mx-auto p-4 sm:p-6 lg:p-8">
        <div className='flex justify-between items-center mb-6 border-b pb-2'>
          <h1 className="text-3xl font-bold text-gray-800">
            RoadVision Dashboard
          </h1>
            <button
              onClick={() => setIsModalOpen(true)}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              <Plus size={20} className="mr-2" />
              Add New Feed
            </button>
        </div>
        {streams.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {streams.map((stream) => (
              <StreamCard key={stream.id} stream={stream} />
            ))}
          </div>
        ) : (
          <div className="text-center p-10 bg-gray-50 rounded-lg">
            <p className="text-gray-500">No active feeds found.</p>
            <p className="text-sm text-gray-400 mt-2">
              Click 'Add New Feed' to get started.
            </p>
          </div>
        )}
      </main>
    </>
  );
}

