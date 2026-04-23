import { motion } from 'motion/react';

interface ToggleProps {
  isOn: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

export const Toggle = ({ isOn, onToggle, disabled }: ToggleProps) => {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={`relative w-12 h-6 rounded-full transition-all duration-500 outline-none ${
        isOn 
          ? 'bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)]' 
          : 'bg-white/10'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <motion.div
        initial={false}
        animate={{ 
          x: isOn ? 26 : 2,
          backgroundColor: isOn ? '#ffffff' : '#9ca3af',
          scale: isOn ? 1.1 : 1
        }}
        className="absolute top-1 w-4 h-4 rounded-full shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
      />
    </button>
  );
};
