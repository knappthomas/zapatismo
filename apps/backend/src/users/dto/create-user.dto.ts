import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsEnum, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Role } from '@prisma/client';
import { PASSWORD_MIN_LENGTH } from '@zapatismo/validation-constants';

export class CreateUserDto {
  @ApiProperty({ example: 'user@zapatismo.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePassword1', minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  password!: string;

  @ApiPropertyOptional({ enum: Role, default: Role.USER })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}
