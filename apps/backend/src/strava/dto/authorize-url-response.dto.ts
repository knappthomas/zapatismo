import { ApiProperty } from '@nestjs/swagger';

export class AuthorizeUrlResponseDto {
  @ApiProperty({ description: 'Strava OAuth authorize URL for redirect' })
  url!: string;
}
