import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  ConflictException,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
  ApiConflictResponse,
  ApiBadRequestResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';
import { RegisterResponseDto } from './dto/register-response.dto';
import { Public } from './decorators/public.decorator';
import { UsersService } from '../users/users.service';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOkResponse({ type: LoginResponseDto, description: 'JWT access token' })
  @ApiUnauthorizedResponse({ description: 'Invalid credentials' })
  async login(@Body() dto: LoginDto): Promise<LoginResponseDto> {
    return this.authService.login(dto);
  }

  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ApiCreatedResponse({
    type: RegisterResponseDto,
    description: 'Account created',
  })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiConflictResponse({ description: 'This email is already registered' })
  async register(@Body() dto: RegisterDto): Promise<RegisterResponseDto> {
    try {
      await this.usersService.create({
        email: dto.email,
        password: dto.password,
        role: Role.USER,
      });
      return { message: 'Account created' };
    } catch (e) {
      if (e instanceof ConflictException) {
        throw new ConflictException('This email is already registered');
      }
      throw e;
    }
  }
}
