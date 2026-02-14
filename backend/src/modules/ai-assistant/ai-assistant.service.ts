import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage } from '@langchain/core/messages';
import { tool } from '@langchain/core/tools';
import { z } from 'zod';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ServiceOption } from '../service-options/entities/service-option.entity';
import { AiAssistantChatDto, ChatMessageDto, ServiceSuggestionDto } from './dto/ai-assistant.dto';

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private model: ChatOpenAI;

  constructor(
    private configService: ConfigService,
    @InjectRepository(ServiceOption)
    private serviceOptionRepository: Repository<ServiceOption>,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY is not set. AI Assistant will not work.');
    }
    
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-5-mini-2025-08-07',
      streaming: true,
    });
  }

  /**
   * Search services by keywords
   */
  async searchServices(
    organizationId: string,
    keywords: string[],
  ): Promise<ServiceOption[]> {
    // Handle undefined or empty keywords
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return this.getAllServices(organizationId);
    }

    // Build search conditions
    const conditions = keywords.flatMap(keyword => [
      { organizationId, isActive: true, title: ILike(`%${keyword}%`) },
      { organizationId, isActive: true, description: ILike(`%${keyword}%`) },
    ]);

    const services = await this.serviceOptionRepository.find({
      where: conditions,
      order: { sortOrder: 'ASC', title: 'ASC' },
    });

    // Deduplicate by id
    const uniqueServices = Array.from(
      new Map(services.map(s => [s.id, s])).values()
    );

    return uniqueServices;
  }

  /**
   * Get all services for an organization
   */
  async getAllServices(organizationId: string): Promise<ServiceOption[]> {
    return this.serviceOptionRepository.find({
      where: { organizationId, isActive: true },
      order: { sortOrder: 'ASC', title: 'ASC' },
    });
  }

  /**
   * Process chat message with streaming response
   */
  async *processChat(
    chatDto: AiAssistantChatDto,
  ): AsyncGenerator<string, void, unknown> {
    const { message, history = [], organizationId } = chatDto;

    // Get all services for context
    const allServices = await this.getAllServices(organizationId);
    
    if (allServices.length === 0) {
      yield JSON.stringify({
        type: 'error',
        content: 'No services available for this organization.',
      });
      return;
    }

    // Create the search services tool
    const searchServicesTool = tool(
      async ({ keywords }: { keywords: string[] }) => {
        const services = await this.searchServices(organizationId, keywords);
        return JSON.stringify(services.map(s => ({
          id: s.id,
          title: s.title,
          description: s.description || '',
          duration: s.duration,
        })));
      },
      {
        name: 'search_services',
        description: 'Search for services based on keywords. Use this to find relevant services for the client.',
        schema: z.object({
          keywords: z.array(z.string()).describe('Keywords to search for in service titles and descriptions'),
        }),
      }
    );

    // Build messages
    const systemPrompt = `You are a booking assistant. Your job is to help clients find the right service by asking directed questions based on available options. You do not do the booking, you ask questions or suggest service.

Available services:
${allServices.map(s => `- ID: ${s.id} | ${s.title}${s.description ? ` - ${s.description}` : ''} (${s.duration} min)`).join('\n')}

Rules:
1. You MUST respond with a valid JSON object - no other text before or after
2. If the client's request clearly matches a service or that service would be of help to client, respond with type "service"
3. If the request is vague, ask a DIRECTED question that references specific services or categories to help narrow down or ask for clarification
4. Guide the client by mentioning relevant service options in your questions (e.g., "Are you looking for X or Y?" or "We have A, B, and C - which interests you?")
5. Respond in the client's language
6. Keep questions short and helpful - maximum 1-2 sentences

Output format - respond with ONLY valid JSON:
For service matches:
{"type":"service","service_id":"actual-service-uuid","message":"optional brief confirmation"}

For directed questions (to help client choose):
{"type":"message","service_id":null,"message":"Your question mentioning specific services or categories"}

Examples of good directed questions:
- "We offer haircuts for men and women. Which are you interested in?"
- "Are you looking for a massage, facial treatment, or nail service?"
- "I see you want a haircut. Would you prefer our Express Cut or Full Styling?"

Use exact service IDs from above. ALWAYS respond with valid JSON only - no markdown, no explanations outside the JSON.`;

    const messages = [
      new SystemMessage(systemPrompt),
      ...history.map((msg: ChatMessageDto) => 
        msg.role === 'user' 
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      ),
      new HumanMessage(message),
    ];

    // Bind tools to model
    const modelWithTools = this.model.bindTools([searchServicesTool]);

    try {
      // Stream the response
      let fullContent = '';
      const stream = await modelWithTools.stream(messages);

      for await (const chunk of stream) {
        if (chunk.content) {
          const content = typeof chunk.content === 'string' ? chunk.content : '';
          fullContent += content;
          
          // Don't yield raw text chunks since the AI response is JSON
          // We'll parse and yield the structured response at the end
        }

        // Check for tool calls
        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          for (const toolCall of chunk.tool_calls) {
            if (toolCall.name === 'search_services' && toolCall.args) {
              const keywords = toolCall.args.keywords as string[] || [];
              
              yield JSON.stringify({
                type: 'tool_call',
                tool: 'search_services',
                args: { keywords },
              });

              // Execute the tool directly with the args
              const services = await this.searchServices(organizationId, keywords);
              
              yield JSON.stringify({
                type: 'services',
                services: services.map((s: any) => ({
                  id: s.id,
                  title: s.title,
                  description: s.description || '',
                  duration: s.duration,
                  relevanceScore: 0.8,
                })),
              });
            }
          }
        }
      }

      // Parse structured JSON response
      try {
        // Clean up the content - remove any markdown code blocks if present
        let cleanContent = fullContent.trim();
        if (cleanContent.startsWith('```json')) {
          cleanContent = cleanContent.replace(/^```json\s*/, '').replace(/```\s*$/, '');
        } else if (cleanContent.startsWith('```')) {
          cleanContent = cleanContent.replace(/^```\s*/, '').replace(/```\s*$/, '');
        }
        
        const structuredResponse = JSON.parse(cleanContent);
        
        if (structuredResponse.type === 'service' && structuredResponse.service_id) {
          // Find the full service from database
          const fullService = allServices.find(svc => svc.id === structuredResponse.service_id);
          if (fullService) {
            // If there's a message, stream it first
            if (structuredResponse.message) {
              yield JSON.stringify({
                type: 'text',
                content: structuredResponse.message,
              });
            }
            yield JSON.stringify({
              type: 'structured_response',
              responseType: 'service',
              serviceId: fullService.id,
              message: structuredResponse.message || '',
              service: {
                id: fullService.id,
                title: fullService.title,
                description: fullService.description || '',
                duration: fullService.duration,
              },
            });
          } else {
            // Service not found, treat as message
            const fallbackMessage = structuredResponse.message || 'I could not find that service. Could you please describe what you need?';
            yield JSON.stringify({
              type: 'text',
              content: fallbackMessage,
            });
            yield JSON.stringify({
              type: 'structured_response',
              responseType: 'message',
              serviceId: null,
              message: fallbackMessage,
            });
          }
        } else if (structuredResponse.type === 'message') {
          // Stream the message text first for display
          if (structuredResponse.message) {
            yield JSON.stringify({
              type: 'text',
              content: structuredResponse.message,
            });
          }
          yield JSON.stringify({
            type: 'structured_response',
            responseType: 'message',
            serviceId: null,
            message: structuredResponse.message || '',
          });
        }
      } catch {
        // If JSON parsing fails, treat the entire content as a message
        // This handles cases where the AI doesn't follow the format
        const cleanMessage = fullContent.replace(/<SERVICES>[\s\S]*?<\/SERVICES>/g, '').trim();
        if (cleanMessage) {
          yield JSON.stringify({
            type: 'text',
            content: cleanMessage,
          });
          yield JSON.stringify({
            type: 'structured_response',
            responseType: 'message',
            serviceId: null,
            message: cleanMessage,
          });
        }
      }

      yield JSON.stringify({
        type: 'done',
      });
    } catch (error) {
      this.logger.error(`AI Assistant error: ${error.message}`, error.stack);
      yield JSON.stringify({
        type: 'error',
        content: 'Sorry, I encountered an error. Please try again.',
      });
    }
  }

  /**
   * Non-streaming version for simpler responses
   */
  async chat(chatDto: AiAssistantChatDto): Promise<{
    message: string;
    suggestedServices: ServiceSuggestionDto[];
    needsMoreInfo: boolean;
    responseType?: 'service' | 'message';
    serviceId?: string | null;
  }> {
    let fullMessage = '';
    const suggestedServices: ServiceSuggestionDto[] = [];
    let responseType: 'service' | 'message' | undefined;
    let serviceId: string | null = null;

    for await (const chunk of this.processChat(chatDto)) {
      const data = JSON.parse(chunk);
      if (data.type === 'text') {
        fullMessage += data.content;
      } else if (data.type === 'services') {
        suggestedServices.push(...data.services);
      } else if (data.type === 'structured_response') {
        responseType = data.responseType;
        serviceId = data.serviceId || null;
        if (data.message) {
          fullMessage = data.message;
        }
        if (data.service) {
          suggestedServices.push({
            id: data.service.id,
            title: data.service.title,
            description: data.service.description || '',
            duration: data.service.duration,
            relevanceScore: 1.0,
          });
        }
      }
    }

    // Clean up the message (remove service JSON if present)
    fullMessage = fullMessage.replace(/<SERVICES>.*?<\/SERVICES>/s, '').trim();

    return {
      message: fullMessage,
      suggestedServices,
      needsMoreInfo: suggestedServices.length === 0 && responseType !== 'service',
      responseType,
      serviceId,
    };
  }
}
