"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { publicApi, publicGamificationApi } from "@/lib/api";
import { PublicBookingLink, ServiceOption, GamificationStatus } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Image, Sparkles } from "lucide-react";

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('booking');
  const slug = params.linkId as string;

  const [bookingLink, setBookingLink] = useState<PublicBookingLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gamificationEnabled, setGamificationEnabled] = useState(false);

  useEffect(() => {
    const fetchBookingLink = async () => {
      try {
        // Fetch booking link and gamification status in parallel
        const [linkRes, gamRes] = await Promise.all([
          publicApi.getBookingLink(slug),
          publicGamificationApi.getStatus(slug).catch(() => ({ data: { enabled: false } })),
        ]);
        
        setBookingLink(linkRes.data);
        
        // If gamification is enabled, redirect to gamified booking flow
        if (gamRes.data.enabled) {
          setGamificationEnabled(true);
          router.replace(`/book/${slug}/gamified`);
          return;
        }
      } catch (err: any) {
        setError(
          err.response?.data?.message || "This booking link is not available"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchBookingLink();
  }, [slug, router]);

  const handleSelectService = (serviceOption: ServiceOption) => {
    router.push(`/book/${slug}/schedule?service=${serviceOption.id}`);
  };

  if (loading || gamificationEnabled) {
    return (
      <div className="min-h-screen bg-muted/30 p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="aspect-video mb-4" />
                  <Skeleton className="h-6 w-32 mb-2" />
                  <Skeleton className="h-4 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-6 text-center">
            <div className="text-red-500 mb-4">
              <Calendar className="h-12 w-12 mx-auto" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t('linkNotAvailable')}</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            {bookingLink?.user?.businessName || t('title')}
          </h1>
          <p className="text-muted-foreground">
            {t('selectServiceToContinue')}
          </p>
        </div>

        {/* Service Options Grid */}
        {bookingLink?.serviceOptions.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">
                {t('noServicesAvailable')}
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bookingLink?.serviceOptions.map((option) => (
              <Card
                key={option.id}
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleSelectService(option)}
              >
                <CardContent className="p-0">
                  {option.imageUrl ? (
                    <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                      <img
                        src={option.imageUrl}
                        alt={option.title}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                      <Image className="h-12 w-12 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{option.title}</h3>
                    {option.description && (
                      <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                        {option.description}
                      </p>
                    )}
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Clock className="h-4 w-4 mr-1" />
                      {option.duration} {t('minutes')}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
