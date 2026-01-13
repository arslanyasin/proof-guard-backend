import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ShipmentStatus } from '../../generated/prisma';
import { VideosRepository } from './videos.repository';
import { UploadVideoDto } from './dto/upload-video.dto';
import { ShipmentsRepository } from '../shipments/shipments.repository';
import { S3Service } from '../common/services/s3.service';

@Injectable()
export class VideosService {
  constructor(
    private readonly videosRepository: VideosRepository,
    private readonly shipmentsRepository: ShipmentsRepository,
    private readonly s3Service: S3Service,
  ) {}

  async upload(
    uploadVideoDto: UploadVideoDto,
    file: Express.Multer.File,
    uploadedById: string,
  ) {
    // Check if video already exists for this shipment
    const existing = await this.videosRepository.findByShipmentId(
      uploadVideoDto.shipmentId,
    );

    if (existing) {
      throw new ConflictException(
        `Proof video already exists for shipment ${uploadVideoDto.shipmentId}. Videos are immutable and cannot be replaced.`,
      );
    }

    // Verify shipment exists and is not already sealed
    const shipment = await this.shipmentsRepository.findById(
      uploadVideoDto.shipmentId,
    );

    if (!shipment) {
      throw new NotFoundException(
        `Shipment ${uploadVideoDto.shipmentId} not found`,
      );
    }

    if (shipment.status === ShipmentStatus.SEALED) {
      throw new BadRequestException(
        `Cannot upload video to a sealed shipment. Sealed shipments are immutable.`,
      );
    }

    if (shipment.status === ShipmentStatus.FAILED) {
      throw new BadRequestException(
        `Cannot upload video to a failed shipment.`,
      );
    }

    // Upload file to S3 and get the URL
    const videoUrl = await this.s3Service.uploadFile(file, 'proof-videos');

    // Save video URL to database
    const video = await this.videosRepository.create(
      { ...uploadVideoDto, videoUrl },
      uploadedById,
    );

    // Automatically seal the shipment after successful upload
    await this.shipmentsRepository.update(uploadVideoDto.shipmentId, {
      status: ShipmentStatus.SEALED,
    });

    return video;
  }

  async findAll(organizationId?: string) {
    return this.videosRepository.findAll(organizationId);
  }

  async findById(id: string) {
    const video = await this.videosRepository.findById(id);

    if (!video) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }

    return video;
  }

  async findByShipmentId(shipmentId: string) {
    const video = await this.videosRepository.findByShipmentId(shipmentId);

    if (!video) {
      throw new NotFoundException(
        `Video for shipment ${shipmentId} not found`,
      );
    }

    return video;
  }
}
