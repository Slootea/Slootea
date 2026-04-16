import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ChatOpenAI } from '@langchain/openai';
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from '@langchain/core/messages';
import { z } from 'zod';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, ILike } from 'typeorm';
import { ServiceOption } from '../service-options/entities/service-option.entity';
import { OrganizationSettings } from '../settings/entities/organization-settings.entity';
import { AiAssistantChatDto, ChatMessageDto, ServiceSuggestionDto } from './dto/ai-assistant.dto';

@Injectable()
export class AiAssistantService {
  private readonly logger = new Logger(AiAssistantService.name);
  private model: ChatOpenAI;

  constructor(
    private configService: ConfigService,
    @InjectRepository(ServiceOption)
    private serviceOptionRepository: Repository<ServiceOption>,
    @InjectRepository(OrganizationSettings)
    private organizationSettingsRepository: Repository<OrganizationSettings>,
  ) {
    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      this.logger.warn('OPENAI_API_KEY is not set. AI Assistant will not work.');
    }
    
    this.model = new ChatOpenAI({
      openAIApiKey: apiKey,
      modelName: 'gpt-5.4-2026-03-05',
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
   * Process chat message with structured output (no UUID leakage)
   */
  async *processChat(
    chatDto: AiAssistantChatDto,
  ): AsyncGenerator<string, void, unknown> {
    const { message, history = [], organizationId } = chatDto;

    const allServices = await this.getAllServices(organizationId);
    
    if (allServices.length === 0) {
      yield JSON.stringify({
        type: 'error',
        content: 'No services available for this organization.',
      });
      return;
    }

    const orgSettings = await this.organizationSettingsRepository.findOne({
      where: { organizationId },
    });
    const currency = orgSettings?.currency || 'TL';

    // Build a numbered service catalog (no UUIDs visible to the LLM's message output)
    const serviceIndex = allServices.map((s, i) => ({
      number: i + 1,
      id: s.id,
      title: s.title,
      description: s.description || '',
      duration: s.duration,
      price: s.showPrice ? (s.price > 0 ? `${s.price} ${currency}` : 'Free') : null,
    }));

    const serviceCatalog = serviceIndex.map(s => {
      let line = `#${s.number}. ${s.title}${s.description ? ` — ${s.description}` : ''} (${s.duration} min)`;
      if (s.price) line += ` [${s.price}]`;
      return line;
    }).join('\n');

    // Use withStructuredOutput to enforce schema via function calling
    const responseSchema = z.object({
      type: z.enum(['service', 'message']).describe('Whether you are suggesting a specific service or asking a clarifying question'),
      service_number: z.number().nullable().describe('The service number from the catalog (e.g. 1, 2, 3) if type is "service", otherwise null'),
      message: z.string().describe('Your response message to the client. NEVER include IDs, UUIDs, or service numbers. Use only service names.'),
    });

    const structuredModel = this.model.withStructuredOutput(responseSchema, {
      name: 'assistant_response',
    });

    const systemPrompt = `You are a friendly booking assistant. Help clients find the right service by asking directed questions.

SERVICE CATALOG:
${serviceCatalog}

RULES:
1. If the client's need clearly matches one service, set type="service" and service_number to that service's catalog number.
2. If the need is vague, set type="message" and ask a SHORT directed question (1-2 sentences) that mentions specific service NAMES to help narrow down.
3. Respond in the client's language.
4. NEVER include UUIDs, IDs, or catalog numbers in your message — use only human-readable service names.
5. DO NOT ask for date/time — focus only on identifying which service they need.
6. If a service has pricing info, you may mention it naturally when relevant.
7. Guide the client by referencing concrete service names: "Are you interested in X or Y?" not "What are you looking for?"`;

    const messages: BaseMessage[] = [
      new SystemMessage(systemPrompt),
      ...history.map((msg: ChatMessageDto) => 
        msg.role === 'user' 
          ? new HumanMessage(msg.content)
          : new AIMessage(msg.content)
      ),
      new HumanMessage(message),
    ];

    try {
      const result = await structuredModel.invoke(messages);

      const responseMessage = result.message || '';

      // Yield the text content for display
      if (responseMessage) {
        yield JSON.stringify({ type: 'text', content: responseMessage });
      }

      if (result.type === 'service' && result.service_number != null) {
        const serviceEntry = serviceIndex.find(s => s.number === result.service_number);
        if (serviceEntry) {
          const fullService = allServices.find(s => s.id === serviceEntry.id);
          if (fullService) {
            yield JSON.stringify({
              type: 'structured_response',
              responseType: 'service',
              serviceId: fullService.id,
              message: responseMessage,
              service: {
                id: fullService.id,
                title: fullService.title,
                description: fullService.description || '',
                duration: fullService.duration,
              },
            });
          }
        }
      } else {
        yield JSON.stringify({
          type: 'structured_response',
          responseType: 'message',
          serviceId: null,
          message: responseMessage,
        });
      }

      yield JSON.stringify({ type: 'done' });
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
