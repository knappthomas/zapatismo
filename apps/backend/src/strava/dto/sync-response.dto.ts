import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SyncResponseDto {
  @ApiProperty({ description: 'Number of workouts imported' })
  imported!: number;

  @ApiPropertyOptional({ description: 'Number of activities skipped (e.g. not running/walking)' })
  skipped?: number;

  @ApiPropertyOptional({ description: 'Optional message for the user' })
  message?: string;
}
