import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { UsersService } from '../src/users/users.service';

/**
 * Integration tests for user creation. Require MySQL and DATABASE_URL.
 */
describe('Users integration (DB)', () => {
  let prisma: PrismaService;
  let usersService: UsersService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env', '.env.development'],
        }),
        PrismaModule,
      ],
      providers: [UsersService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    usersService = module.get<UsersService>(UsersService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('creates user and persists to DB', async () => {
    const email = `create-user-integration-${Date.now()}@test.local`;

    const created = await usersService.create({
      email,
      password: 'integration-test-password-8',
    });

    expect(created.id).toBeDefined();
    expect(created.email).toBe(email);
    expect(created.role).toBe(Role.USER);
    expect(created.createdAt).toBeDefined();
    expect(created.updatedAt).toBeDefined();

    const inDb = await prisma.user.findUnique({
      where: { email },
    });
    expect(inDb).not.toBeNull();
    expect(inDb?.id).toBe(created.id);
    expect(inDb?.email).toBe(email);
    expect(inDb?.role).toBe(Role.USER);
    expect(inDb?.passwordHash).toMatch(/^\$2[ab]\$/);

    await prisma.user.delete({ where: { id: created.id } });
  });

  it('creates user with optional role and persists', async () => {
    const email = `create-user-admin-${Date.now()}@test.local`;

    const created = await usersService.create({
      email,
      password: 'adminpass123',
      role: Role.ADMIN,
    });

    expect(created.role).toBe(Role.ADMIN);

    const inDb = await prisma.user.findUnique({
      where: { email },
    });
    expect(inDb?.role).toBe(Role.ADMIN);

    await prisma.user.delete({ where: { id: created.id } });
  });

  it('throws ConflictException when creating user with existing email', async () => {
    const email = `create-user-conflict-${Date.now()}@test.local`;

    const created = await usersService.create({
      email,
      password: 'firstpass123',
    });

    try {
      await usersService.create({
        email,
        password: 'secondpass123',
      });
      fail('expected ConflictException');
    } catch (e) {
      expect(e).toBeInstanceOf(ConflictException);
    }

    await prisma.user.delete({ where: { id: created.id } });
  });
});
