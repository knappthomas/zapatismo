import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional } from 'class-validator';
import { PartialType } from '@nestjs/swagger';
import { CreateShoeDto } from './create-shoe.dto';

export class UpdateShoeDto extends PartialType(CreateShoeDto) {
  /** Set or clear this shoe as the user's default for Strava sync. At most one shoe per user can be default. */
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}
