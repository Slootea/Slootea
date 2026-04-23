"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { publicApi } from "@/lib/api";
import { trackBookingLinkView, trackServiceSelected } from "@/lib/analytics";
import { PublicBookingLink, ServiceOption } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar, Clock, Image, ArrowLeft, Sparkles } from "lucide-react";
import dynamic from "next/dynamic";

// AI assistant pulls in OpenAI/LangChain client code; only load when enabled.
const AiServiceAssistant = dynamic(
  () => import("@/components/booking").then((m) => m.AiServiceAssistant),
  { ssr: false, loading: () => <Skeleton className="h-64 w-full" /> },
);

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
  const hasTrackedView = useRef(false);

  useEffect(() => {
    const fetchBookingLink = async () => {
      try {
        const linkRes = await publicApi.getBookingLink(slug);
        setBookingLink(linkRes.data);
        
        // Track booking link view (only once)
        if (!hasTrackedView.current) {
          hasTrackedView.current = true;
          trackBookingLinkView({
            bookingLinkSlug: slug,
            organizationId: linkRes.data.organizationId,
            organizationName: linkRes.data.user?.businessName,
            businessName: linkRes.data.user?.businessName,
          });
        }
        
        // Check if AI assistant is enabled, if not show services directly
        if (!linkRes.data.settings?.aiAssistantEnabled) {
          setViewMode('services');
        }
      } catch (err: unknown) {
        const error = err as { response?: { data?: { message?: string } } };
        setError(
          error.response?.data?.message || "This booking link is not available"
        );
      } finally {
        setLoading(false);
      }
    };
    fetchBookingLink();
  }, [slug, router]);

  const handleSelectService = (serviceOption: ServiceOption) => {
    // Track service selection
    trackServiceSelected({
      serviceId: serviceOption.id,
      serviceName: serviceOption.title,
      organizationId: bookingLink?.organizationId,
      organizationName: bookingLink?.user?.businessName,
      bookingLinkSlug: slug,
    });
    
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
      <div className="min-h-screen bg-background p-4 md:p-6">
        <div className="max-w-4xl mx-auto">
          <Skeleton className="h-12 w-64 mb-6" />
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardContent className="p-4 md:p-6">
                  <Skeleton className="aspect-video mb-4 rounded-xl" />
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
      <div className="min-h-screen bg-background flex items-center justify-center p-4 md:p-6">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-destructive-container mb-4">
              <Calendar className="h-8 w-8 text-destructive" />
            </div>
            <h2 className="text-xl font-display font-semibold mb-2">{t('linkNotAvailable')}</h2>
            <p className="text-muted-foreground">{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const aiAssistantEnabled = bookingLink?.settings?.aiAssistantEnabled;
  const organizationId = bookingLink?.organizationId;

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-4xl mx-auto p-4 md:p-8">
        {/* Header */}
        <div className="text-center mb-8 md:mb-10">
          <h1 className="text-3xl md:text-4xl font-display font-bold tracking-tight mb-3">
            {bookingLink?.user?.businessName || t('title')}
          </h1>
          {viewMode === 'services' && (
            <p className="text-muted-foreground text-lg">
              {t('selectServiceToContinue')}
            </p>
          )}
        </div>

        {/* AI Assistant View */}
        {viewMode === 'ai-assistant' && aiAssistantEnabled && organizationId && (
          <Card className="max-w-2xl mx-auto">
            <CardContent className="p-5 md:p-8">
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
              <div className="mb-6 md:mb-8">
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
                <CardContent className="py-16 text-center">
                  <p className="text-muted-foreground text-lg">
                    {t('noServicesAvailable')}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-6">
                {bookingLink?.serviceOptions.map((option) => (
                  <Card
                    key={option.id}
                    className="cursor-pointer group hover:shadow-ambient transition-all duration-300 overflow-hidden"
                    onClick={() => handleSelectService(option)}
                  >
                    <CardContent className="p-0">
                      {option.imageBase64 ? (
                        <div className="aspect-video bg-surface-container-low rounded-t-xl overflow-hidden">
                          <img
                            src={option.imageBase64}
                            alt={option.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video bg-surface-container-low rounded-t-xl flex items-center justify-center">
                          <Image className="h-12 w-12 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="p-5">
                        <h3 className="font-display font-semibold text-lg mb-1.5">{option.title}</h3>
                        {option.description && (
                          <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                            {option.description}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <div className="flex items-center text-sm text-muted-foreground bg-surface-container-low px-3 py-1.5 rounded-lg">
                            <Clock className="h-4 w-4 mr-1.5" />
                            {option.duration} {t('minutes')}
                          </div>
                          {option.showPrice && (
                            <span className="font-semibold text-primary">
                              {option.price > 0 
                                ? `${option.price} ${bookingLink?.settings?.currency || 'TL'}` 
                                : t('free')}
                            </span>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Use AI Assistant button at bottom */}
            {aiAssistantEnabled && (
              <div className="mt-8 md:mt-10 text-center">
                <Button
                  variant="outline"
                  onClick={handleBackToAssistant}
                  className="gap-2"
                  size="lg"
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
