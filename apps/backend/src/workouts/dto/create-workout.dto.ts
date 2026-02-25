import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { WorkoutType } from '@prisma/client';

export class CreateWorkoutDto {
  @ApiProperty({ enum: WorkoutType, example: 'RUNNING' })
  @IsEnum(WorkoutType)
  type!: WorkoutType;

  @ApiProperty({ example: '2025-02-25T08:00:00.000Z' })
  @IsDateString()
  startTime!: string;

  @ApiProperty({ example: '2025-02-25T09:30:00.000Z' })
  @IsDateString()
  endTime!: string;

  @ApiProperty({ example: 5000, minimum: 0, maximum: 100000 })
  @IsInt()
  @Min(0)
  @Max(100000)
  steps!: number;

  @ApiProperty({ example: 10.5, minimum: 0, maximum: 100000, description: 'Distance in km' })
  @IsNumber()
  @Min(0)
  @Max(100000)
  distanceKm!: number;

  @ApiProperty({ example: 'Central Park', maxLength: 50 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  location!: string;

  @ApiPropertyOptional({ example: 1, description: 'Id of user’s shoe' })
  @IsOptional()
  @IsInt()
  @Min(1)
  shoeId?: number;
}
