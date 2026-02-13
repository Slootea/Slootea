"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { publicApi } from "@/lib/api";
import { PublicBookingLink, ServiceOption } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Image, ArrowLeft, Sparkles } from "lucide-react";
import { AiServiceAssistant } from "@/components/booking";

type ViewMode = 'ai-assistant' | 'services';

export default function BookingPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations('booking');
  const slug = params.linkId as string;

  const [bookingLink, setBookingLink] = useState<PublicBookingLink | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('ai-assistant');

  useEffect(() => {
    const fetchBookingLink = async () => {
      try {
        const linkRes = await publicApi.getBookingLink(slug);
        setBookingLink(linkRes.data);
        
        // Check if AI assistant is enabled, if not show services directly
        if (!linkRes.data.settings?.aiAssistantEnabled) {
          setViewMode('services');
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

  const handleShowAllServices = () => {
    setViewMode('services');
  };

  const handleBackToAssistant = () => {
    setViewMode('ai-assistant');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-muted/30 p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 md:p-6">
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
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4 md:p-6">
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

  const aiAssistantEnabled = bookingLink?.settings?.aiAssistantEnabled;
  const organizationId = bookingLink?.organizationId;

  return (
    <div className="min-h-screen bg-muted/30">
      <div className="max-w-4xl mx-auto p-4 md:p-6">
        {/* Header */}
        <div className="text-center mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">
            {bookingLink?.user?.businessName || t('title')}
          </h1>
          {viewMode === 'services' && (
            <p className="text-muted-foreground">
              {t('selectServiceToContinue')}
            </p>
          )}
        </div>

        {/* AI Assistant View */}
        {viewMode === 'ai-assistant' && aiAssistantEnabled && organizationId && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-4 md:p-6">
              <AiServiceAssistant
                organizationId={organizationId}
                services={bookingLink?.serviceOptions || []}
                onSelectService={handleSelectService}
                onShowAllServices={handleShowAllServices}
                businessName={bookingLink?.user?.businessName}
              />
            </CardContent>
          </Card>
        )}

        {/* Services List View */}
        {viewMode === 'services' && (
          <>
            {/* Back to AI Assistant button */}
            {aiAssistantEnabled && (
              <div className="mb-4 md:mb-6">
                <Button
                  variant="ghost"
                  onClick={handleBackToAssistant}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('aiAssistant.backToAssistant') || 'Back to Assistant'}
                </Button>
              </div>
            )}

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
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
                {bookingLink?.serviceOptions.map((option) => (
                  <Card
                    key={option.id}
                    className="cursor-pointer hover:shadow-lg transition-shadow"
                    onClick={() => handleSelectService(option)}
                  >
                    <CardContent className="p-0">
                      {option.imageBase64 ? (
                        <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                          <img
                            src={option.imageBase64}
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

            {/* Use AI Assistant button at bottom */}
            {aiAssistantEnabled && (
              <div className="mt-6 md:mt-8 text-center">
                <Button
                  variant="outline"
                  onClick={handleBackToAssistant}
                  className="gap-2"
                >
                  <Sparkles className="h-4 w-4" />
                  {t('aiAssistant.needHelp') || 'Need help choosing? Ask our AI Assistant'}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
