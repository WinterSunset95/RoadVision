// components/HeroSection.tsx
export default function HeroSection() {
  return (
    <div className="relative bg-slate-900">
      <div className="absolute inset-0">
        <img 
          src="/dashcam.jpg" 
          alt="Road from a dashcam perspective"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/80 to-transparent"></div>
      </div>
      
      <div className="relative container mx-auto px-4 py-24 sm:py-32 text-center text-white">
        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-slate-50">
          Proactive Road Maintenance with AI
        </h1>
        <p className="mt-6 max-w-2xl mx-auto text-lg sm:text-xl text-slate-300">
          RoadVision uses advanced AI to analyze video feeds, automatically detecting potholes, cracks, and other road defects in real-time.
        </p>
        <div className="mt-10">
          <a 
            href="#dashboard"
            className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-transform transform hover:scale-105 shadow-lg"
          >
            View Live Dashboard
          </a>
        </div>
      </div>
    </div>
  );
}
