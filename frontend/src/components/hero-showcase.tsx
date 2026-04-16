"use client"

import { useEffect, useState, useCallback } from "react"
import { useTranslations } from "next-intl"
import { 
  Calendar, Clock, User, Package,
  Send, Users, ChevronRight, ArrowLeft, Mail, Phone, Sparkles,
  Check, Minus, Plus, ArrowUpDown, Search, PackagePlus, Play
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { trackEvent, AnalyticsEvents } from "@/lib/analytics"

// Slide types
type SlideKey = 'intro' | 'ai' | 'booking-intro' | 'services' | 'providers' | 'datetime' | 'userinfo' | 'calendar-intro' | 'calendar' | 'inventory-intro' | 'inventory'

const SLIDES: SlideKey[] = ['intro', 'ai', 'booking-intro', 'services', 'providers', 'datetime', 'userinfo', 'calendar-intro', 'calendar', 'inventory-intro', 'inventory']
const SLIDE_DURATION = 4000

type TranslationFunction = ReturnType<typeof useTranslations<'landing.showcase'>>

// ==================== ANNOTATION PANE ====================
function AnnotationPane({ 
  slideKey, 
  t, 
  onPlayDemo,
  demoStarted 
}: { 
  slideKey: string; 
  t: TranslationFunction;
  onPlayDemo?: () => void;
  demoStarted?: boolean;
}) {
  const annotationKeys: Record<string, string> = {
    'intro': 'intro',
    'booking-intro': 'bookingIntro',
    'calendar-intro': 'calendarIntro',
    'inventory-intro': 'inventoryIntro'
  }
  
  const key = annotationKeys[slideKey]
  if (!key) return null

  const isIntro = slideKey === 'intro'

  return (
    <div className="flex flex-col h-full bg-gradient-to-br from-primary/5 via-background to-primary/10 items-center justify-center p-4 sm:p-6 md:p-8">
      <div className="text-center max-w-md animate-fade-up" style={{ animationFillMode: 'both' }}>
        <h2 className="text-sm sm:text-lg md:text-2xl font-display font-bold tracking-tight text-foreground mb-2 sm:mb-3">
          {t(`annotations.${key}.title` as Parameters<typeof t>[0])}
        </h2>
        <p className="text-[10px] sm:text-sm md:text-base text-muted-foreground animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          {t(`annotations.${key}.subtitle` as Parameters<typeof t>[0])}
        </p>
        
        {/* Play button for intro slide */}
        {isIntro && !demoStarted && onPlayDemo && (
          <div className="mt-4 sm:mt-6 animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
            <Button 
              size="lg" 
              onClick={onPlayDemo}
              className="h-10 sm:h-12 px-6 sm:px-8 text-sm sm:text-base font-medium gap-2 shadow-lg hover:shadow-xl transition-all"
            >
              <Play className="h-4 w-4 sm:h-5 sm:w-5 fill-current" />
              {t('playDemo')}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== AI ASSISTANT PANE ====================
function AIAssistantPane({ t }: { t: TranslationFunction }) {
  return (
    <div className="flex flex-col h-full bg-background p-2 sm:p-3 md:p-4">
      {/* Header */}
      <div className="flex items-center gap-2 pb-2 border-b mb-2 shrink-0">
        <div className="p-1 sm:p-1.5 bg-primary/10 rounded-full">
          <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold text-[10px] sm:text-xs md:text-sm">{t('ai.title')}</h3>
          <p className="text-[8px] sm:text-[10px] text-muted-foreground hidden sm:block">{t('ai.subtitle')}</p>
        </div>
      </div>
      
      {/* Chat Messages */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 sm:gap-2 min-h-0">
        {/* Welcome */}
        <div className="flex justify-center">
          <div className="rounded-lg bg-muted px-2 py-1 sm:px-3 sm:py-1.5 max-w-[90%]">
            <p className="text-[8px] sm:text-[10px] md:text-xs text-center">
              {t('ai.welcome')}
            </p>
          </div>
        </div>
        
        {/* User */}
        <div className="flex justify-end animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          <div className="rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 bg-primary text-primary-foreground max-w-[80%]">
            <p className="text-[8px] sm:text-[10px] md:text-xs">{t('ai.userMessage')}</p>
          </div>
        </div>
        
        {/* AI Response with card */}
        <div className="flex justify-start animate-fade-up" style={{ animationDelay: '800ms', animationFillMode: 'both' }}>
          <div className="space-y-1.5 max-w-[88%]">
            <div className="rounded-lg px-2 py-1 sm:px-3 sm:py-1.5 bg-muted">
              <p className="text-[8px] sm:text-[10px] md:text-xs">{t('ai.aiResponse')}</p>
            </div>
            {/* Mini service card */}
            <div className="rounded-lg border border-primary/20 overflow-hidden bg-background shadow animate-scale-up" style={{ animationDelay: '1200ms', animationFillMode: 'both' }}>
              <div className="aspect-[4/1] bg-gradient-to-br from-violet-100 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/30 flex items-center justify-center">
                <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-violet-500" />
              </div>
              <div className="p-1.5 sm:p-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1">
                <div className="flex items-center justify-between sm:block">
                  <h4 className="font-semibold text-[9px] sm:text-[10px] md:text-xs">{t('ai.serviceName')}</h4>
                  <span className="text-[7px] sm:text-[8px] text-muted-foreground flex items-center gap-0.5">
                    <Clock className="h-2 w-2" />60 min
                  </span>
                </div>
                <Button size="sm" className="h-4 sm:h-5 text-[6px] sm:text-[8px] px-1.5 w-full sm:w-auto">{t('ai.book')}</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Input */}
      <div className="pt-2 border-t mt-auto flex gap-1 shrink-0">
        <Input placeholder={t('ai.inputPlaceholder')} className="text-[8px] sm:text-[10px] h-6 sm:h-7 flex-1" />
        <Button size="icon" className="h-6 w-6 sm:h-7 sm:w-7 shrink-0">
          <Send className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
        </Button>
      </div>
    </div>
  )
}

// ==================== SERVICE SELECTION PANE ====================
function ServiceSelectionPane({ t }: { t: TranslationFunction }) {
  const services = [
    { key: "hair", duration: 45, price: 150, color: "from-pink-100 to-rose-50 dark:from-pink-950/50 dark:to-rose-950/30", icon: "✂️" },
    { key: "facial", duration: 60, price: 200, color: "from-blue-100 to-cyan-50 dark:from-blue-950/50 dark:to-cyan-950/30", icon: "✨" },
    { key: "nails", duration: 30, price: 80, color: "from-purple-100 to-violet-50 dark:from-purple-950/50 dark:to-violet-950/30", icon: "💅" },
    { key: "massage", duration: 90, price: 250, color: "from-green-100 to-emerald-50 dark:from-green-950/50 dark:to-emerald-950/30", icon: "🧘" },
    { key: "makeup", duration: 45, price: 120, color: "from-amber-100 to-orange-50 dark:from-amber-950/50 dark:to-orange-950/30", icon: "💄" },
    { key: "waxing", duration: 30, price: 75, color: "from-rose-100 to-pink-50 dark:from-rose-950/50 dark:to-pink-950/30", icon: "🌸" },
  ]

  return (
    <div className="flex flex-col h-full bg-background p-2 sm:p-3 md:p-4">
      {/* Header */}
      <div className="text-center pb-1.5 sm:pb-2 border-b mb-2 shrink-0">
        <h2 className="text-xs sm:text-sm md:text-base font-display font-bold tracking-tight">{t('services.salonName')}</h2>
        <p className="text-[8px] sm:text-[10px] text-muted-foreground">{t('services.selectService')}</p>
      </div>
      
      {/* Services Grid */}
      <div className="flex-1 grid grid-cols-3 gap-1 sm:gap-1.5 md:gap-2 content-center">
        {services.map((service, index) => (
          <div
            key={service.key}
            className="group cursor-pointer rounded-md sm:rounded-lg border bg-background overflow-hidden hover:shadow-md transition-all animate-scale-up"
            style={{ animationDelay: `${index * 50}ms`, animationFillMode: 'both' }}
          >
            <div className={`aspect-[5/3] bg-gradient-to-br ${service.color} flex items-center justify-center`}>
              <span className="text-sm sm:text-lg md:text-xl group-hover:scale-110 transition-transform">{service.icon}</span>
            </div>
            <div className="p-1 sm:p-1.5">
              <h3 className="font-medium text-[8px] sm:text-[10px] md:text-xs truncate">{t(`services.${service.key}` as Parameters<typeof t>[0])}</h3>
              <div className="flex items-center justify-between mt-0.5">
                <span className="text-[7px] sm:text-[8px] text-muted-foreground">{service.duration}m</span>
                <span className="font-semibold text-[7px] sm:text-[8px] md:text-[10px] text-primary">{service.price}₺</span>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      {/* Footer */}
      <div className="pt-1.5 border-t mt-2 text-center shrink-0">
        <p className="text-[7px] sm:text-[9px] text-muted-foreground flex items-center justify-center gap-0.5">
          <Sparkles className="h-2 w-2 sm:h-2.5 sm:w-2.5" />
          {t('services.needHelp')}
        </p>
      </div>
    </div>
  )
}

// ==================== PROVIDER SELECTION PANE ====================
function ProviderSelectionPane({ t }: { t: TranslationFunction }) {
  const providers = [
    { name: "Sarah M.", initials: "SM", color: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300" },
    { name: "John D.", initials: "JD", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
    { name: "Emma W.", initials: "EW", color: "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300" },
    { name: "Mike T.", initials: "MT", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  ]

  return (
    <div className="flex flex-col h-full bg-background p-2 sm:p-3 md:p-4">
      {/* Header */}
      <div className="text-center pb-1.5 sm:pb-2 border-b mb-2 shrink-0">
        <div className="mx-auto w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1">
          <Users className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
        </div>
        <h3 className="font-semibold text-xs sm:text-sm md:text-base">{t('providers.title')}</h3>
        <p className="text-[8px] sm:text-[10px] text-muted-foreground">{t('providers.subtitle')}</p>
      </div>
      
      {/* Providers */}
      <div className="flex-1 grid grid-cols-2 gap-1.5 sm:gap-2 content-center max-w-[200px] sm:max-w-xs mx-auto w-full">
        {providers.map((provider, index) => (
          <button
            key={provider.name}
            className={`
              relative p-1.5 sm:p-2 md:p-3 rounded-lg border-2 transition-all duration-200
              animate-fade-up hover:shadow-md active:scale-[0.98]
              ${index === 0 ? "border-primary bg-primary/5 shadow-md" : "border-muted hover:border-primary/50"}
            `}
            style={{ animationDelay: `${index * 80}ms`, animationFillMode: 'both' }}
          >
            {index === 0 && (
              <div className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1">
                <div className="w-3 h-3 sm:w-4 sm:h-4 rounded-full bg-primary flex items-center justify-center">
                  <Check className="h-2 w-2 sm:h-2.5 sm:w-2.5 text-primary-foreground" />
                </div>
              </div>
            )}
            <Avatar className={`h-6 w-6 sm:h-8 sm:w-8 md:h-10 md:w-10 mx-auto mb-0.5 sm:mb-1 ${provider.color}`}>
              <AvatarFallback className="text-[8px] sm:text-[10px] md:text-xs font-semibold bg-transparent">
                {provider.initials}
              </AvatarFallback>
            </Avatar>
            <p className="text-[8px] sm:text-[10px] md:text-xs font-medium text-center">{provider.name}</p>
          </button>
        ))}
      </div>
      
      {/* Continue */}
      <div className="pt-2 border-t mt-2 shrink-0">
        <Button className="w-full h-6 sm:h-7 text-[9px] sm:text-xs">
          {t('providers.continue')} <ChevronRight className="h-2.5 w-2.5 sm:h-3 sm:w-3 ml-0.5" />
        </Button>
      </div>
    </div>
  )
}

// ==================== DATETIME SELECTION PANE ====================
function DateTimeSelectionPane({ t }: { t: TranslationFunction }) {
  const timeSlots = ["09:00", "09:30", "10:00", "10:30", "11:00", "11:30", "14:00", "14:30"]
  
  return (
    <div className="flex flex-col h-full bg-background p-2 sm:p-3 md:p-4">
      {/* Header */}
      <div className="text-center pb-1.5 border-b mb-1.5 shrink-0">
        <div className="mx-auto w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1">
          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
        </div>
        <h3 className="font-semibold text-xs sm:text-sm">{t('datetime.title')}</h3>
      </div>
      
      {/* Calendar mini */}
      <div className="bg-muted/30 rounded-lg p-1.5 sm:p-2 mb-1.5 shrink-0">
        <div className="flex justify-between items-center mb-1 px-0.5">
          <span className="text-[8px] sm:text-[10px] font-semibold">{t('calendar.month')}</span>
          <div className="flex gap-0.5">
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-muted flex items-center justify-center text-[8px] sm:text-[10px]">‹</div>
            <div className="w-4 h-4 sm:w-5 sm:h-5 rounded bg-muted flex items-center justify-center text-[8px] sm:text-[10px]">›</div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-[2px] sm:gap-0.5 text-center">
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
            <div key={i} className="text-[6px] sm:text-[8px] text-muted-foreground py-0.5">{d}</div>
          ))}
          {[...Array(28)].map((_, i) => {
            const day = i + 1
            const isAvailable = [15, 16, 17, 18, 22, 23, 24, 25].includes(day)
            const isSelected = day === 18
            return (
              <div 
                key={i} 
                className={`
                  text-[7px] sm:text-[9px] py-0.5 rounded cursor-pointer
                  ${isSelected ? 'bg-primary text-primary-foreground font-bold' : 
                    isAvailable ? 'bg-primary/10 text-primary font-medium' : 
                    'text-muted-foreground/50'}
                `}
              >
                {day}
              </div>
            )
          })}
        </div>
      </div>

      {/* Time Slots */}
      <div className="flex-1 flex flex-col justify-center min-h-0">
        <p className="text-[8px] sm:text-[10px] font-medium text-center mb-1">Sat, April 18</p>
        <div className="grid grid-cols-4 gap-0.5 sm:gap-1">
          {timeSlots.map((slot, index) => (
            <Button
              key={slot}
              variant={index === 2 ? "default" : "outline"}
              size="sm"
              className="h-5 sm:h-6 text-[8px] sm:text-[10px] px-1 animate-scale-up"
              style={{ animationDelay: `${200 + index * 30}ms`, animationFillMode: 'both' }}
            >
              {slot}
            </Button>
          ))}
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-1.5 pt-2 border-t mt-2 shrink-0">
        <Button variant="outline" size="sm" className="flex-1 h-6 sm:h-7 text-[8px] sm:text-xs">
          <ArrowLeft className="h-2.5 w-2.5 mr-0.5" /> {t('datetime.back')}
        </Button>
        <Button size="sm" className="flex-1 h-6 sm:h-7 text-[8px] sm:text-xs">
          {t('datetime.continue')} <ChevronRight className="h-2.5 w-2.5 ml-0.5" />
        </Button>
      </div>
    </div>
  )
}

// ==================== USER INFO PANE ====================
function UserInfoPane({ t }: { t: TranslationFunction }) {
  return (
    <div className="flex flex-col h-full bg-background p-2 sm:p-3 md:p-4">
      {/* Header */}
      <div className="text-center pb-1.5 border-b mb-2 shrink-0">
        <div className="mx-auto w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-primary/10 flex items-center justify-center mb-1">
          <User className="h-3 w-3 sm:h-4 sm:w-4 text-primary" />
        </div>
        <h3 className="font-semibold text-xs sm:text-sm">{t('userinfo.title')}</h3>
      </div>
      
      {/* Form */}
      <div className="flex-1 flex flex-col justify-center gap-1.5 sm:gap-2 min-h-0">
        <div className="space-y-0.5 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <label className="text-[8px] sm:text-[10px] font-medium">{t('userinfo.name')} *</label>
          <div className="relative">
            <User className="absolute left-1.5 top-1 sm:top-1.5 h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
            <Input placeholder={t('userinfo.yourName')} className="pl-5 sm:pl-6 h-5 sm:h-6 md:h-7 text-[8px] sm:text-[10px]" defaultValue="Emma Wilson" />
          </div>
        </div>

        <div className="space-y-0.5 animate-fade-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
          <label className="text-[8px] sm:text-[10px] font-medium">{t('userinfo.phone')} *</label>
          <div className="relative">
            <Phone className="absolute left-1.5 top-1 sm:top-1.5 h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
            <Input placeholder={t('userinfo.phone')} className="pl-5 sm:pl-6 h-5 sm:h-6 md:h-7 text-[8px] sm:text-[10px]" defaultValue="+90 555 123" />
          </div>
        </div>

        <div className="space-y-0.5 animate-fade-up" style={{ animationDelay: '300ms', animationFillMode: 'both' }}>
          <label className="text-[8px] sm:text-[10px] font-medium">{t('userinfo.email')}</label>
          <div className="relative">
            <Mail className="absolute left-1.5 top-1 sm:top-1.5 h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
            <Input placeholder={t('userinfo.optional')} className="pl-5 sm:pl-6 h-5 sm:h-6 md:h-7 text-[8px] sm:text-[10px]" />
          </div>
        </div>

        {/* Summary */}
        <div className="bg-muted/50 p-1.5 sm:p-2 rounded-lg animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          <p className="font-semibold text-[8px] sm:text-[10px] mb-1">{t('userinfo.summary')}</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[7px] sm:text-[8px] md:text-[9px] text-muted-foreground">
            <span className="flex items-center gap-0.5"><Check className="h-2 w-2 text-primary" />{t('services.massage')} 90min</span>
            <span className="flex items-center gap-0.5"><Check className="h-2 w-2 text-primary" />Sarah M.</span>
            <span className="flex items-center gap-0.5"><Check className="h-2 w-2 text-primary" />Apr 18, 2026</span>
            <span className="flex items-center gap-0.5"><Check className="h-2 w-2 text-primary" />10:00</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex gap-1.5 pt-2 border-t mt-2 shrink-0">
        <Button variant="outline" size="sm" className="flex-1 h-6 sm:h-7 text-[8px] sm:text-xs">
          <ArrowLeft className="h-2.5 w-2.5 mr-0.5" /> {t('userinfo.back')}
        </Button>
        <Button size="sm" className="flex-1 h-6 sm:h-7 text-[8px] sm:text-xs">
          {t('userinfo.confirm')}
        </Button>
      </div>
    </div>
  )
}

// ==================== CALENDAR PANE ====================
function CalendarPane({ t }: { t: TranslationFunction }) {
  // Mock appointments for the week view
  const appointments = [
    { day: 0, start: 9, duration: 1, name: "Sarah M.", service: "Hair", status: "confirmed" },
    { day: 0, start: 11, duration: 1.5, name: "John D.", service: "Massage", status: "confirmed" },
    { day: 1, start: 10, duration: 1, name: "Emma W.", service: "Facial", status: "pending" },
    { day: 1, start: 14, duration: 0.75, name: "Mike T.", service: "Nails", status: "confirmed" },
    { day: 2, start: 9, duration: 2, name: "Lisa K.", service: "Massage", status: "confirmed" },
    { day: 2, start: 13, duration: 1, name: "Anna P.", service: "Hair", status: "completed" },
    { day: 3, start: 10, duration: 1.5, name: "Tom R.", service: "Facial", status: "confirmed" },
    { day: 4, start: 11, duration: 1, name: "Kate M.", service: "Makeup", status: "pending" },
  ]

  const dayKeys = ['mon', 'tue', 'wed', 'thu', 'fri'] as const
  const hours = [9, 10, 11, 12, 13, 14, 15]

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-500/90 border-l-green-600'
      case 'pending': return 'bg-yellow-500/90 border-l-yellow-600'
      case 'completed': return 'bg-blue-500/90 border-l-blue-600'
      default: return 'bg-primary/90 border-l-primary'
    }
  }

  return (
    <div className="flex flex-col h-full bg-background p-1.5 sm:p-2 md:p-3">
      {/* Header */}
      <div className="flex items-center justify-between pb-1.5 border-b mb-1.5 shrink-0">
        <div className="flex items-center gap-1.5">
          <div className="p-1 sm:p-1.5 bg-primary/10 rounded-full">
            <Calendar className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-primary" />
          </div>
          <div>
            <h3 className="font-semibold text-[9px] sm:text-[10px] md:text-xs">{t('calendar.month')}</h3>
            <p className="text-[7px] sm:text-[8px] text-muted-foreground hidden sm:block">{t('calendar.week')} 16</p>
          </div>
        </div>
        <div className="flex gap-0.5">
          <Button variant="outline" size="sm" className="h-4 sm:h-5 px-1.5 text-[7px] sm:text-[8px]">{t('calendar.week')}</Button>
          <Button variant="ghost" size="sm" className="h-4 sm:h-5 px-1.5 text-[7px] sm:text-[8px]">{t('calendar.day')}</Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Day headers */}
        <div className="flex shrink-0">
          <div className="w-6 sm:w-8 shrink-0" /> {/* Time column spacer */}
          {dayKeys.map((dayKey, i) => (
            <div 
              key={dayKey} 
              className="flex-1 text-center py-0.5 text-[7px] sm:text-[8px] font-medium animate-fade-up"
              style={{ animationDelay: `${i * 50}ms`, animationFillMode: 'both' }}
            >
              <span className="text-muted-foreground">{t(`calendar.days.${dayKey}` as Parameters<typeof t>[0])}</span>
              <span className={`block text-[8px] sm:text-[10px] font-bold ${i === 2 ? 'text-primary' : ''}`}>
                {14 + i}
              </span>
            </div>
          ))}
        </div>

        {/* Time grid */}
        <div className="flex-1 flex overflow-hidden">
          {/* Time labels */}
          <div className="w-6 sm:w-8 shrink-0 flex flex-col">
            {hours.map((hour) => (
              <div key={hour} className="flex-1 text-[6px] sm:text-[7px] text-muted-foreground text-right pr-1 -mt-1">
                {hour > 12 ? `${hour - 12}p` : `${hour}a`}
              </div>
            ))}
          </div>

          {/* Day columns */}
          <div className="flex-1 flex relative">
            {dayKeys.map((_, dayIndex) => (
              <div 
                key={dayIndex} 
                className="flex-1 border-l first:border-l-0 border-muted/50 relative"
              >
                {/* Hour grid lines */}
                {hours.map((_, i) => (
                  <div 
                    key={i} 
                    className="border-t border-muted/30"
                    style={{ height: `${100 / hours.length}%` }}
                  />
                ))}
              </div>
            ))}

            {/* Appointments overlay */}
            {appointments.map((apt, i) => {
              const hourHeight = 100 / hours.length
              const top = (apt.start - hours[0]) * hourHeight
              const height = apt.duration * hourHeight
              const left = (apt.day / dayKeys.length) * 100

              return (
                <div
                  key={i}
                  className={`absolute rounded-sm border-l-2 p-0.5 text-white text-[6px] sm:text-[7px] overflow-hidden shadow-sm animate-scale-up ${getStatusColor(apt.status)}`}
                  style={{
                    top: `${top}%`,
                    height: `${height}%`,
                    left: `calc(${left}% + 1px)`,
                    width: `calc(${100 / dayKeys.length}% - 3px)`,
                    animationDelay: `${200 + i * 50}ms`,
                    animationFillMode: 'both'
                  }}
                >
                  <div className="font-medium truncate">{apt.name}</div>
                  <div className="opacity-80 truncate hidden sm:block">{apt.service}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>

      {/* Footer stats */}
      <div className="pt-1.5 border-t mt-1.5 grid grid-cols-3 gap-1 text-center shrink-0">
        <div className="animate-fade-up" style={{ animationDelay: '400ms', animationFillMode: 'both' }}>
          <p className="text-[9px] sm:text-[11px] font-bold">8</p>
          <p className="text-[6px] sm:text-[7px] text-muted-foreground">{t('calendar.today')}</p>
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '450ms', animationFillMode: 'both' }}>
          <p className="text-[9px] sm:text-[11px] font-bold">32</p>
          <p className="text-[6px] sm:text-[7px] text-muted-foreground">{t('calendar.thisWeek')}</p>
        </div>
        <div className="animate-fade-up" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
          <p className="text-[9px] sm:text-[11px] font-bold text-green-600">94%</p>
          <p className="text-[6px] sm:text-[7px] text-muted-foreground">{t('calendar.confirmed')}</p>
        </div>
      </div>
    </div>
  )
}

// ==================== INVENTORY PANE ====================
function InventoryPane({ t }: { t: TranslationFunction }) {
  // Mirroring the real adjust page layout
  const quickValues = [-5, -1, 1, 5, 10, 25]
  const adjustValue = 15

  return (
    <div className="flex flex-col h-full bg-background p-2 sm:p-3 md:p-4">
      {/* Two-column layout like real page */}
      <div className="flex-1 grid grid-cols-2 gap-1.5 sm:gap-2 min-h-0">
        {/* Left: Item Selection */}
        <div className="flex flex-col bg-muted/20 rounded-md sm:rounded-lg p-1.5 sm:p-2 animate-fade-up" style={{ animationDelay: '0ms', animationFillMode: 'both' }}>
          <div className="flex items-center gap-1 mb-1.5 shrink-0">
            <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
            <span className="text-[8px] sm:text-[10px] font-medium">{t('inventory.selectItem')}</span>
          </div>
          {/* Search */}
          <div className="relative mb-1.5 shrink-0">
            <Search className="absolute left-1.5 top-1/2 -translate-y-1/2 h-2 w-2 sm:h-2.5 sm:w-2.5 text-muted-foreground" />
            <Input placeholder={t('inventory.search')} className="h-5 sm:h-6 pl-5 sm:pl-6 text-[8px] sm:text-[10px]" />
          </div>
          {/* Item list */}
          <div className="flex-1 space-y-1 overflow-hidden">
            {[
              { name: "Shampoo Premium", stock: 85, selected: true },
              { name: "Nail Polish Set", stock: 23, low: true },
              { name: "Face Cream Pro", stock: 67 },
            ].map((item) => (
              <div 
                key={item.name}
                className={`flex items-center gap-1.5 p-1 sm:p-1.5 rounded border cursor-pointer transition-colors ${
                  item.selected ? 'border-primary bg-primary/5' : 'border-transparent hover:bg-muted/50'
                }`}
              >
                <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-muted flex items-center justify-center shrink-0">
                  <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[7px] sm:text-[9px] font-medium truncate">{item.name}</p>
                  <p className={`text-[6px] sm:text-[8px] ${item.low ? 'text-orange-600' : 'text-muted-foreground'}`}>
                    {item.stock} {t('inventory.units')}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right: Adjustment Controls */}
        <div className="flex flex-col bg-muted/20 rounded-md sm:rounded-lg p-1.5 sm:p-2 animate-fade-up" style={{ animationDelay: '100ms', animationFillMode: 'both' }}>
          <div className="flex items-center gap-1 mb-1.5 shrink-0">
            <ArrowUpDown className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
            <span className="text-[8px] sm:text-[10px] font-medium">{t('inventory.adjustStock')}</span>
          </div>
          
          {/* Selected item info */}
          <div className="bg-muted/50 rounded p-1.5 mb-1.5 shrink-0">
            <div className="flex items-center gap-1.5 mb-1">
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded bg-background flex items-center justify-center shrink-0">
                <Package className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
              </div>
              <div className="min-w-0">
                <p className="text-[8px] sm:text-[10px] font-semibold truncate">Shampoo Premium</p>
              </div>
            </div>
            <div className="flex items-center justify-between text-[7px] sm:text-[9px] pt-1 border-t">
              <span className="text-muted-foreground">{t('inventory.currentStock')}</span>
              <span className="font-bold">85 {t('inventory.units')}</span>
            </div>
          </div>
          
          {/* Quick adjust buttons */}
          <div className="grid grid-cols-6 gap-0.5 mb-1.5 shrink-0">
            {quickValues.map((val) => (
              <button
                key={val}
                className={`h-4 sm:h-5 rounded text-[7px] sm:text-[8px] font-medium transition-colors ${
                  val < 0 
                    ? 'bg-rose-100 text-rose-600 hover:bg-rose-200 dark:bg-rose-900/30 dark:text-rose-400' 
                    : 'bg-emerald-100 text-emerald-600 hover:bg-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400'
                }`}
              >
                {val > 0 ? `+${val}` : val}
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div className="flex items-center gap-1 mb-1.5 shrink-0">
            <button className="w-5 h-5 sm:w-6 sm:h-6 rounded border bg-background flex items-center justify-center shrink-0">
              <Minus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </button>
            <Input 
              className="h-5 sm:h-6 text-center text-[10px] sm:text-xs font-bold text-emerald-600 flex-1"
              defaultValue={`+${adjustValue}`}
            />
            <button className="w-5 h-5 sm:w-6 sm:h-6 rounded border bg-background flex items-center justify-center shrink-0">
              <Plus className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
            </button>
          </div>

          {/* Preview - color coded border like real component */}
          <div className="p-1.5 rounded border-2 border-emerald-200 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950/30 shrink-0 animate-scale-up" style={{ animationDelay: '200ms', animationFillMode: 'both' }}>
            <div className="flex items-center justify-between">
              <span className="text-[7px] sm:text-[9px] font-medium">{t('inventory.newStock')}</span>
              <div className="text-right">
                <p className="text-xs sm:text-sm font-bold">100 {t('inventory.units')}</p>
                <p className="text-[6px] sm:text-[8px] text-emerald-600">+{adjustValue} {t('inventory.units')}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Submit button */}
      <div className="pt-2 border-t mt-2 shrink-0">
        <Button size="sm" className="w-full h-6 sm:h-7 text-[8px] sm:text-xs">
          <PackagePlus className="h-2.5 w-2.5 sm:h-3 sm:w-3 mr-1" />
          {t('inventory.addStock')}
        </Button>
      </div>
    </div>
  )
}

// ==================== MAIN HERO SHOWCASE ====================
export function HeroShowcase() {
  const t = useTranslations('landing.showcase')
  const [currentSlide, setCurrentSlide] = useState(0)
  const [direction, setDirection] = useState<'forward' | 'backward'>('forward')
  const [demoStarted, setDemoStarted] = useState(false)

  const goToNextSlide = useCallback(() => {
    setDirection('forward')
    setCurrentSlide((prev) => (prev + 1) % SLIDES.length)
  }, [])

  const handlePlayDemo = useCallback(() => {
    // Track the event in Google Analytics
    trackEvent(AnalyticsEvents.DEMO_PLAY, {
      source: 'hero_showcase'
    })
    
    // Start the demo
    setDemoStarted(true)
    goToNextSlide()
  }, [goToNextSlide])

  useEffect(() => {
    // Only auto-play after demo has been started
    if (!demoStarted) return
    
    const interval = setInterval(goToNextSlide, SLIDE_DURATION)
    return () => clearInterval(interval)
  }, [goToNextSlide, demoStarted])

  const isAnnotationSlide = (slideKey: SlideKey) => {
    return ['intro', 'booking-intro', 'calendar-intro', 'inventory-intro'].includes(slideKey)
  }

  const renderSlide = (slideKey: SlideKey) => {
    // Check if it's an annotation slide
    if (isAnnotationSlide(slideKey)) {
      return (
        <AnnotationPane 
          slideKey={slideKey} 
          t={t} 
          onPlayDemo={slideKey === 'intro' ? handlePlayDemo : undefined}
          demoStarted={demoStarted}
        />
      )
    }
    
    switch (slideKey) {
      case 'ai': return <AIAssistantPane t={t} />
      case 'services': return <ServiceSelectionPane t={t} />
      case 'providers': return <ProviderSelectionPane t={t} />
      case 'datetime': return <DateTimeSelectionPane t={t} />
      case 'userinfo': return <UserInfoPane t={t} />
      case 'calendar': return <CalendarPane t={t} />
      case 'inventory': return <InventoryPane t={t} />
      default: return null
    }
  }

  const getSlideLabel = (slide: SlideKey): string => {
    if (isAnnotationSlide(slide)) return '•'
    return t(`slideLabels.${slide}` as Parameters<typeof t>[0])
  }

  return (
    <div className="w-full aspect-[4/5] sm:aspect-[3/2] md:aspect-[16/10] bg-gradient-to-br from-muted/30 via-muted/20 to-muted/30 rounded-lg sm:rounded-xl md:rounded-2xl overflow-hidden relative border shadow-xl sm:shadow-2xl">
      {/* Browser chrome */}
      <div className="absolute inset-0 flex flex-col">
        {/* Browser header */}
        <div className="flex items-center gap-1.5 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-surface-container-low border-b shrink-0">
          {/* Traffic lights - hidden on very small screens */}
          <div className="hidden sm:flex items-center gap-1">
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-red-400" />
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-yellow-400" />
            <div className="w-2 h-2 sm:w-2.5 sm:h-2.5 rounded-full bg-green-400" />
          </div>
          
          {/* URL bar */}
          <div className="flex-1 sm:flex-none sm:max-w-[180px] md:max-w-sm sm:mx-auto">
            <div className="flex items-center gap-1 bg-muted/50 rounded px-1.5 sm:px-2 py-0.5 sm:py-1">
              <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-emerald-500 shrink-0" />
              <span className="text-[8px] sm:text-[10px] md:text-xs text-muted-foreground truncate">slootea.com</span>
            </div>
          </div>
          
          {/* Step indicators */}
          <div className="flex items-center gap-0.5">
            {SLIDES.map((slide, index) => (
              <button
                key={slide}
                onClick={() => {
                  setDirection(index > currentSlide ? 'forward' : 'backward')
                  setCurrentSlide(index)
                }}
                className={`
                  h-1 sm:h-1.5 rounded-full transition-all
                  ${index === currentSlide 
                    ? 'bg-primary w-3 sm:w-4 md:w-5' 
                    : index < currentSlide
                      ? 'bg-primary/50 w-1 sm:w-1.5'
                      : 'bg-muted-foreground/30 w-1 sm:w-1.5'}
                `}
                title={getSlideLabel(slide)}
              />
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden relative bg-background">
          <div 
            key={currentSlide}
            className={`
              absolute inset-0
              animate-in duration-300 ease-out
              ${direction === 'forward' ? 'slide-in-from-right-4 fade-in-0' : 'slide-in-from-left-4 fade-in-0'}
            `}
          >
            {renderSlide(SLIDES[currentSlide])}
          </div>
        </div>
      </div>
    </div>
  )
}
