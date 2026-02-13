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
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
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
    const systemPrompt = `You are a booking assistant. Your ONLY job is to identify which service the client needs and return it.

Available services:
${allServices.map(s => `- ID: ${s.id} | ${s.title}${s.description ? ` - ${s.description}` : ''} (${s.duration} min)`).join('\n')}

Rules:
1. DO NOT write any text, explanations, or acknowledgments
2. If you can identify a matching service, respond with ONLY the SERVICES tag - nothing else
3. If you absolutely need clarification, ask ONE short question (this is the only time you write text)
4. Respond in the client's language when asking questions

Output format - respond with ONLY this (no other text):
<SERVICES>[{"id":"actual-service-uuid","relevanceScore":0.9}]</SERVICES>

Use exact service IDs from above. Set relevanceScore: 1.0 for perfect matches, 0.8 for good matches, 0.6 for partial matches.
DO NOT include title or description in the JSON - only id and relevanceScore.
DO NOT write anything before or after the SERVICES tag unless asking a clarifying question.`;

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
          
          // Send text chunk
          yield JSON.stringify({
            type: 'text',
            content: content,
          });
        }

        // Check for tool calls
        if (chunk.tool_calls && chunk.tool_calls.length > 0) {
          for (const toolCall of chunk.tool_calls) {
            if (toolCall.name === 'search_services' && toolCall.args) {
              yield JSON.stringify({
                type: 'tool_call',
                tool: 'search_services',
                args: toolCall.args,
              });

              // Execute the tool directly with the args
              const services = await this.searchServices(organizationId, toolCall.args.keywords as string[]);
              
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

      // Parse services from the response if present
      const servicesMatch = fullContent.match(/<SERVICES>(.*?)<\/SERVICES>/s);
      if (servicesMatch) {
        try {
          const suggestedServiceIds = JSON.parse(servicesMatch[1]);
          // Enrich with full service details from database
          const enrichedServices = suggestedServiceIds.map((s: any) => {
            const fullService = allServices.find(svc => svc.id === s.id);
            if (fullService) {
              return {
                id: fullService.id,
                title: fullService.title,
                description: fullService.description || '',
                duration: fullService.duration,
                relevanceScore: s.relevanceScore || 0.8,
              };
            }
            return null;
          }).filter(Boolean);
          
          if (enrichedServices.length > 0) {
            yield JSON.stringify({
              type: 'services',
              services: enrichedServices,
            });
          }
        } catch {
          // Ignore parsing errors
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
  }> {
    let fullMessage = '';
    const suggestedServices: ServiceSuggestionDto[] = [];

    for await (const chunk of this.processChat(chatDto)) {
      const data = JSON.parse(chunk);
      if (data.type === 'text') {
        fullMessage += data.content;
      } else if (data.type === 'services') {
        suggestedServices.push(...data.services);
      }
    }

    // Clean up the message (remove service JSON if present)
    fullMessage = fullMessage.replace(/<SERVICES>.*?<\/SERVICES>/s, '').trim();

    return {
      message: fullMessage,
      suggestedServices,
      needsMoreInfo: suggestedServices.length === 0,
    };
  }
}
