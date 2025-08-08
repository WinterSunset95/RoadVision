// components/HeroSection.tsx
import Link from 'next/link';

export default function HeroSection() {
  return (
    <div className="relative bg-gray-900">
      {/* Background Image */}
      <div className="absolute inset-0">
        <img 
          src="https://images.unsplash.com/photo-1599911949034-18358b14a7e2?q=80&w=2070&auto=format&fit=crop" 
          alt="Road from a dashcam perspective"
          className="w-full h-full object-cover opacity-30"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-transparent"></div>
      </div>
      
      {/* Content */}
      <div className="relative container mx-auto px-4 py-24 sm:py-32 text-center text-white">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight">
          Proactive Road Maintenance with AI
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-gray-300">
          RoadVision uses advanced AI to analyze video feeds, automatically detecting potholes, cracks, and other road defects in real-time.
        </p>
        <div className="mt-10">
          <a 
            href="#dashboard"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105"
          >
            View Live Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}

