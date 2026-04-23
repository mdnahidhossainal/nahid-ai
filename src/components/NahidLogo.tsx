import React, { useState } from 'react';
import { motion } from 'motion/react';

export const NahidLogo = ({ className }: { className?: string; interactive?: boolean }) => {
  const [imgError, setImgError] = useState(false);

  return (
    <div className={`${className} flex items-center justify-center relative overflow-visible`}>
      {/* Rotating Outer Rings (Wheel/Charaka Style) */}
      <motion.div
        animate={{ rotate: 360 }}
        transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
        className="absolute inset-2 rounded-full border-[1px] border-dashed border-cyan-400/20"
      />
      
      <motion.div
        animate={{ rotate: -360 }}
        transition={{ duration: 50, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 rounded-full border-[0.5px] border-dotted border-orange-500/10"
      />
      
      <div className="relative w-full h-full p-2 flex items-center justify-center">
        {!imgError ? (
          <img 
            src="/logo.png" 
            alt="Nahid AI Logo" 
            className="w-full h-full object-contain relative z-10"
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
          />
        ) : (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            className="flex flex-col items-center justify-center text-blue-400 relative z-10"
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-full border-2 border-blue-500/30 flex items-center justify-center bg-blue-500/5 backdrop-blur-sm">
               <span className="text-[10px] sm:text-xs font-black tracking-widest text-blue-400 shadow-blue-500/50 drop-shadow-md">NAHID</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};
