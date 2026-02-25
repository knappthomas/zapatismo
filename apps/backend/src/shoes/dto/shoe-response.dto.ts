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

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
