import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ShoeResponseDto {
  @ApiProperty()
  id!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional()
  brand!: string | null;

  @ApiPropertyOptional()
  model!: string | null;

  @ApiPropertyOptional()
  color!: string | null;

  @ApiPropertyOptional()
  notes!: string | null;

  @ApiPropertyOptional({
    description: 'Image encoded as data URL',
    example: 'data:image/jpeg;base64,/9j/4AAQSk...',
  })
  photoDataUrl!: string | null;

  @ApiProperty()
  createdAt!: Date;

  @ApiProperty()
  updatedAt!: Date;
}
