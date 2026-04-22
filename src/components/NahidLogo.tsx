import React from 'react';
import { motion } from 'motion/react';

export const NahidLogo = ({ className }: { className?: string; interactive?: boolean }) => {
  return (
    <div className={`${className} flex items-center justify-center relative overflow-visible p-8 sm:p-12`}>
      {/* Rotating Outer Rings (Wheel/Charaka Style) */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-4 rounded-full border-[3px] border-dashed border-cyan-400/40"
      />
      
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 35, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border-[2px] border-dotted border-orange-500/30"
      />
      
      <div className="relative w-full h-full p-2 flex items-center justify-center">
        <img 
          src="logo.png" 
          alt="Nahid AI Logo" 
          className="w-full h-full object-contain relative z-10"
          referrerPolicy="no-referrer"
          onError={(e) => {
            // Fallback if image fails
            e.currentTarget.style.display = 'none';
            const parent = e.currentTarget.parentElement;
            if (parent) {
              const fallback = document.createElement('div');
              fallback.className = "flex flex-col items-center justify-center text-cyan-400 opacity-50";
              fallback.innerHTML = `
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z"/><path d="M12 6v6l4 2"/></svg>
                <span class="text-[10px] font-black mt-2">NAHID AI</span>
              `;
              parent.appendChild(fallback);
            }
          }}
        />
      </div>
    </div>
  );
};
