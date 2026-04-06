"use client";

import { Check } from "lucide-react";
import { StepIndicatorProps } from "./types";

export function StepIndicator({ 
  steps, 
  currentStep,
  onStepClick 
}: StepIndicatorProps) {
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {steps.map((step, index) => {
        const isActive = step.key === currentStep;
        const isPast = index < currentIndex;
        const canClick = isPast && onStepClick;
        
        return (
          <div key={step.key} className="flex items-center">
            <button
              onClick={() => canClick && onStepClick(step.key)}
              disabled={!canClick}
              className={`
                flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium
                transition-all duration-300 ease-out
                ${isActive 
                  ? 'bg-primary text-primary-foreground scale-110 shadow-lg' 
                  : isPast 
                    ? 'bg-primary/20 text-primary cursor-pointer hover:bg-primary/30' 
                    : 'bg-muted text-muted-foreground'
                }
              `}
            >
              {isPast ? <Check className="h-4 w-4" /> : index + 1}
            </button>
            {index < steps.length - 1 && (
              <div 
                className={`
                  w-8 md:w-12 h-0.5 mx-1
                  transition-colors duration-300
                  ${isPast ? 'bg-primary/40' : 'bg-muted'}
                `}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
