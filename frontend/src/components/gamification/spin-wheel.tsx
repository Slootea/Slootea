"use client";

import { useState, useEffect } from "react";
import { SpinWheelPrize, SpinWheelResult } from "@/lib/types";
import { publicGamificationApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

// Simple confetti function - can be replaced with canvas-confetti when installed
const triggerConfetti = () => {
  // Create simple confetti elements
  const colors = ['#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff'];
  for (let i = 0; i < 50; i++) {
    const confetti = document.createElement('div');
    confetti.style.cssText = `
      position: fixed;
      width: 10px;
      height: 10px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      top: ${Math.random() * 50}%;
      left: ${Math.random() * 100}%;
      animation: confetti-fall 3s ease-out forwards;
      z-index: 9999;
      border-radius: ${Math.random() > 0.5 ? '50%' : '0'};
    `;
    document.body.appendChild(confetti);
    setTimeout(() => confetti.remove(), 3000);
  }
};

// Add confetti animation styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = `
    @keyframes confetti-fall {
      0% { transform: translateY(0) rotate(0deg); opacity: 1; }
      100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
    }
  `;
  if (!document.querySelector('#confetti-styles')) {
    style.id = 'confetti-styles';
    document.head.appendChild(style);
  }
}

interface SpinWheelProps {
  slug: string;
  clientId: string;
  onComplete: (result: SpinWheelResult) => void;
  onSkip: () => void;
}

export function SpinWheel({ slug, clientId, onComplete, onSkip }: SpinWheelProps) {
  const [prizes, setPrizes] = useState<SpinWheelPrize[]>([]);
  const [spinning, setSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [result, setResult] = useState<SpinWheelResult | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const res = await publicGamificationApi.getSpinWheelConfig(slug);
        if (res.data.enabled && res.data.prizes) {
          setPrizes(res.data.prizes);
        }
      } catch (error) {
        console.error("Failed to load spin wheel config", error);
      } finally {
        setLoading(false);
      }
    };
    fetchConfig();
  }, [slug]);

  const handleSpin = async () => {
    if (spinning) return;
    
    setSpinning(true);
    setResult(null);

    try {
      const res = await publicGamificationApi.spinWheel(slug, clientId);
      const spinResult = res.data as SpinWheelResult;
      
      // Find prize index
      const prizeIndex = prizes.findIndex(p => p.id === spinResult.prize.id);
      const segmentAngle = 360 / prizes.length;
      const targetRotation = 360 * 5 + (360 - (prizeIndex * segmentAngle + segmentAngle / 2));
      
      setRotation(prev => prev + targetRotation);
      
      // Wait for animation to complete
      setTimeout(() => {
        setResult(spinResult);
        setSpinning(false);
        
        // Trigger confetti for good prizes
        if (spinResult.prize.type !== 'nothing') {
          triggerConfetti();
        }
      }, 4000);
    } catch (error) {
      console.error("Spin failed", error);
      setSpinning(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (prizes.length === 0) {
    return null;
  }

  const segmentAngle = 360 / prizes.length;

  return (
    <div className="flex flex-col items-center space-y-6">
      <h2 className="text-2xl font-bold text-center">🎡 Spin to Win!</h2>
      <p className="text-muted-foreground text-center">
        Spin the wheel for a chance to win bonus points or discounts!
      </p>

      <div className="relative w-80 h-80">
        {/* Pointer */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-10">
          <div className="w-0 h-0 border-l-[15px] border-r-[15px] border-t-[25px] border-l-transparent border-r-transparent border-t-primary drop-shadow-lg" />
        </div>

        {/* Wheel */}
        <div
          className="w-full h-full rounded-full overflow-hidden shadow-xl"
          style={{
            transform: `rotate(${rotation}deg)`,
            transition: spinning ? 'transform 4s cubic-bezier(0.2, 0.8, 0.3, 1)' : 'none',
          }}
        >
          <svg viewBox="0 0 100 100" className="w-full h-full">
            {prizes.map((prize, index) => {
              const startAngle = index * segmentAngle;
              const endAngle = (index + 1) * segmentAngle;
              
              const startRad = (startAngle - 90) * Math.PI / 180;
              const endRad = (endAngle - 90) * Math.PI / 180;
              
              const x1 = 50 + 50 * Math.cos(startRad);
              const y1 = 50 + 50 * Math.sin(startRad);
              const x2 = 50 + 50 * Math.cos(endRad);
              const y2 = 50 + 50 * Math.sin(endRad);
              
              const largeArc = segmentAngle > 180 ? 1 : 0;
              
              const path = `M 50 50 L ${x1} ${y1} A 50 50 0 ${largeArc} 1 ${x2} ${y2} Z`;
              
              // Text position
              const midAngle = (startAngle + endAngle) / 2;
              const midRad = (midAngle - 90) * Math.PI / 180;
              const textX = 50 + 32 * Math.cos(midRad);
              const textY = 50 + 32 * Math.sin(midRad);
              
              return (
                <g key={prize.id}>
                  <path d={path} fill={prize.color} stroke="#fff" strokeWidth="0.5" />
                  <text
                    x={textX}
                    y={textY}
                    fill="#fff"
                    fontSize="4"
                    fontWeight="bold"
                    textAnchor="middle"
                    dominantBaseline="middle"
                    transform={`rotate(${midAngle}, ${textX}, ${textY})`}
                    className="select-none"
                  >
                    {prize.name}
                  </text>
                </g>
              );
            })}
            {/* Center circle */}
            <circle cx="50" cy="50" r="8" fill="#1f2937" />
            <circle cx="50" cy="50" r="6" fill="#374151" />
          </svg>
        </div>
      </div>

      <div>
        {result ? (
          <div className="text-center space-y-4 animate-in fade-in-0 zoom-in-95 duration-300">
            <Card className="bg-gradient-to-r from-primary/20 to-primary/10 border-primary/30">
              <CardContent className="pt-6">
                <h3 className="text-xl font-bold mb-2">
                  {result.prize.type === 'nothing' ? '😅 Better luck next time!' : '🎉 Congratulations!'}
                </h3>
                <p className="text-lg">
                  {result.prize.type === 'nothing' ? (
                    "You didn't win this time, but don't worry!"
                  ) : result.prize.type === 'points' ? (
                    <>You won <span className="font-bold text-primary">{result.pointsEarned} points</span>!</>
                  ) : result.prize.type === 'discount' ? (
                    <>You won <span className="font-bold text-primary">{result.prize.value}% off</span> your next visit!</>
                  ) : (
                    <>You won a <span className="font-bold text-primary">free {result.prize.name}</span>!</>
                  )}
                </p>
                {result.prize.type !== 'nothing' && (
                  <p className="text-sm text-muted-foreground mt-2">
                    Your new balance: {result.newBalance} points
                  </p>
                )}
              </CardContent>
            </Card>
            <Button onClick={() => onComplete(result)} className="w-full">
              Continue
            </Button>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 animate-in fade-in-0 duration-300">
            <Button
              size="lg"
              onClick={handleSpin}
              disabled={spinning}
              className="px-8 py-6 text-lg font-bold"
            >
              {spinning ? "Spinning..." : "🎯 SPIN!"}
            </Button>
            <Button variant="ghost" onClick={onSkip} disabled={spinning}>
              Skip for now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
