// components/DashboardSection.tsx
'use client';

import { useState } from 'react';
import { Stream } from '@/app/lib/types';
import StreamCard from '@/app/components/StreamCard';
import AddStreamModal from '@/app/components/AddStreamModal';
import { ArrowRight, Plus, VideoOff } from 'lucide-react';
import Link from 'next/link';

interface DashboardSectionProps {
  streams: Stream[];
  isLoading: boolean;
  error: string | null;
  onStreamAdded: () => void;
}

export default function DashboardSection({ streams, isLoading, error, onStreamAdded }: DashboardSectionProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <section id="dashboard" className="py-12 sm:py-16 bg-white">
      <AddStreamModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onStreamAdded={onStreamAdded}
      />
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center mb-8 gap-2">
          <h2 className="text-3xl font-bold text-slate-900 grow">Live Analysis Feeds</h2>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            <Plus size={20} className="mr-2" />
            Add New Feed
          </button>
          <Link href="/multi_monitor"
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors shadow-sm"
          >
            Monitor View
            <ArrowRight size={20} className="ml-2" />
          </Link>
        </div>

        {isLoading && <div className="text-center p-10 text-slate-500">Loading active feeds...</div>}
        {error && <div className="text-center p-10 text-red-500">Error: {error}</div>}
        
        {!isLoading && !error && (
          streams.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {streams.map((stream) => (
                <StreamCard key={stream.id} stream={stream} />
              ))}
            </div>
          ) : (
            <div className="text-center p-16 bg-slate-50 rounded-lg border-2 border-dashed border-slate-300">
              <VideoOff className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-semibold text-slate-800">No active feeds</h3>
              <p className="mt-1 text-sm text-slate-500">Get started by adding a new video feed.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
