import { Test, TestingModule } from '@nestjs/testing';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService (unit)', () => {
  let service: UsersService;
  let prisma: PrismaService;

  const mockPrisma = {
    user: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('returns UserResponseDto and hashes password on success', async () => {
      const createdUser = {
        id: 1,
        email: 'newuser@example.com',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await service.create({
        email: 'newuser@example.com',
        password: 'password123',
      });

      expect(prisma.user.findUnique).toHaveBeenCalledWith({
        where: { email: 'newuser@example.com' },
      });
      expect(prisma.user.create).toHaveBeenCalledTimes(1);
      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.email).toBe('newuser@example.com');
      expect(createCall.data.role).toBeUndefined();
      expect(createCall.data.passwordHash).toMatch(/^\$2[ab]\$/);
      expect(createCall.data.passwordHash).not.toBe('password123');

      expect(result.id).toBe(1);
      expect(result.email).toBe('newuser@example.com');
      expect(result.role).toBe('USER');
      expect(result.createdAt).toEqual(createdUser.createdAt);
      expect(result.updatedAt).toEqual(createdUser.updatedAt);
    });

    it('passes optional role to create and returns it in response', async () => {
      const createdUser = {
        id: 2,
        email: 'admin@example.com',
        role: 'ADMIN',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findUnique.mockResolvedValue(null);
      mockPrisma.user.create.mockResolvedValue(createdUser);

      const result = await service.create({
        email: 'admin@example.com',
        password: 'adminpass8',
        role: Role.ADMIN,
      });

      const createCall = mockPrisma.user.create.mock.calls[0][0];
      expect(createCall.data.role).toBe('ADMIN');
      expect(result.role).toBe('ADMIN');
    });

    it('throws ConflictException when email already exists and does not call create', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({
        id: 1,
        email: 'existing@example.com',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      try {
        await service.create({
          email: 'existing@example.com',
          password: 'password123',
        });
        fail('expected ConflictException');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
        expect((e as Error).message).toContain('email already exists');
      }
      expect(prisma.user.create).not.toHaveBeenCalled();
    });
  });

  describe('findOne', () => {
    it('returns user when found', async () => {
      const user = {
        id: 1,
        email: 'u@example.com',
        role: 'USER',
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      mockPrisma.user.findUnique.mockResolvedValue(user);

      const result = await service.findOne(1);

      expect(prisma.user.findUnique).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(result.id).toBe(1);
      expect(result.email).toBe('u@example.com');
      expect(result.role).toBe('USER');
    });

    it('throws NotFoundException when user not found', async () => {
      mockPrisma.user.findUnique.mockResolvedValue(null);

      try {
        await service.findOne(999);
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect((e as Error).message).toContain('999');
      }
    });
  });
});
