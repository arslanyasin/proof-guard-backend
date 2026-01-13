import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ShareLinksService } from './share-links.service';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { ValidateTokenDto } from './dto/validate-token.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('share-links')
@Controller('share-links')
export class ShareLinksController {
  constructor(private readonly shareLinksService: ShareLinksService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Generate a shareable link for a proof video' })
  @ApiResponse({ status: 201, description: 'Share link created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async create(@Body() createShareLinkDto: CreateShareLinkDto) {
    return this.shareLinksService.create(createShareLinkDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get all share links' })
  @ApiQuery({ name: 'proofVideoId', required: false, description: 'Filter by proof video ID' })
  @ApiResponse({ status: 200, description: 'List of share links' })
  async findAll(@Query('proofVideoId') proofVideoId?: string) {
    return this.shareLinksService.findAll(proofVideoId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Get share link by ID' })
  @ApiResponse({ status: 200, description: 'Share link details' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  async findOne(@Param('id') id: string) {
    return this.shareLinksService.findById(id);
  }

  @Post('validate')
  @ApiOperation({
    summary: 'Validate share link token (public endpoint)',
    description: 'Validates a share link token and returns the proof video if valid and not expired'
  })
  @ApiResponse({ status: 200, description: 'Token is valid, returns proof video' })
  @ApiResponse({ status: 401, description: 'Token expired' })
  @ApiResponse({ status: 404, description: 'Invalid token' })
  async validate(@Body() validateTokenDto: ValidateTokenDto) {
    return this.shareLinksService.validateToken(validateTokenDto.token);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Revoke a share link' })
  @ApiResponse({ status: 200, description: 'Share link revoked successfully' })
  @ApiResponse({ status: 404, description: 'Share link not found' })
  async delete(@Param('id') id: string) {
    return this.shareLinksService.delete(id);
  }

  @Delete('cleanup/expired')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({ summary: 'Delete all expired share links' })
  @ApiResponse({ status: 200, description: 'Expired links cleaned up' })
  async cleanupExpired() {
    return this.shareLinksService.cleanupExpired();
  }
}
