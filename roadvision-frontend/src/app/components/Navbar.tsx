// components/Navbar.tsx
import { Construction, TrafficCone } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="flex items-center space-x-2">
          <TrafficCone className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-gray-800">RoadVision</span>
        </Link>
        <nav className="flex items-center space-x-6">
          <a href="#dashboard" className="text-gray-600 hover:text-blue-600 transition-colors">Dashboard</a>
          <a href="#alerts" className="text-gray-600 hover:text-blue-600 transition-colors">Alerts</a>
        </nav>
      </div>
    </header>
  );
}

