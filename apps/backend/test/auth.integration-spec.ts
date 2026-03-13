import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { Role } from '@prisma/client';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { AuthModule } from '../src/auth/auth.module';
import { AuthController } from '../src/auth/auth.controller';

/**
 * Integration tests for registration. Require MySQL and DATABASE_URL.
 * Exercise the registration path (AuthController.register -> UsersService.create) with real DB.
 */
describe('Auth registration integration (DB)', () => {
  let controller: AuthController;
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env', '.env.development'],
        }),
        PrismaModule,
        AuthModule,
      ],
    }).compile();

    controller = module.get<AuthController>(AuthController);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('POST register creates user with role USER and hashed password in DB', async () => {
    const email = `register-integration-${Date.now()}@test.local`;
    const password = 'integration-test-password-8';

    const result = await controller.register({ email, password });

    expect(result).toEqual({ message: 'Account created' });

    const inDb = await prisma.user.findUnique({
      where: { email },
    });
    expect(inDb).not.toBeNull();
    expect(inDb?.email).toBe(email);
    expect(inDb?.role).toBe(Role.USER);
    expect(inDb?.passwordHash).toMatch(/^\$2[ab]\$/);

    await prisma.user.delete({ where: { id: inDb!.id } });
  });

  it('POST register with duplicate email returns 409 and does not create duplicate user', async () => {
    const email = `register-duplicate-${Date.now()}@test.local`;
    const password = 'integration-test-password-8';

    await controller.register({ email, password });

    try {
      await controller.register({ email, password });
      fail('expected ConflictException');
    } catch (e) {
      expect(e).toBeInstanceOf(ConflictException);
      expect((e as ConflictException).message).toBe(
        'This email is already registered',
      );
    }

    const count = await prisma.user.count({ where: { email } });
    expect(count).toBe(1);

    const user = await prisma.user.findUnique({ where: { email } });
    await prisma.user.delete({ where: { id: user!.id } });
  });
});
