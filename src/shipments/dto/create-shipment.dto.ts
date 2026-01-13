import { IsNotEmpty, IsString, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShipmentDto {
  @ApiProperty({
    description: 'Air Waybill number (unique per organization)',
    example: 'AWB123456789',
  })
  @IsString()
  @IsNotEmpty()
  awb: string;

  @ApiProperty({
    description: 'Organization UUID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  organizationId: string;
}
