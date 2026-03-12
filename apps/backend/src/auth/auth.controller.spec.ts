import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { Role } from '@prisma/client';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { LoginDto } from './dto/login.dto';
import { LoginResponseDto } from './dto/login-response.dto';
import { RegisterDto } from './dto/register.dto';

describe('AuthController (unit)', () => {
  let controller: AuthController;
  let usersService: UsersService;

  const mockAuthService = {
    login: jest.fn(),
  };

  const mockUsersService = {
    create: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthController],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: UsersService, useValue: mockUsersService },
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    usersService = module.get<UsersService>(UsersService);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('login', () => {
    it('delegates to AuthService and returns access token', async () => {
      const dto: LoginDto = { email: 'u@test.local', password: 'pass' };
      const response: LoginResponseDto = { accessToken: 'jwt-here' };
      mockAuthService.login.mockResolvedValue(response);

      const result = await controller.login(dto);

      expect(mockAuthService.login).toHaveBeenCalledWith(dto);
      expect(result).toEqual(response);
    });
  });

  describe('register', () => {
    it('calls UsersService.create with email, password, and role USER and returns 201-style body', async () => {
      const dto: RegisterDto = {
        email: 'newuser@test.local',
        password: 'password123',
      };
      mockUsersService.create.mockResolvedValue({
        id: 1,
        email: dto.email,
        role: Role.USER,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await controller.register(dto);

      expect(usersService.create).toHaveBeenCalledWith({
        email: dto.email,
        password: dto.password,
        role: Role.USER,
      });
      expect(result).toEqual({ message: 'Account created' });
    });

    it('returns 409 with message "This email is already registered" when UsersService throws ConflictException', async () => {
      const dto: RegisterDto = {
        email: 'existing@test.local',
        password: 'password123',
      };
      mockUsersService.create.mockRejectedValue(
        new ConflictException('A user with this email already exists'),
      );

      try {
        await controller.register(dto);
        fail('expected ConflictException');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
        expect((e as ConflictException).message).toBe(
          'This email is already registered',
        );
      }
      expect(usersService.create).toHaveBeenCalledWith({
        email: dto.email,
        password: dto.password,
        role: Role.USER,
      });
    });
  });
});
