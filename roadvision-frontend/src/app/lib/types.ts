
export interface Stream {
  id: string;
  name: string;
  source: string;
  status: 'Running' | 'Error' | 'Stopped';
  detections: number;
  alerts: string[];
  last_update: string;
  hls_url: string;
}
