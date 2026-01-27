import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { VideosController } from './videos.controller';
import { VideosService } from './videos.service';
import { VideosRepository } from './videos.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { ShipmentsModule } from '../shipments/shipments.module';

@Module({
  imports: [
    PrismaModule,
    ShipmentsModule,
    MulterModule.register({
      limits: {
        fileSize: 200 * 1024 * 1024, // 200MB limit (allows up to 200MB files)
      },
    }),
  ],
  controllers: [VideosController],
  providers: [VideosService, VideosRepository],
  exports: [VideosService],
})
export class VideosModule {}
