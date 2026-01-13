import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { VideosService } from './videos.service';
import { UploadVideoDto } from './dto/upload-video.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';

@ApiTags('videos')
@ApiBearerAuth('JWT-auth')
@Controller('videos')
@UseGuards(JwtAuthGuard)
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Post('upload')
  @UseInterceptors(FileInterceptor('file'))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'Upload proof video to S3 (auto-seals shipment)',
    description: 'Upload a proof video file for a shipment. File is uploaded to S3 and URL is saved. Can be uploaded from CREATED, RECORDING, or PROCESSING status. Automatically seals the shipment after successful upload.'
  })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        shipmentId: {
          type: 'string',
          format: 'uuid',
          description: 'Shipment UUID',
          example: '123e4567-e89b-12d3-a456-426614174000',
        },
        file: {
          type: 'string',
          format: 'binary',
          description: 'Video file (mp4, mov, avi, mkv, webm)',
        },
      },
      required: ['shipmentId', 'file'],
    },
  })
  @ApiResponse({ status: 201, description: 'Video uploaded to S3 and shipment sealed' })
  @ApiResponse({ status: 400, description: 'Invalid file type, or shipment already sealed/failed' })
  @ApiResponse({ status: 404, description: 'Shipment not found' })
  @ApiResponse({ status: 409, description: 'Video already exists for this shipment' })
  @ApiResponse({ status: 413, description: 'File too large' })
  async upload(
    @Body() uploadVideoDto: UploadVideoDto,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({
            maxSize: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // Default 100MB
          }),
          new FileTypeValidator({
            fileType: /(mp4|mov|avi|mkv|webm)$/,
          }),
        ],
      }),
    )
    file: Express.Multer.File,
    @CurrentUser('userId') userId: string,
  ) {
    if (!file) {
      throw new BadRequestException('Video file is required');
    }

    return this.videosService.upload(uploadVideoDto, file, userId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all proof videos' })
  @ApiQuery({ name: 'organizationId', required: false, description: 'Filter by organization ID' })
  @ApiResponse({ status: 200, description: 'List of proof videos' })
  async findAll(@Query('organizationId') organizationId?: string) {
    return this.videosService.findAll(organizationId);
  }

  @Get('shipment/:shipmentId')
  @ApiOperation({ summary: 'Get proof video by shipment ID' })
  @ApiResponse({ status: 200, description: 'Proof video details' })
  @ApiResponse({ status: 404, description: 'Video not found for shipment' })
  async findByShipment(@Param('shipmentId') shipmentId: string) {
    return this.videosService.findByShipmentId(shipmentId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get proof video by ID' })
  @ApiResponse({ status: 200, description: 'Proof video details' })
  @ApiResponse({ status: 404, description: 'Video not found' })
  async findOne(@Param('id') id: string) {
    return this.videosService.findById(id);
  }
}
