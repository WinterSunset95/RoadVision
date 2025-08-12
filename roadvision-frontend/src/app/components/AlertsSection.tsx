// components/AlertsSection.tsx
import { Stream } from '@/app/lib/types';
import { AlertTriangle, BellOff } from 'lucide-react';
import Link from 'next/link';

interface AlertsSectionProps {
  streams: Stream[];
  isLoading: boolean;
}

export default function AlertsSection({ streams, isLoading }: AlertsSectionProps) {
  const allAlerts = streams.flatMap(stream => 
    stream.alerts.map(alertMsg => ({
      streamId: stream.id,
      streamName: stream.name,
      message: alertMsg
    }))
  ).reverse();

  return (
    <section id="alerts" className="py-12 sm:py-16 bg-slate-100 border-t border-slate-200">
      <div className="container mx-auto px-4">
        <h2 className="text-3xl font-bold text-slate-900 mb-8">Consolidated Alerts</h2>
        
        {isLoading && <div className="text-center text-slate-500">Loading alerts...</div>}

        {!isLoading && allAlerts.length > 0 ? (
          <div className="bg-white shadow-lg rounded-lg overflow-hidden border border-slate-200">
            <ul className="divide-y divide-slate-200">
              {allAlerts.map((alert, index) => (
                <li key={index}>
                  <Link href={`/stream/${alert.streamId}`} className="block p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start space-x-4">
                      <div className="flex-shrink-0 pt-1">
                        <AlertTriangle className="h-6 w-6 text-red-500" />
                      </div>
                      <div className="flex-grow">
                        <p className="text-sm font-semibold text-slate-800">{alert.message}</p>
                        <p className="text-sm text-slate-500">
                          Detected on: <span className="font-medium text-slate-700">{alert.streamName}</span>
                        </p>
                      </div>
                      <div className="text-xs text-blue-500 self-center font-semibold">
                        View Stream &rarr;
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          !isLoading && (
            <div className="text-center p-16 bg-white rounded-lg border-2 border-dashed border-slate-300">
              <BellOff className="mx-auto h-12 w-12 text-slate-400" />
              <h3 className="mt-2 text-sm font-semibold text-slate-800">No active alerts</h3>
              <p className="mt-1 text-sm text-slate-500">All systems are currently clear.</p>
            </div>
          )
        )}
      </div>
    </section>
  );
}
