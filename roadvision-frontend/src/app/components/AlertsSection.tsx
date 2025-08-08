// components/AlertsSection.tsx
import { Stream } from '@/app/lib/types';
import { AlertTriangle, BellOff } from 'lucide-react';
import Link from 'next/link';

interface AlertsSectionProps {
  streams: Stream[];
  isLoading: boolean;
}

export default function AlertsSection({ streams, isLoading }: AlertsSectionProps) {
  // Consolidate all alerts from all streams into one array
  const allAlerts = streams.flatMap(stream => 
    stream.alerts.map(alertMsg => ({
      streamId: stream.id,
      streamName: stream.name,
      message: alertMsg
    }))
  ).reverse(); // Show most recent alerts first

  return (
    <section id="alerts" className="py-12 sm:py-16 bg-gray-50 border-t">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-gray-900 mb-8">Consolidated Alerts</h2>
        
        {isLoading && <div className="text-center">Loading alerts...</div>}

        {!isLoading && allAlerts.length > 0 ? (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden">
            <ul className="divide-y divide-gray-200">
              {allAlerts.map((alert, index) => (
                <li key={index} className="p-4 hover:bg-gray-50 transition-colors">
                  <Link href={`/stream/${alert.streamId}`} className="flex items-start space-x-4">
                    <div className="flex-shrink-0 pt-1">
                      <AlertTriangle className="h-6 w-6 text-red-500" />
                    </div>
                    <div className="flex-grow">
                      <p className="text-sm font-semibold text-gray-800">{alert.message}</p>
                      <p className="text-sm text-gray-500">
                        Detected on: <span className="font-medium text-gray-700">{alert.streamName}</span>
                      </p>
                    </div>
                    <div className="text-xs text-gray-400 self-center">
                      View Stream &rarr;
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          !isLoading && (
            <div className="text-center p-16 bg-white rounded-lg border-2 border-dashed">
              <BellOff className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-semibold text-gray-900">No active alerts</h3>
              <p className="mt-1 text-sm text-gray-500">All systems are currently clear.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}

