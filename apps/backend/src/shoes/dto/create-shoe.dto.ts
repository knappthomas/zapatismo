import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsDateString,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

export class CreateShoeDto {
  @ApiProperty({ example: 'https://example.com/shoe.jpg' })
  @IsUrl()
  @IsNotEmpty()
  photoUrl!: string;

  @ApiProperty({ example: 'Nike', maxLength: 75 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(75)
  brandName!: string;

  @ApiProperty({ example: 'Pegasus 40', maxLength: 75 })
  @IsString()
  @IsNotEmpty()
  @MaxLength(75)
  shoeName!: string;

  @ApiProperty({ example: '2024-01-15' })
  @IsDateString()
  buyingDate!: string;

  @ApiPropertyOptional({ example: 'Berlin' })
  @IsOptional()
  @IsString()
  buyingLocation?: string;

  @ApiProperty({ example: 800, minimum: 0, maximum: 100000 })
  @IsInt()
  @Min(0)
  @Max(100000)
  kilometerTarget!: number;
}
