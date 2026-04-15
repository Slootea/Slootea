"use client"

import { Clock, Send, Sparkles } from "lucide-react"
import { useTranslations } from "next-intl"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

export function AIAssistantShowcase() {
  const t = useTranslations('landing.showcase.ai')
  
  return (
    <div className="relative">
      <div className="absolute -inset-4 bg-gradient-to-r from-primary/10 via-primary/5 to-transparent rounded-2xl blur-xl opacity-60" />
      <div className="relative bg-surface-container-low rounded-2xl shadow-ambient overflow-hidden aspect-[4/3] border">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-background/80 border-b">
          {/* Traffic lights */}
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full bg-red-400" />
            <div className="w-3 h-3 rounded-full bg-yellow-400" />
            <div className="w-3 h-3 rounded-full bg-green-400" />
          </div>
          
          {/* URL bar */}
          <div className="flex-1 max-w-xs mx-auto">
            <div className="flex items-center gap-1.5 bg-muted/50 rounded-md px-3 py-1">
              <div className="w-2 h-2 rounded-full bg-emerald-500" />
              <span className="text-xs text-muted-foreground">slootea.com/book</span>
            </div>
          </div>
        </div>

        {/* AI Assistant Content */}
        <div className="flex flex-col h-[calc(100%-45px)] bg-background p-4 sm:p-6">
          {/* Header */}
          <div className="flex items-center gap-3 pb-4 border-b mb-4 shrink-0">
            <div className="p-2 bg-primary/10 rounded-full">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h3 className="font-semibold text-sm sm:text-base">{t('title')}</h3>
              <p className="text-xs text-muted-foreground">{t('subtitle')}</p>
            </div>
          </div>
          
          {/* Chat Messages */}
          <div className="flex-1 flex flex-col justify-center gap-3 min-h-0 overflow-hidden">
            {/* Welcome */}
            <div className="flex justify-center">
              <div className="rounded-xl bg-muted px-4 py-2 max-w-[90%]">
                <p className="text-xs sm:text-sm text-center">
                  {t('welcome')}
                </p>
              </div>
            </div>
            
            {/* User message */}
            <div className="flex justify-end animate-fade-up" style={{ animationDelay: '500ms', animationFillMode: 'both' }}>
              <div className="rounded-xl px-4 py-2 bg-primary text-primary-foreground max-w-[80%]">
                <p className="text-xs sm:text-sm">{t('userMessage')}</p>
              </div>
            </div>
            
            {/* AI Response with card */}
            <div className="flex justify-start animate-fade-up" style={{ animationDelay: '1000ms', animationFillMode: 'both' }}>
              <div className="space-y-2 max-w-[88%]">
                <div className="rounded-xl px-4 py-2 bg-muted">
                  <p className="text-xs sm:text-sm">{t('aiResponse')}</p>
                </div>
                {/* Service card */}
                <div className="rounded-xl border border-primary/20 overflow-hidden bg-background shadow-lg animate-scale-up" style={{ animationDelay: '1500ms', animationFillMode: 'both' }}>
                  <div className="aspect-[4/1] bg-gradient-to-br from-violet-100 to-purple-50 dark:from-violet-950/50 dark:to-purple-950/30 flex items-center justify-center">
                    <Sparkles className="h-6 w-6 text-violet-500" />
                  </div>
                  <div className="p-3 flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-sm">{t('serviceName')}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Clock className="h-3 w-3" />60 min
                        </span>
                        <span className="text-xs font-semibold text-primary">₺250</span>
                      </div>
                    </div>
                    <Button size="sm" className="h-8 text-xs px-3">{t('book')}</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Input */}
          <div className="pt-4 border-t mt-auto flex gap-2 shrink-0">
            <Input placeholder={t('inputPlaceholder')} className="text-sm h-10 flex-1" />
            <Button size="icon" className="h-10 w-10 shrink-0">
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
