import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

/**
 * Minimal integration test: proves connection to MySQL and Prisma work.
 * Requires MySQL running (local or CI service container). DATABASE_URL must be set.
 */
describe('Database integration', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env', '.env.development'],
        }),
        PrismaModule,
      ],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('connects to the database', async () => {
    await prisma.$connect();
    // If we get here without throwing, connection succeeded
  });

  it('can query the database (user count)', async () => {
    const count = await prisma.user.count();
    expect(typeof count).toBe('number');
    expect(count).toBeGreaterThanOrEqual(0);
  });
});
