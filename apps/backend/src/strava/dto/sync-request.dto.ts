import { ApiProperty } from '@nestjs/swagger';
import { IsDateString } from 'class-validator';

export class SyncRequestDto {
  @ApiProperty({
    description: 'Start of date range (ISO date). Activities from this date until now are imported.',
    example: '2025-02-01',
  })
  @IsDateString()
  fromDate!: string;
}
