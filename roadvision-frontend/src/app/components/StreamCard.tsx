// components/StreamCard.tsx
'use client'
import Link from 'next/link';
import { Stream } from '@/app/lib/types';
import { AlertTriangle, CheckCircle, PauseCircle } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StreamCardProps {
  stream: Stream;
  button?: "yes";
  onClick?: () => void;
}

export default function StreamCard({ stream, button, onClick }: StreamCardProps) {
  const hasAlerts = stream.alerts.length > 0;
  const isStreaming = stream.status === 'Streaming';
  const router = useRouter();

  const statusConfig = {
    Streaming: {
      icon: <CheckCircle className="w-4 h-4 mr-1.5 text-emerald-500" />,
      style: 'bg-emerald-100 text-emerald-800 border-emerald-500',
    },
    Idle: {
      icon: <PauseCircle className="w-4 h-4 mr-1.5 text-amber-500" />,
      style: 'bg-amber-100 text-amber-800 border-amber-500',
    },
  };
  
  const currentStatus = statusConfig[stream.status as keyof typeof statusConfig] || statusConfig.Idle;

  const cardContent = (
    <>
      <div className={`p-4 border-l-4 ${hasAlerts ? 'border-red-500' : currentStatus.style}`}>
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-bold text-slate-800 truncate group-hover:text-blue-600">
            {stream.name.length > 20 ? `${stream.name.slice(0, 20)}...` : stream.name}
          </h2>
          <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${currentStatus.style}`}>
            {currentStatus.icon}
            {stream.status}
          </span>
        </div>
        <p className="text-sm text-slate-500 truncate font-mono">{stream.source}</p>
      </div>
      
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 grid grid-cols-2 gap-4">
        <div className="text-center">
          <p className="text-sm text-slate-600">Defects Found</p>
          <p className="text-2xl font-semibold text-slate-900">{stream.detections}</p>
        </div>
        <div className="text-center">
          <p className="text-sm text-slate-600">Alerts</p>
          <p className={`text-2xl font-semibold ${hasAlerts ? 'text-red-600' : 'text-slate-900'}`}>
            {stream.alerts.length}
          </p>
        </div>
      </div>
    </>
  )

  if (onClick) {
    return (
      <div onClick={onClick} className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-slate-200 overflow-hidden">
        {cardContent}
      </div>
    );
  }

  return (
    <Link href={`/stream/${stream.id}`} >
      <div className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-slate-200 overflow-hidden">
        {cardContent}
      </div>
    </Link>
  );
}
