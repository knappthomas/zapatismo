import { ApiPropertyOptional } from '@nestjs/swagger';

export class LastSyncResponseDto {
  @ApiPropertyOptional({
    description: 'ISO date of last successful sync, or null if never synced',
    example: '2025-02-20T14:30:00.000Z',
    nullable: true,
  })
  lastSyncAt!: string | null;
}
