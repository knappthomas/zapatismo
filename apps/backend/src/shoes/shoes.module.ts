import { Module } from '@nestjs/common';
import { ShoesController } from './shoes.controller';
import { ShoesService } from './shoes.service';

@Module({
  controllers: [ShoesController],
  providers: [ShoesService],
  exports: [ShoesService],
})
export class ShoesModule {}
