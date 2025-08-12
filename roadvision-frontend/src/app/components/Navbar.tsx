// components/Navbar.tsx
import { TrafficCone } from 'lucide-react';
import Link from 'next/link';

export default function Navbar() {
  return (
    <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-slate-200">
      <div className="container mx-auto flex items-center justify-between p-4">
        <Link href="/" className="flex items-center space-x-2">
          <TrafficCone className="h-8 w-8 text-blue-600" />
          <span className="text-2xl font-bold text-slate-800">RoadVision</span>
        </Link>
        <nav className="hidden md:flex items-center space-x-6">
          <a href="/#dashboard" className="text-slate-600 hover:text-blue-600 transition-colors">Dashboard</a>
          <a href="/#alerts" className="text-slate-600 hover:text-blue-600 transition-colors">Alerts</a>
        </nav>
      </div>
    </header>
  );
}
