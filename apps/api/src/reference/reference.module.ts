import { Module } from '@nestjs/common';
import { ReferenceController } from './reference.controller.js';
import { ReferenceRepository } from './reference.repository.js';

@Module({
  controllers: [ReferenceController],
  providers: [ReferenceRepository],
})
export class ReferenceModule {}
