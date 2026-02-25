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

  /** Whether this shoe is the user's default for Strava sync (at most one per user). */
  @ApiProperty()
  isDefault!: boolean;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
