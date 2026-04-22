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
      
      <div className="relative w-full h-full p-2">
        <img 
          src="/logo.png" 
          alt="Nahid AI Logo" 
          className="w-full h-full object-contain relative z-10"
          referrerPolicy="no-referrer"
        />
      </div>
    </div>
  );
};
