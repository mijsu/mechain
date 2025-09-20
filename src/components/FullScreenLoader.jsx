import React from 'react';

export default function FullScreenLoader({ isLoading, text = "Processing..." }) {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex flex-col justify-center items-center z-50">
      <div className="relative w-28 h-28">
        {/* Orbit paths */}
        <div className="absolute inset-0 border-2 border-cyan-400/30 rounded-full animate-spin-slow"></div>
        <div className="absolute inset-3 border-t-2 border-t-blue-400 border-r-2 border-r-blue-400/50 rounded-full animate-spin-medium" style={{ animationDirection: 'reverse' }}></div>
        <div className="absolute inset-6 border-b-2 border-b-indigo-400 border-l-2 border-l-indigo-400/50 rounded-full animate-spin-fast"></div>

        {/* Nucleus */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-5 h-5 bg-white rounded-full shadow-[0_0_20px_white]"></div>

        {/* Electrons */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -mt-2 w-3 h-3 rounded-full bg-cyan-300 shadow-[0_0_10px_#22d3ee] animate-orbit-1"></div>
        <div className="absolute top-1/2 left-1 -translate-y-1/2 -ml-1 w-3 h-3 rounded-full bg-blue-300 shadow-[0_0_10px_#60a5fa] animate-orbit-2"></div>
         <div className="absolute bottom-1 right-1/2 translate-x-1/2 mb-1 w-3 h-3 rounded-full bg-indigo-300 shadow-[0_0_10px_#a5b4fc] animate-orbit-3"></div>
      </div>
      <p className="mt-6 text-white text-lg font-semibold tracking-wider">{text}</p>
      <style>{`
        @keyframes spin-slow { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-medium { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spin-fast { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .animate-spin-slow { animation: spin-slow 6s linear infinite; }
        .animate-spin-medium { animation: spin-medium 2.5s linear infinite; }
        .animate-spin-fast { animation: spin-fast 4s linear infinite; }

        @keyframes orbit-1 { from { transform: rotate(0deg) translateX(56px) rotate(0deg); } to { transform: rotate(360deg) translateX(56px) rotate(-360deg); } }
        .animate-orbit-1 { animation: orbit-1 6s linear infinite; }
        
        @keyframes orbit-2 { from { transform: rotate(90deg) translateX(45px) rotate(-90deg); } to { transform: rotate(450deg) translateX(45px) rotate(-450deg); } }
        .animate-orbit-2 { animation: orbit-2 2.5s linear infinite; }
        
        @keyframes orbit-3 { from { transform: rotate(180deg) translateX(35px) rotate(-180deg); } to { transform: rotate(540deg) translateX(35px) rotate(-540deg); } }
        .animate-orbit-3 { animation: orbit-3 4s linear infinite reverse; }
      `}</style>
    </div>
  );
}