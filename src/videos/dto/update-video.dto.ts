import { IsOptional, IsUrl } from 'class-validator';

export class UpdateVideoDto {
  @IsUrl()
  @IsOptional()
  videoUrl?: string;
}
