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
    expect(typeof fromFixture?.totalSteps).toBe('number');
    expect(typeof fromFixture?.totalDistanceKm).toBe('number');
  });

  it('returns totalSteps and totalDistanceKm from workouts linked to a shoe', async () => {
    const user = await prisma.user.findUnique({
      where: { email: THOMAS_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Integration test requires user ${THOMAS_EMAIL}; run test-migrations first`,
      );
    }

    const shoe = await shoesService.create(user.id, {
      photoUrl: 'https://example.com/agg-test.jpg',
      brandName: 'AggTest',
      shoeName: 'Aggregate Test Shoe',
      buyingDate: '2025-02-01',
      kilometerTarget: 600,
    });
    expect(shoe.totalSteps).toBe(0);
    expect(shoe.totalDistanceKm).toBe(0);

    const w1 = await prisma.workout.create({
      data: {
        userId: user.id,
        type: WorkoutType.RUNNING,
        startTime: new Date('2025-02-24T08:00:00.000Z'),
        endTime: new Date('2025-02-24T09:00:00.000Z'),
        steps: 2000,
        distanceKm: 4.5,
        location: 'Aggregate test 1',
        shoeId: shoe.id,
      },
    });
    const w2 = await prisma.workout.create({
      data: {
        userId: user.id,
        type: WorkoutType.RUNNING,
        startTime: new Date('2025-02-25T08:00:00.000Z'),
        endTime: new Date('2025-02-25T09:00:00.000Z'),
        steps: 3000,
        distanceKm: 6.2,
        location: 'Aggregate test 2',
        shoeId: shoe.id,
      },
    });

    try {
      const list = await shoesService.findAll(user.id);
      const found = list.find((s) => s.id === shoe.id);
      expect(found).toBeDefined();
      expect(found?.totalSteps).toBe(5000);
      expect(found?.totalDistanceKm).toBeCloseTo(10.7, 5);

      const one = await shoesService.findOne(shoe.id, user.id);
      expect(one.totalSteps).toBe(5000);
      expect(one.totalDistanceKm).toBeCloseTo(10.7, 5);
    } finally {
      await prisma.workout.deleteMany({
        where: { id: { in: [w1.id, w2.id] } },
      });
      await shoesService.remove(shoe.id, user.id);
    }
  });

  it('returns totalSteps 0 and totalDistanceKm 0 for shoe with no linked workouts', async () => {
    const user = await prisma.user.findUnique({
      where: { email: THOMAS_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Integration test requires user ${THOMAS_EMAIL}; run test-migrations first`,
      );
    }

    const list = await shoesService.findAll(user.id);
    expect(list.length).toBeGreaterThanOrEqual(1);
    for (const shoe of list) {
      expect(shoe.totalSteps).toBeGreaterThanOrEqual(0);
      expect(shoe.totalDistanceKm).toBeGreaterThanOrEqual(0);
    }
    const shoeWithNoWorkouts = await shoesService.create(user.id, {
      photoUrl: 'https://example.com/no-workouts.jpg',
      brandName: 'NoWorkouts',
      shoeName: 'Shoe With No Workouts',
      buyingDate: '2025-02-01',
      kilometerTarget: 500,
    });
    expect(shoeWithNoWorkouts.totalSteps).toBe(0);
    expect(shoeWithNoWorkouts.totalDistanceKm).toBe(0);

    const listAfter = await shoesService.findAll(user.id);
    const found = listAfter.find((s) => s.id === shoeWithNoWorkouts.id);
    expect(found?.totalSteps).toBe(0);
    expect(found?.totalDistanceKm).toBe(0);

    await shoesService.remove(shoeWithNoWorkouts.id, user.id);
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

  it('set default: PATCH isDefault true sets shoe as default and list returns it', async () => {
    const user = await prisma.user.findUnique({
      where: { email: THOMAS_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Integration test requires user ${THOMAS_EMAIL}; run test-migrations first`,
      );
    }
    await prisma.shoe.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
    const shoes = await shoesService.findAll(user.id);
    const shoe = shoes[0];
    if (!shoe) throw new Error('Need at least one shoe for thomas');

    const updated = await shoesService.update(shoe.id, user.id, {
      isDefault: true,
    });
    expect(updated.isDefault).toBe(true);

    const list = await shoesService.findAll(user.id);
    const defaultInList = list.find((s) => s.isDefault);
    expect(defaultInList).toBeDefined();
    expect(defaultInList?.id).toBe(shoe.id);
    expect(defaultInList?.isDefault).toBe(true);

    await shoesService.update(shoe.id, user.id, { isDefault: false });
  });

  it('change default: setting another shoe as default clears previous default', async () => {
    const user = await prisma.user.findUnique({
      where: { email: THOMAS_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Integration test requires user ${THOMAS_EMAIL}; run test-migrations first`,
      );
    }
    await prisma.shoe.updateMany({
      where: { userId: user.id },
      data: { isDefault: false },
    });
    let shoes = await shoesService.findAll(user.id);
    let createdSecondId: number | null = null;
    if (shoes.length < 2) {
      const extra = await shoesService.create(user.id, {
        photoUrl: 'https://example.com/second.jpg',
        brandName: 'Second',
        shoeName: 'Second Shoe',
        buyingDate: '2025-02-01',
        kilometerTarget: 500,
      });
      createdSecondId = extra.id;
      shoes = await shoesService.findAll(user.id);
    }
    const [first, second] = shoes.slice(0, 2);

    await shoesService.update(first.id, user.id, { isDefault: true });
    let list = await shoesService.findAll(user.id);
    expect(list.find((s) => s.id === first.id)?.isDefault).toBe(true);
    expect(list.find((s) => s.id === second.id)?.isDefault).toBe(false);

    await shoesService.update(second.id, user.id, { isDefault: true });
    list = await shoesService.findAll(user.id);
    expect(list.find((s) => s.id === first.id)?.isDefault).toBe(false);
    expect(list.find((s) => s.id === second.id)?.isDefault).toBe(true);

    await shoesService.update(second.id, user.id, { isDefault: false });
    if (createdSecondId) {
      await shoesService.remove(createdSecondId, user.id);
    }
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
