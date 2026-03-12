import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShoeResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  userId!: number;

  @ApiProperty()
  photoUrl!: string;

  @ApiProperty()
  brandName!: string;

  @ApiProperty()
  shoeName!: string;

  @ApiProperty()
  buyingDate!: Date;

  @ApiPropertyOptional()
  buyingLocation?: string | null;

  @ApiProperty()
  kilometerTarget!: number;

  /** Total steps from all workouts linked to this shoe. */
  @ApiProperty()
  totalSteps!: number;

  /** Total distance (km) from all workouts linked to this shoe. */
  @ApiProperty()
  totalDistanceKm!: number;

  /** Whether this shoe is the user's default for running (Strava sync assigns new running workouts to it). At most one per user. */
  @ApiProperty()
  isDefaultForRunning!: boolean;

  /** Whether this shoe is the user's default for walking (Strava sync assigns new walking workouts to it). At most one per user. */
  @ApiProperty()
  isDefaultForWalking!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
