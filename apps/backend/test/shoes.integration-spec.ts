import { ConflictException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { WorkoutType } from '@prisma/client';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ShoesService } from '../src/shoes/shoes.service';

/**
 * Integration tests for shoe CRUD. Require MySQL and DATABASE_URL.
 * Test-migrations (00002_thomas_user, 00003_shoes_for_thomas) must be applied
 * so thomas@zapatismo.local exists with at least one shoe.
 */
describe('Shoes integration (DB)', () => {
  let prisma: PrismaService;
  let shoesService: ShoesService;
  const THOMAS_EMAIL = 'thomas@zapatismo.local';

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env', '.env.development'],
        }),
        PrismaModule,
      ],
      providers: [ShoesService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    shoesService = module.get<ShoesService>(ShoesService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists shoes for thomas user (from test-migrations)', async () => {
    const user = await prisma.user.findUnique({
      where: { email: THOMAS_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Integration test requires user ${THOMAS_EMAIL}; run test-migrations first (npm run prisma:test-migrations)`,
      );
    }

    const list = await shoesService.findAll(user.id);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
    const fromFixture = list.find((s) => s.shoeName === 'Gel-Kayano 32');
    expect(fromFixture).toBeDefined();
    expect(fromFixture?.brandName).toBe('Asics');
    expect(fromFixture?.kilometerTarget).toBe(800);
    expect(fromFixture?.userId).toBe(user.id);
  });

  it('create, findOne, update, remove shoe for thomas', async () => {
    const user = await prisma.user.findUnique({
      where: { email: THOMAS_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Integration test requires user ${THOMAS_EMAIL}; run test-migrations first`,
      );
    }

    const created = await shoesService.create(user.id, {
      photoUrl: 'https://example.com/integration-shoe.jpg',
      brandName: 'Integration Brand',
      shoeName: 'Integration Test Shoe',
      buyingDate: '2025-02-01',
      buyingLocation: 'Munich',
      kilometerTarget: 500,
    });
    expect(created.id).toBeDefined();
    expect(created.shoeName).toBe('Integration Test Shoe');
    expect(created.userId).toBe(user.id);

    const one = await shoesService.findOne(created.id, user.id);
    expect(one.id).toBe(created.id);
    expect(one.brandName).toBe('Integration Brand');

    const updated = await shoesService.update(
      created.id,
      user.id,
      { kilometerTarget: 600 },
    );
    expect(updated.kilometerTarget).toBe(600);

    await shoesService.remove(created.id, user.id);
    const listAfter = await shoesService.findAll(user.id);
    const gone = listAfter.find((s) => s.id === created.id);
    expect(gone).toBeUndefined();
  });

  it('rejects shoe delete with 409 when shoe is linked to workouts', async () => {
    const user = await prisma.user.findUnique({
      where: { email: THOMAS_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Integration test requires user ${THOMAS_EMAIL}; run test-migrations first`,
      );
    }

    const shoe = await prisma.shoe.findFirst({
      where: { userId: user.id },
    });
    if (!shoe) {
      throw new Error('Need at least one shoe for thomas from test-migrations');
    }

    const workout = await prisma.workout.create({
      data: {
        userId: user.id,
        type: WorkoutType.RUNNING,
        startTime: new Date('2025-02-25T08:00:00.000Z'),
        endTime: new Date('2025-02-25T09:00:00.000Z'),
        steps: 1000,
        distanceKm: 2,
        location: 'Shoe delete 409 test',
        shoeId: shoe.id,
      },
    });

    try {
      await shoesService.remove(shoe.id, user.id);
      fail('expected ConflictException');
    } catch (e) {
      expect(e).toBeInstanceOf(ConflictException);
    }

    const shoeStillExists = await prisma.shoe.findUnique({
      where: { id: shoe.id },
    });
    expect(shoeStillExists).not.toBeNull();

    await prisma.workout.delete({ where: { id: workout.id } });
  });
});
