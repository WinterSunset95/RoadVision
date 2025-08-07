// components/StreamCard.tsx
import React from 'react';
import Link from 'next/link';
import { Stream } from '@/app/lib/types'
import { Video, AlertTriangle, CheckCircle } from 'lucide-react';

interface StreamCardProps {
  stream: Stream;
}

export default function StreamCard({ stream }: StreamCardProps) {
  const hasAlerts = stream.alerts.length > 0;

  return (
    <Link href={`/stream/${stream.id}`}>
      <div className="group block bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow duration-300 border border-gray-200 overflow-hidden">
        <div className={`p-4 border-l-4 ${hasAlerts ? 'border-red-500' : 'border-green-500'}`}>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-bold text-gray-800 truncate group-hover:text-blue-600">
              {stream.name}
            </h2>
            <span className={`flex items-center text-xs font-semibold px-2 py-1 rounded-full ${
                stream.status === 'Running' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>
              {stream.status === 'Running' ? 
                <CheckCircle className="w-4 h-4 mr-1" /> : 
                <AlertTriangle className="w-4 h-4 mr-1" />
              }
              {stream.status}
            </span>
          </div>
          <p className="text-sm text-gray-500 truncate">{stream.source}</p>
        </div>
        
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-sm text-gray-600">Detections</p>
            <p className="text-2xl font-semibold text-gray-900">{stream.detections}</p>
          </div>
          <div className="text-center">
            <p className="text-sm text-gray-600">Alerts</p>
            <p className={`text-2xl font-semibold ${hasAlerts ? 'text-red-600' : 'text-gray-900'}`}>
              {stream.alerts.length}
            </p>
          </div>
        </div>
      </div>
    </Link>
  );
}

