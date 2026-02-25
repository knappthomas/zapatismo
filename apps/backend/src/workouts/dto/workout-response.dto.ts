import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { WorkoutType } from '@prisma/client';

export class WorkoutShoeSummaryDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  brandName!: string;

  @ApiProperty()
  shoeName!: string;
}

export class WorkoutResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  userId!: number;

  @ApiProperty({ enum: WorkoutType })
  type!: WorkoutType;

  @ApiProperty()
  startTime!: Date;

  @ApiProperty()
  endTime!: Date;

  @ApiProperty()
  steps!: number;

  @ApiProperty()
  distanceKm!: number;

  @ApiProperty()
  location!: string;

  @ApiPropertyOptional()
  shoeId?: number | null;

  @ApiPropertyOptional({ type: WorkoutShoeSummaryDto })
  shoe?: WorkoutShoeSummaryDto | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
