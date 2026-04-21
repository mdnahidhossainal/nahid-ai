import React from 'react';

export const NahidLogo = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 200" className={className} xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="brainGlow" cx="50%" cy="50%" r="50%" fx="50%" fy="50%">
        <stop offset="0%" stopColor="#60A5FA" stopOpacity="0.5" />
        <stop offset="100%" stopColor="#60A5FA" stopOpacity="0" />
      </radialGradient>
    </defs>
    {/* Background Glow */}
    <circle cx="100" cy="100" r="80" fill="url(#brainGlow)" />
    
    {/* Brain Circuits */}
    <path 
      d="M70,100 C70,70 90,60 100,60 C110,60 130,70 130,100 C130,130 110,140 100,140 C90,140 70,130 70,100" 
      fill="none" 
      stroke="#60A5FA" 
      strokeWidth="4"
      className="animate-pulse"
    />
    <path 
      d="M100,60 L100,140 M70,100 L130,100" 
      stroke="#60A5FA" 
      strokeWidth="2" 
      opacity="0.5"
    />
    
    {/* Central Node */}
    <circle cx="100" cy="100" r="10" fill="#1E293B" stroke="#60A5FA" strokeWidth="2" />
    <text x="100" y="103" textAnchor="middle" fill="#60A5FA" fontSize="8" fontWeight="bold" fontFamily="sans-serif">AI</text>
    
    {/* Connection Lines */}
    <g stroke="#60A5FA" strokeWidth="1" opacity="0.4">
      <line x1="100" y1="60" x2="100" y2="40" />
      <line x1="100" y1="140" x2="100" y2="160" />
      <line x1="70" y1="100" x2="50" y2="100" />
      <line x1="130" y1="100" x2="150" y2="100" />
    </g>
  </svg>
);
