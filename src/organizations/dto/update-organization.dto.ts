import { IsOptional, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Logistics Inc.',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;
}
