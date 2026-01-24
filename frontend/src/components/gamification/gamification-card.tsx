"use client";

import { useState } from "react";
import { ClientGamificationSummary, ClientLevel } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";
import { publicGamificationApi } from "@/lib/api";
import {
  Trophy,
  Flame,
  Share2,
  Star,
  Gift,
  Copy,
  Check,
  Sparkles,
} from "lucide-react";

interface GamificationCardProps {
  gamification: ClientGamificationSummary;
  slug: string;
  clientId: string;
  onReferralApplied?: (bonusPoints: number) => void;
}

const levelColors: Record<ClientLevel, string> = {
  bronze: "from-amber-600 to-amber-800",
  silver: "from-gray-400 to-gray-600",
  gold: "from-yellow-400 to-yellow-600",
  platinum: "from-purple-400 to-purple-600",
};

const levelIcons: Record<ClientLevel, string> = {
  bronze: "🥉",
  silver: "🥈",
  gold: "🥇",
  platinum: "💎",
};

export function GamificationCard({
  gamification,
  slug,
  clientId,
  onReferralApplied,
}: GamificationCardProps) {
  const { toast } = useToast();
  const [referralInput, setReferralInput] = useState("");
  const [validating, setValidating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showReferralInput, setShowReferralInput] = useState(false);

  const copyReferralCode = async () => {
    await navigator.clipboard.writeText(gamification.referralCode);
    setCopied(true);
    toast({
      title: "Copied!",
      description: "Referral code copied to clipboard",
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const validateReferral = async () => {
    if (!referralInput.trim()) return;
    
    setValidating(true);
    try {
      const res = await publicGamificationApi.validateReferral(slug, referralInput);
      
      if (res.data.valid) {
        toast({
          title: "🎉 Valid Code!",
          description: `${res.data.referrerName} referred you! You'll get ${res.data.bonusPoints} bonus points.`,
        });
        onReferralApplied?.(res.data.bonusPoints);
        setShowReferralInput(false);
      } else {
        toast({
          title: "Invalid Code",
          description: res.data.message || "The referral code is not valid",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to validate referral code",
        variant: "destructive",
      });
    } finally {
      setValidating(false);
    }
  };

  return (
    <Card className="overflow-hidden">
      {/* Level Banner */}
      <div className={`bg-gradient-to-r ${levelColors[gamification.level]} p-4 text-white`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-4xl">{levelIcons[gamification.level]}</span>
            <div>
              <h3 className="font-bold text-lg capitalize">{gamification.level} Member</h3>
              <p className="text-sm opacity-90">
                {gamification.discountPercentage > 0 && (
                  <span>{gamification.discountPercentage}% discount on all services</span>
                )}
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold">{gamification.availablePoints}</p>
            <p className="text-sm opacity-90">points</p>
          </div>
        </div>
      </div>

      <CardContent className="pt-4 space-y-4">
        {/* Progress to next level */}
        {gamification.nextLevel && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress to {gamification.nextLevel}</span>
              <span className="font-medium">{gamification.pointsToNextLevel} pts to go</span>
            </div>
            <Progress value={gamification.levelProgress} className="h-2" />
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-muted/50 rounded-lg p-3 text-center hover:scale-105 transition-transform">
            <Flame className="h-5 w-5 mx-auto mb-1 text-orange-500" />
            <p className="text-lg font-bold">{gamification.currentStreak}</p>
            <p className="text-xs text-muted-foreground">Streak</p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-3 text-center hover:scale-105 transition-transform">
            <Trophy className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
            <p className="text-lg font-bold">{gamification.longestStreak}</p>
            <p className="text-xs text-muted-foreground">Best Streak</p>
          </div>
          
          <div className="bg-muted/50 rounded-lg p-3 text-center hover:scale-105 transition-transform">
            <Share2 className="h-5 w-5 mx-auto mb-1 text-blue-500" />
            <p className="text-lg font-bold">{gamification.successfulReferrals}</p>
            <p className="text-xs text-muted-foreground">Referrals</p>
          </div>
        </div>

        {/* Referral Section */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center gap-2">
            <Gift className="h-4 w-4 text-primary" />
            <span className="font-medium text-sm">Share & Earn</span>
          </div>
          
          {/* My Referral Code */}
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-muted rounded-lg px-3 py-2 font-mono text-sm">
              {gamification.referralCode}
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={copyReferralCode}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Share this code with friends and both of you earn bonus points!
          </p>

          {/* Enter Referral Code */}
          {!showReferralInput ? (
            <Button
              variant="ghost"
              size="sm"
              className="w-full"
              onClick={() => setShowReferralInput(true)}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Have a referral code?
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter referral code"
                  value={referralInput}
                  onChange={(e) => setReferralInput(e.target.value.toUpperCase())}
                  className="font-mono"
                />
                <Button
                  onClick={validateReferral}
                  disabled={validating || !referralInput.trim()}
                >
                  {validating ? "..." : "Apply"}
                </Button>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={() => setShowReferralInput(false)}
              >
                Cancel
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// Simplified version for the booking flow
export function MiniGamificationCard({ gamification }: { gamification: ClientGamificationSummary }) {
  return (
    <div className={`bg-gradient-to-r ${levelColors[gamification.level]} rounded-lg p-3 text-white`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{levelIcons[gamification.level]}</span>
          <div>
            <p className="font-medium capitalize">{gamification.level}</p>
            <p className="text-xs opacity-90">{gamification.availablePoints} pts</p>
          </div>
        </div>
        {gamification.discountPercentage > 0 && (
          <Badge variant="secondary" className="bg-white/20 text-white border-0">
            {gamification.discountPercentage}% OFF
          </Badge>
        )}
      </div>
      {gamification.currentStreak > 0 && (
        <div className="mt-2 flex items-center gap-1 text-xs opacity-90">
          <Flame className="h-3 w-3" />
          {gamification.currentStreak} appointment streak!
        </div>
      )}
    </div>
  );
}
