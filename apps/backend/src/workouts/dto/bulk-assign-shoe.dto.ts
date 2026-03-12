import { ApiProperty } from '@nestjs/swagger';
import { ArrayMinSize, IsArray, IsInt, Min } from 'class-validator';

export class BulkAssignShoeDto {
  @ApiProperty({
    description: 'Ids of workouts to assign the shoe to (must all belong to the current user)',
    example: [1, 2, 3],
    type: [Number],
    minItems: 1,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsInt({ each: true })
  workoutIds!: number[];

  @ApiProperty({
    description: 'Id of the shoe to assign (must belong to the current user)',
    example: 1,
    minimum: 1,
  })
  @IsInt()
  @Min(1)
  shoeId!: number;
}
