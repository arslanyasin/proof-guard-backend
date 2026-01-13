import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ShipmentStatus } from '../../generated/prisma';
import { ShipmentsRepository } from './shipments.repository';
import { CreateShipmentDto } from './dto/create-shipment.dto';
import { UpdateShipmentDto } from './dto/update-shipment.dto';

@Injectable()
export class ShipmentsService {
  // Valid state transitions for proof lifecycle
  private readonly validTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
    [ShipmentStatus.CREATED]: [ShipmentStatus.RECORDING, ShipmentStatus.FAILED],
    [ShipmentStatus.RECORDING]: [ShipmentStatus.PROCESSING, ShipmentStatus.FAILED],
    [ShipmentStatus.PROCESSING]: [ShipmentStatus.SEALED, ShipmentStatus.FAILED],
    [ShipmentStatus.SEALED]: [], // Terminal state - no transitions allowed
    [ShipmentStatus.FAILED]: [], // Terminal state - no transitions allowed
  };

  constructor(private readonly shipmentsRepository: ShipmentsRepository) {}

  async create(createShipmentDto: CreateShipmentDto, createdById: string) {
    const existing = await this.shipmentsRepository.findByAwb(
      createShipmentDto.awb,
      createShipmentDto.organizationId,
    );

    if (existing) {
      throw new ConflictException(
        `Shipment with AWB ${createShipmentDto.awb} already exists for this organization`,
      );
    }

    return this.shipmentsRepository.create(createShipmentDto, createdById);
  }

  async findAll(organizationId?: string) {
    return this.shipmentsRepository.findAll(organizationId);
  }

  async findById(id: string) {
    const shipment = await this.shipmentsRepository.findById(id);

    if (!shipment) {
      throw new NotFoundException(`Shipment with ID ${id} not found`);
    }

    return shipment;
  }

  async update(id: string, updateShipmentDto: UpdateShipmentDto) {
    const shipment = await this.findById(id);

    // Prevent any modifications to sealed shipments
    if (shipment.status === ShipmentStatus.SEALED) {
      throw new BadRequestException(
        'Cannot modify a sealed shipment. Sealed shipments are immutable.',
      );
    }

    // If status is being updated, validate the transition
    if (updateShipmentDto.status) {
      this.validateStateTransition(shipment.status, updateShipmentDto.status);
    }

    return this.shipmentsRepository.update(id, updateShipmentDto);
  }

  /**
   * Validates if a state transition is allowed
   * @throws BadRequestException if transition is invalid
   */
  private validateStateTransition(
    currentStatus: ShipmentStatus,
    newStatus: ShipmentStatus,
  ): void {
    // Allow same status (idempotent updates)
    if (currentStatus === newStatus) {
      return;
    }

    const allowedTransitions = this.validTransitions[currentStatus];

    if (!allowedTransitions.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid state transition: Cannot move from ${currentStatus} to ${newStatus}. ` +
          `Allowed transitions: ${allowedTransitions.length > 0 ? allowedTransitions.join(', ') : 'None (terminal state)'}`,
      );
    }
  }
}
