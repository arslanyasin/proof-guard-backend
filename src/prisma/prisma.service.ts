import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // Pass the logging configuration to the base PrismaClient class
    super({
      log: [
        { emit: 'stdout', level: 'query' }, // See every SQL query sent to Postgres
        { emit: 'stdout', level: 'error' }, // See database errors (constraints, types, etc.)
        { emit: 'stdout', level: 'info' }, // General information
        { emit: 'stdout', level: 'warn' }, // Warnings
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
