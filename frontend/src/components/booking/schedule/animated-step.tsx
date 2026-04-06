"use client";

import { AnimatedStepProps } from "./types";

export function AnimatedStep({ 
  children, 
  isActive, 
  direction = 'forward' 
}: AnimatedStepProps) {
  if (!isActive) return null;
  
  return (
    <div 
      className={`
        w-full max-w-lg mx-auto
        animate-in fade-in-0 duration-500 ease-out
        ${direction === 'forward' ? 'slide-in-from-right-8' : 'slide-in-from-left-8'}
      `}
    >
      {children}
    </div>
  );
}
