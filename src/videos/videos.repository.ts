import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadVideoDto } from './dto/upload-video.dto';

@Injectable()
export class VideosRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    data: UploadVideoDto & { videoUrl: string },
    uploadedById: string,
  ) {
    return this.prisma.proofVideo.create({
      data: {
        videoUrl: data.videoUrl,
        shipmentId: data.shipmentId,
        uploadedById,
      },
      include: {
        shipment: {
          include: {
            organization: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }

  async findAll(organizationId?: string) {
    return this.prisma.proofVideo.findMany({
      where: organizationId
        ? {
            shipment: {
              organizationId,
            },
          }
        : undefined,
      include: {
        shipment: {
          include: {
            organization: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        shareLinks: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.proofVideo.findUnique({
      where: { id },
      include: {
        shipment: {
          include: {
            organization: true,
          },
        },
        uploadedBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        shareLinks: true,
      },
    });
  }

  async findByShipmentId(shipmentId: string) {
    return this.prisma.proofVideo.findUnique({
      where: { shipmentId },
    });
  }
}
