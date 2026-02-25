import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsDataURI, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CreateShoeDto {
  @ApiProperty({ example: 'Tempo Trainer v1' })
  @IsString()
  @MinLength(2)
  @MaxLength(120)
  name!: string;

  @ApiPropertyOptional({ example: 'Nike' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  brand?: string;

  @ApiPropertyOptional({ example: 'Zoom Fly 5' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  model?: string;

  @ApiPropertyOptional({ example: 'Blue / White' })
  @IsOptional()
  @IsString()
  @MaxLength(120)
  color?: string;

  @ApiPropertyOptional({ example: 'Used for interval sessions and races up to 10K.' })
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  notes?: string;

  @ApiPropertyOptional({
    description: 'Image encoded as data URL',
    example: 'data:image/jpeg;base64,/9j/4AAQSk...',
  })
  @IsOptional()
  @IsDataURI()
  @MaxLength(7_000_000)
  photoDataUrl?: string;
}
