import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrganizationDto {
  @ApiProperty({
    description: 'Organization name',
    example: 'Acme Logistics Inc.',
  })
  @IsString()
  @IsNotEmpty()
  name: string;
}
