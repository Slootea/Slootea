"use client";

import { useTranslations } from "next-intl";
import { trackProviderSelected } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users, User, Check, ChevronRight } from "lucide-react";
import { ProviderSelectionStepProps } from "./types";

export function ProviderSelectionStep({
  providers,
  selectedProvider,
  providersLoading,
  onSelectProvider,
  onContinue,
  bookingLink,
}: ProviderSelectionStepProps) {
  const t = useTranslations('booking');

  const handleSelectProvider = (provider: typeof providers[0]) => {
    onSelectProvider(provider);
    // Get display name - use name for external providers, firstName/lastName for members
    const displayName = provider.name 
      || (provider.firstName || provider.lastName 
          ? `${provider.firstName || ''} ${provider.lastName || ''}`.trim()
          : undefined);
    trackProviderSelected({
      providerId: provider.id,
      providerName: displayName,
      organizationId: bookingLink?.organizationId,
      organizationName: bookingLink?.user?.businessName,
    });
  };

  // Helper to get provider display name
  const getProviderDisplayName = (provider: typeof providers[0]) => {
    if (provider.name) return provider.name;
    if (provider.firstName || provider.lastName) {
      return `${provider.firstName || ''} ${provider.lastName || ''}`.trim();
    }
    return t('provider') || 'Provider';
  };

  // Helper to get provider initials
  const getProviderInitials = (provider: typeof providers[0]) => {
    if (provider.name) {
      const parts = provider.name.split(' ');
      return parts.length > 1 
        ? `${parts[0][0]}${parts[parts.length - 1][0]}`
        : provider.name[0];
    }
    return `${provider.firstName?.[0] || ''}${provider.lastName?.[0] || ''}`;
  };

  return (
    <Card>
      <CardHeader className="text-center pb-2">
        <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-3">
          <Users className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl">
          {t('selectProvider') || 'Choose Your Provider'}
        </CardTitle>
        <p className="text-sm text-muted-foreground mt-1">
          {t('selectProviderDescription') || 'Select who you would like to see'}
        </p>
      </CardHeader>
      <CardContent className="pt-4">
        {providersLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-24" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {providers.map((provider, index) => (
              <button
                key={provider.id}
                onClick={() => handleSelectProvider(provider)}
                className={`
                  relative p-4 rounded-xl border-2 transition-all duration-200
                  animate-in fade-in-0 zoom-in-95
                  hover:shadow-md active:scale-[0.98]
                  ${selectedProvider?.id === provider.id
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-muted hover:border-primary/50"
                  }
                `}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                {selectedProvider?.id === provider.id && (
                  <div className="absolute top-2 right-2 animate-in zoom-in-0 duration-200">
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  </div>
                )}
                <Avatar className="h-14 w-14 mx-auto mb-2">
                  <AvatarImage src={provider.imageUrl} />
                  <AvatarFallback className="text-lg">
                    {getProviderInitials(provider) || <User className="h-6 w-6" />}
                  </AvatarFallback>
                </Avatar>
                <p className="text-sm font-medium text-center truncate">
                  {getProviderDisplayName(provider)}
                </p>
              </button>
            ))}
          </div>
        )}
        
        <Button
          className="w-full mt-6"
          disabled={!selectedProvider}
          onClick={onContinue}
        >
          {t('continue') || 'Continue'}
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </CardContent>
    </Card>
  );
}
