import React from 'react';
import { Brain, Zap, Activity } from 'lucide-react';

export default function AIProcessingLoader({ isLoading, text = "Analyzing with AI..." }) {
  if (!isLoading) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 backdrop-blur-sm flex flex-col justify-center items-center z-50">
      <div className="relative w-32 h-32">
        {/* Outer rotating ring */}
        <div className="absolute inset-0 border-2 border-transparent border-t-cyan-400 border-r-cyan-400 rounded-full animate-spin"></div>
        
        {/* Middle pulsing ring */}
        <div className="absolute inset-4 border-2 border-transparent border-l-blue-400 border-b-blue-400 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '2s' }}></div>
        
        {/* Inner fast ring */}
        <div className="absolute inset-8 border-2 border-transparent border-t-indigo-400 border-r-indigo-400 rounded-full animate-spin" style={{ animationDuration: '1s' }}></div>
        
        {/* Central brain icon with pulse */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <div className="relative">
            <Brain className="w-10 h-10 text-white animate-pulse" />
            {/* Glowing effect */}
            <div className="absolute inset-0 w-10 h-10">
              <Brain className="w-10 h-10 text-cyan-400 opacity-50 animate-ping" />
            </div>
          </div>
        </div>

        {/* Floating neural nodes */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
        </div>
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.5s' }}></div>
        </div>
        <div className="absolute left-2 top-1/2 -translate-y-1/2">
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '1s' }}></div>
        </div>
        <div className="absolute right-2 top-1/2 -translate-y-1/2">
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '1.5s' }}></div>
        </div>

        {/* Data streams */}
        <div className="absolute top-0 left-1/4 w-px h-8 bg-gradient-to-b from-cyan-400 to-transparent animate-pulse"></div>
        <div className="absolute top-0 right-1/4 w-px h-8 bg-gradient-to-b from-blue-400 to-transparent animate-pulse" style={{ animationDelay: '0.3s' }}></div>
        <div className="absolute bottom-0 left-1/3 w-px h-6 bg-gradient-to-t from-indigo-400 to-transparent animate-pulse" style={{ animationDelay: '0.6s' }}></div>
        <div className="absolute bottom-0 right-1/3 w-px h-6 bg-gradient-to-t from-purple-400 to-transparent animate-pulse" style={{ animationDelay: '0.9s' }}></div>
      </div>

      {/* Processing text with typewriter effect */}
      <div className="mt-8 text-center">
        <h3 className="text-2xl font-bold text-white mb-2 flex items-center gap-3 justify-center">
          <Zap className="w-6 h-6 text-cyan-400 animate-pulse" />
          {text}
          <Activity className="w-6 h-6 text-blue-400 animate-pulse" />
        </h3>
        
        {/* Animated dots */}
        <div className="flex justify-center space-x-1 mt-4">
          <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce"></div>
          <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
          <div className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
          <div className="w-2 h-2 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0.3s' }}></div>
        </div>

        {/* Processing status */}
        <p className="text-cyan-200 text-sm mt-4 opacity-75">
          Neural networks processing document...
        </p>
      </div>

      {/* Additional ambient effects */}
      <div className="absolute top-20 left-20 w-1 h-1 bg-cyan-400 rounded-full animate-ping opacity-60"></div>
      <div className="absolute top-32 right-24 w-1 h-1 bg-blue-400 rounded-full animate-ping opacity-60" style={{ animationDelay: '1s' }}></div>
      <div className="absolute bottom-24 left-32 w-1 h-1 bg-indigo-400 rounded-full animate-ping opacity-60" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-20 right-20 w-1 h-1 bg-purple-400 rounded-full animate-ping opacity-60" style={{ animationDelay: '3s' }}></div>

      <style jsx>{`
        @keyframes data-flow {
          0%, 100% { opacity: 0; transform: translateY(0); }
          50% { opacity: 1; transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}