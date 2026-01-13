import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ShareLinksRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(proofVideoId: string, token: string, expiresAt: Date) {
    return this.prisma.shareLink.create({
      data: {
        proofVideoId,
        token,
        expiresAt,
      },
      include: {
        proofVideo: {
          include: {
            shipment: true,
          },
        },
      },
    });
  }

  async findAll(proofVideoId?: string) {
    return this.prisma.shareLink.findMany({
      where: proofVideoId ? { proofVideoId } : undefined,
      include: {
        proofVideo: {
          include: {
            shipment: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.shareLink.findUnique({
      where: { id },
      include: {
        proofVideo: {
          include: {
            shipment: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });
  }

  async findByToken(token: string) {
    return this.prisma.shareLink.findUnique({
      where: { token },
      include: {
        proofVideo: {
          include: {
            shipment: {
              include: {
                organization: true,
              },
            },
          },
        },
      },
    });
  }

  async delete(id: string) {
    return this.prisma.shareLink.delete({
      where: { id },
    });
  }

  async deleteExpired() {
    return this.prisma.shareLink.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });
  }
}
