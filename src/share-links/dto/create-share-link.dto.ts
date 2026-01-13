import { IsNotEmpty, IsUUID, IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateShareLinkDto {
  @ApiProperty({
    description: 'Proof video UUID to share',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsUUID()
  @IsNotEmpty()
  proofVideoId: string;

  @ApiProperty({
    description: 'Link expiration time in hours (minimum 1)',
    example: 24,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  expiresInHours: number;
}
