// app/page.tsx
'use client';

import { useEffect, useState, useCallback } from 'react';
import { Stream } from '@/app/lib/types';
import HeroSection from '@/app/components/HeroSection';
import DashboardSection from '@/app/components/DashboardSection';
import AlertsSection from '@/app/components/AlertsSection';
import Navbar from '@/app/components/Navbar';

export default function HomePage() {
  const [streams, setStreams] = useState<Stream[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch streams data and provide it to child components
  const fetchStreams = useCallback(async () => {
    try {
      const res = await fetch('http://127.0.0.1:8000/api/streams', { cache: 'no-store' });
      if (!res.ok) {
        const errorData = await res.text();
        throw new Error(`Failed to fetch streams: ${errorData}`);
      }
      const data = await res.json();
      setStreams(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStreams();
    const intervalId = setInterval(fetchStreams, 5000); // Refresh data globally
    return () => clearInterval(intervalId);
  }, [fetchStreams]);

  return (
    <div className="bg-slate-100 min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <DashboardSection 
          streams={streams} 
          isLoading={isLoading}
          error={error}
          onStreamAdded={fetchStreams} 
        />
        <AlertsSection 
          streams={streams} 
          isLoading={isLoading}
        />
      </main>
    </div>
  );
}
