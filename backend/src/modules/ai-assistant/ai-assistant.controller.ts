import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { Response } from 'express';
import { AiAssistantService } from './ai-assistant.service';
import { AiAssistantChatDto, AiAssistantResponseDto } from './dto/ai-assistant.dto';

@ApiTags('ai-assistant')
@Controller('public/ai-assistant')
export class AiAssistantController {
  constructor(private readonly aiAssistantService: AiAssistantService) {}

  @Post('chat')
  @ApiOperation({ summary: 'Chat with AI assistant (non-streaming)' })
  @ApiResponse({ status: 200, type: AiAssistantResponseDto })
  async chat(@Body() chatDto: AiAssistantChatDto): Promise<AiAssistantResponseDto> {
    return this.aiAssistantService.chat(chatDto);
  }

  @Post('chat/stream')
  @ApiOperation({ summary: 'Chat with AI assistant (streaming)' })
  async chatStream(
    @Body() chatDto: AiAssistantChatDto,
    @Res() res: Response,
  ): Promise<void> {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    try {
      for await (const chunk of this.aiAssistantService.processChat(chatDto)) {
        res.write(`data: ${chunk}\n\n`);
      }
      res.end();
    } catch (error) {
      res.write(`data: ${JSON.stringify({ type: 'error', content: error.message })}\n\n`);
      res.end();
    }
  }
}
