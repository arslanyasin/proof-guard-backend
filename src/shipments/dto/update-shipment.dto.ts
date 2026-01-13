import { IsEnum, IsOptional } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { ShipmentStatus } from '../../../generated/prisma';

export class UpdateShipmentDto {
  @ApiProperty({
    description: 'Shipment status (proof lifecycle)',
    enum: ShipmentStatus,
    example: ShipmentStatus.RECORDING,
    required: false,
  })
  @IsEnum(ShipmentStatus)
  @IsOptional()
  status?: ShipmentStatus;
}
