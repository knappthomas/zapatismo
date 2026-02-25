import { ApiProperty } from '@nestjs/swagger';

export class StravaStatusDto {
  @ApiProperty({ description: 'Whether the user has connected their Strava account' })
  connected!: boolean;
}
