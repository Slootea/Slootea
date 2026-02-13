"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { publicApi } from "@/lib/api";
import { ServiceOption, AiChatMessage, AiSuggestedService, AiStreamChunk } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Send, 
  Clock, 
  List,
  Image as ImageIcon
} from "lucide-react";
import { cn } from "@/lib/utils";

interface AiServiceAssistantProps {
  organizationId: string;
  services: ServiceOption[];
  onSelectService: (service: ServiceOption) => void;
  onShowAllServices: () => void;
  businessName?: string;
}

interface ChatMessage extends AiChatMessage {
  suggestedServices?: AiSuggestedService[];
  isLoading?: boolean;
}

export function AiServiceAssistant({
  organizationId,
  services,
  onSelectService,
  onShowAllServices,
  businessName,
}: AiServiceAssistantProps) {
  const t = useTranslations('booking');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedServices, setSuggestedServices] = useState<AiSuggestedService[]>([]);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  }, [messages]);

  // Focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleSendMessage = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput("");
    
    // Add user message
    const newMessages: ChatMessage[] = [
      ...messages,
      { role: 'user' as const, content: userMessage },
    ];
    setMessages(newMessages);
    
    // Add loading assistant message
    setMessages([...newMessages, { role: 'assistant' as const, content: '', isLoading: true }]);
    setIsLoading(true);
    setSuggestedServices([]);

    try {
      // Use streaming endpoint
      const response = await publicApi.aiAssistantChatStream({
        message: userMessage,
        history: messages.map(m => ({ role: m.role, content: m.content })),
        organizationId,
      });

      if (!response.body) {
        throw new Error('No response body');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let assistantContent = '';
      let collectedServices: AiSuggestedService[] = [];

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split('\n');

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data: AiStreamChunk = JSON.parse(line.slice(6));
              
              if (data.type === 'text' && data.content) {
                assistantContent += data.content;
                // Update the assistant message
                setMessages([
                  ...newMessages,
                  { role: 'assistant', content: assistantContent, isLoading: false },
                ]);
              } else if (data.type === 'services' && data.services) {
                collectedServices = [...collectedServices, ...data.services];
                setSuggestedServices(collectedServices);
              } else if (data.type === 'done') {
                // Clean up the message (remove service JSON if present)
                const cleanContent = assistantContent.replace(/<SERVICES>[\s\S]*?<\/SERVICES>/g, '').trim();
                setMessages([
                  ...newMessages,
                  { 
                    role: 'assistant', 
                    content: cleanContent, 
                    suggestedServices: collectedServices,
                    isLoading: false 
                  },
                ]);
              } else if (data.type === 'error') {
                setMessages([
                  ...newMessages,
                  { 
                    role: 'assistant', 
                    content: data.content || t('aiAssistant.error') || 'Sorry, something went wrong. Please try again.',
                    isLoading: false 
                  },
                ]);
              }
            } catch {
              // Ignore JSON parse errors
            }
          }
        }
      }
    } catch (error) {
      console.error('AI Assistant error:', error);
      setMessages([
        ...newMessages,
        { 
          role: 'assistant', 
          content: t('aiAssistant.error') || 'Sorry, something went wrong. Please try again.',
          isLoading: false 
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  }, [input, isLoading, messages, organizationId, t]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleServiceClick = (suggestedService: AiSuggestedService) => {
    // Find the full service from the services list
    const fullService = services.find(s => s.id === suggestedService.id);
    if (fullService) {
      onSelectService(fullService);
    }
  };

  return (
    <div className="flex flex-col h-[calc(100dvh-200px)] md:h-[600px]">
      {/* Chat Messages */}
      <ScrollArea className="flex-1 py-4" ref={scrollAreaRef}>
        <div className="space-y-4 pr-4">
          {/* Welcome message */}
          {messages.length === 0 && (
            <div className="flex justify-center">
              <div className="rounded-lg bg-muted p-4 max-w-[90%]">
                <p className="text-sm text-center">
                  {t('aiAssistant.welcome') || `Hello! 👋 I'm here to help you find the perfect service at ${businessName || 'our business'}. What are you looking for today?`}
                </p>
              </div>
            </div>
          )}

          {/* Chat messages */}
          {messages.map((message, index) => (
            <div key={index} className={cn(
              "flex",
              message.role === 'user' ? "justify-end" : "justify-start"
            )}>
              <div className={cn(
                "space-y-2",
                message.role === 'user' ? "items-end" : "items-start",
                "max-w-[85%]"
              )}>
                <div className={cn(
                  "rounded-lg p-3",
                  message.role === 'user' 
                    ? "bg-primary text-primary-foreground" 
                    : "bg-muted"
                )}>
                  {message.isLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="flex gap-1">
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-2 h-2 bg-current rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                      </div>
                    </div>
                  ) : (
                    <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                  )}
                </div>

                {/* Suggested services - Interactive cards */}
                {message.suggestedServices && message.suggestedServices.length > 0 && (
                  <div className="w-full mt-4">
                    <div className="grid gap-4">
                    {message.suggestedServices.map((service) => {
                      const fullService = services.find(s => s.id === service.id);
                      return (
                        <Card 
                          key={service.id}
                          className="cursor-pointer hover:shadow-lg transition-shadow"
                          onClick={() => handleServiceClick(service)}
                        >
                          <CardContent className="p-0">
                            {fullService?.imageBase64 ? (
                              <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                                <img
                                  src={fullService.imageBase64}
                                  alt={fullService?.title || service.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                                <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                              </div>
                            )}
                            <div className="p-4">
                              <h3 className="font-semibold text-lg mb-1">
                                {fullService?.title || service.title}
                              </h3>
                              {fullService?.description && (
                                <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                                  {fullService.description}
                                </p>
                              )}
                              <div className="flex items-center justify-between">
                                <div className="flex items-center text-sm text-muted-foreground">
                                  <Clock className="h-4 w-4 mr-1" />
                                  {fullService?.duration || service.duration} {t('minutes') || 'min'}
                                </div>
                                <Button size="sm" className="ml-2">
                                  {t('getAppointment') || 'Get Appointment'}
                                </Button>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {/* Show suggested services separately if available during streaming */}
          {isLoading && suggestedServices.length > 0 && (
            <div className="w-full">
              <div className="grid gap-4">
                {suggestedServices.map((service) => {
                  const fullService = services.find(s => s.id === service.id);
                  return (
                    <Card 
                      key={service.id}
                      className="cursor-pointer hover:shadow-lg transition-shadow"
                      onClick={() => handleServiceClick(service)}
                    >
                      <CardContent className="p-0">
                        {fullService?.imageBase64 ? (
                          <div className="aspect-video bg-muted rounded-t-lg overflow-hidden">
                            <img
                              src={fullService.imageBase64}
                              alt={fullService?.title || service.title}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="aspect-video bg-muted rounded-t-lg flex items-center justify-center">
                            <ImageIcon className="h-12 w-12 text-muted-foreground/50" />
                          </div>
                        )}
                        <div className="p-4">
                          <h3 className="font-semibold text-lg mb-1">
                            {fullService?.title || service.title}
                          </h3>
                          {fullService?.description && (
                            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">
                              {fullService.description}
                            </p>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center text-sm text-muted-foreground">
                              <Clock className="h-4 w-4 mr-1" />
                              {fullService?.duration || service.duration} {t('minutes') || 'min'}
                            </div>
                            <Button size="sm" className="ml-2">
                              {t('getAppointment') || 'Get Appointment'}
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="flex-shrink-0 pt-4 border-t space-y-3">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={t('aiAssistant.inputPlaceholder') || 'Describe what you need...'}
            disabled={isLoading}
            className="flex-1"
          />
          <Button 
            onClick={handleSendMessage} 
            disabled={!input.trim() || isLoading}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        
        {/* Browse all services button */}
        <Button 
          variant="outline" 
          className="w-full"
          onClick={onShowAllServices}
        >
          <List className="h-4 w-4 mr-2" />
          {t('aiAssistant.browseAllServices') || 'Browse All Services'}
        </Button>
      </div>
    </div>
  );
}
