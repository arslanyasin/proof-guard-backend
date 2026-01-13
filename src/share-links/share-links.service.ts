import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ShareLinksRepository } from './share-links.repository';
import { CreateShareLinkDto } from './dto/create-share-link.dto';
import { randomBytes } from 'crypto';

@Injectable()
export class ShareLinksService {
  constructor(private readonly shareLinksRepository: ShareLinksRepository) {}

  async create(createShareLinkDto: CreateShareLinkDto) {
    const token = this.generateToken();
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + createShareLinkDto.expiresInHours);

    return this.shareLinksRepository.create(
      createShareLinkDto.proofVideoId,
      token,
      expiresAt,
    );
  }

  async findAll(proofVideoId?: string) {
    return this.shareLinksRepository.findAll(proofVideoId);
  }

  async findById(id: string) {
    const shareLink = await this.shareLinksRepository.findById(id);

    if (!shareLink) {
      throw new NotFoundException(`Share link with ID ${id} not found`);
    }

    return shareLink;
  }

  async validateToken(token: string) {
    const shareLink = await this.shareLinksRepository.findByToken(token);

    if (!shareLink) {
      throw new NotFoundException('Invalid share link');
    }

    if (new Date() > shareLink.expiresAt) {
      throw new UnauthorizedException('Share link has expired');
    }

    return shareLink;
  }

  async delete(id: string) {
    await this.findById(id);
    return this.shareLinksRepository.delete(id);
  }

  async cleanupExpired() {
    return this.shareLinksRepository.deleteExpired();
  }

  private generateToken(): string {
    return randomBytes(32).toString('hex');
  }
}
