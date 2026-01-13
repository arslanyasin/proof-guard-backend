import { Module } from '@nestjs/common';
import { ShareLinksController } from './share-links.controller';
import { ShareLinksService } from './share-links.service';
import { ShareLinksRepository } from './share-links.repository';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [ShareLinksController],
  providers: [ShareLinksService, ShareLinksRepository],
  exports: [ShareLinksService],
})
export class ShareLinksModule {}
