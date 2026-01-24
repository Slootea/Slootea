"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { publicGamificationApi } from "@/lib/api";
import { GamificationStatus, ReferralValidation } from "@/lib/types";
import {
  Gift,
  Sparkles,
  Star,
  Trophy,
  ArrowRight,
  Check,
} from "lucide-react";

interface ReferralInputProps {
  slug: string;
  gamificationStatus: GamificationStatus;
  clientPhone?: string;
  onReferralValidated: (validation: ReferralValidation) => void;
  onSkip: () => void;
}

export function ReferralInput({
  slug,
  gamificationStatus,
  clientPhone,
  onReferralValidated,
  onSkip,
}: ReferralInputProps) {
  const { toast } = useToast();
  const [referralCode, setReferralCode] = useState("");
  const [validating, setValidating] = useState(false);
  const [validated, setValidated] = useState(false);
  const [validationResult, setValidationResult] = useState<ReferralValidation | null>(null);

  const handleValidate = async () => {
    if (!referralCode.trim()) {
      onSkip();
      return;
    }

    setValidating(true);
    try {
      const res = await publicGamificationApi.validateReferral(slug, referralCode, clientPhone);
      const result = res.data as ReferralValidation;
      
      setValidationResult(result);
      
      if (result.valid) {
        setValidated(true);
        toast({
          title: "🎉 Referral Applied!",
          description: `You'll receive ${result.bonusPoints} bonus points!`,
        });
      } else {
        toast({
          title: "Invalid Code",
          description: result.message || "The referral code is not valid",
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

  const handleContinue = () => {
    onReferralValidated(validationResult || { valid: false });
  };

  if (!gamificationStatus.referralsEnabled) {
    onSkip();
    return null;
  }

  return (
    <div className="space-y-6 animate-in fade-in-0 slide-in-from-bottom-4 duration-300">
      <div className="text-center">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-primary/10 mb-4">
          <Gift className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Got a Referral Code?</h2>
        <p className="text-muted-foreground">
          Enter a friend's referral code to earn bonus points on your first booking!
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div>
            {validated ? (
              <div className="text-center space-y-4 animate-in fade-in-0 zoom-in-95 duration-300">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30">
                  <Check className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="font-medium text-lg">Referral Applied!</p>
                  <p className="text-muted-foreground">
                    {validationResult?.referrerName} referred you. You'll get{" "}
                    <span className="font-bold text-primary">
                      +{validationResult?.bonusPoints} points
                    </span>{" "}
                    after booking!
                  </p>
                </div>
                <Button onClick={handleContinue} className="w-full">
                  Continue to Booking
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            ) : (
              <div className="space-y-4 animate-in fade-in-0 duration-300">
                <div className="space-y-2">
                  <Label htmlFor="referral">Referral Code</Label>
                  <Input
                    id="referral"
                    value={referralCode}
                    onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
                    placeholder="e.g., ABC123XY"
                    className="font-mono text-center text-lg tracking-wider"
                    maxLength={10}
                  />
                </div>

                {/* Benefits preview */}
                <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                  <p className="font-medium text-sm flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    What you'll get:
                  </p>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <Star className="h-3 w-3 text-yellow-500" />
                      +{gamificationStatus.levels.bronze.threshold === 0 ? gamificationStatus.pointsPerBooking : '??'} welcome points
                    </li>
                    <li className="flex items-center gap-2">
                      <Trophy className="h-3 w-3 text-yellow-500" />
                      Start earning towards {gamificationStatus.levels.silver.discount}% discounts
                    </li>
                  </ul>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={onSkip}
                    className="flex-1"
                    disabled={validating}
                  >
                    Skip
                  </Button>
                  <Button
                    onClick={handleValidate}
                    className="flex-1"
                    disabled={validating}
                  >
                    {validating ? "Validating..." : referralCode ? "Apply Code" : "Continue"}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
