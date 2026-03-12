import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { PASSWORD_MIN_LENGTH } from '@zapatismo/validation-constants';

export class RegisterDto {
  @ApiProperty({ example: 'user@zapatismo.local' })
  @IsEmail()
  email!: string;

  @ApiProperty({ example: 'securePassword1', minLength: PASSWORD_MIN_LENGTH })
  @IsString()
  @IsNotEmpty()
  @MinLength(PASSWORD_MIN_LENGTH)
  password!: string;
}
