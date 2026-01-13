import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@Injectable()
export class ShipmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateShipmentDto, createdById: string) {
    return this.prisma.shipment.create({
      data: {
        ...data,
        createdById,
      },
      include: {
        organization: true,
        createdBy: {
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
    return this.prisma.shipment.findMany({
      where: organizationId ? { organizationId } : undefined,
      include: {
        organization: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        proofVideo: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findById(id: string) {
    return this.prisma.shipment.findUnique({
      where: { id },
      include: {
        organization: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
        proofVideo: {
          include: {
            shareLinks: true,
          },
        },
      },
    });
  }

  async findByAwb(awb: string, organizationId: string) {
    return this.prisma.shipment.findUnique({
      where: {
        awb_organizationId: {
          awb,
          organizationId,
        },
      },
    });
  }

  async update(id: string, data: UpdateShipmentDto) {
    return this.prisma.shipment.update({
      where: { id },
      data,
      include: {
        organization: true,
        createdBy: {
          select: {
            id: true,
            email: true,
            name: true,
          },
        },
      },
    });
  }
}
