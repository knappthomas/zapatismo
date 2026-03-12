import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { WorkoutType } from '@prisma/client';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { WorkoutsService } from '../src/workouts/workouts.service';

/**
 * Integration tests for workout CRUD. Require MySQL and DATABASE_URL.
 * Test-migrations (00002_thomas_user, 00003_shoes_for_thomas, 00004_workouts_for_thomas)
 * must be applied so thomas@zapatismo.local exists with shoes and workouts.
 */
describe('Workouts integration (DB)', () => {
  let prisma: PrismaService;
  let workoutsService: WorkoutsService;
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
      providers: [WorkoutsService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    workoutsService = module.get<WorkoutsService>(WorkoutsService);
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('lists workouts for thomas user (from test-migrations)', async () => {
    const user = await prisma.user.findUnique({
      where: { email: THOMAS_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Integration test requires user ${THOMAS_EMAIL}; run test-migrations first (npm run prisma:test-migrations)`,
      );
    }

    const list = await workoutsService.findAll(user.id);
    expect(Array.isArray(list)).toBe(true);
    expect(list.length).toBeGreaterThanOrEqual(1);
    const fromFixture = list.find((w) => w.location === 'Villach Park');
    expect(fromFixture).toBeDefined();
    expect(fromFixture?.type).toBe(WorkoutType.RUNNING);
    expect(fromFixture?.steps).toBe(12000);
    expect(fromFixture?.distanceKm).toBe(12.5);
    expect(fromFixture?.userId).toBe(user.id);
  });

  it('create, findOne, update, remove workout for thomas (with and without shoe)', async () => {
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

    const created = await workoutsService.create(user.id, {
      type: WorkoutType.RUNNING,
      startTime: '2025-02-24T08:00:00.000Z',
      endTime: '2025-02-24T09:00:00.000Z',
      steps: 6000,
      distanceKm: 8.0,
      location: 'Integration Test Run',
      shoeId: shoe?.id,
    });
    expect(created.id).toBeDefined();
    expect(created.location).toBe('Integration Test Run');
    expect(created.userId).toBe(user.id);
    if (shoe) {
      expect(created.shoeId).toBe(shoe.id);
      expect(created.shoe?.brandName).toBeDefined();
    }

    const one = await workoutsService.findOne(created.id, user.id);
    expect(one.id).toBe(created.id);
    expect(one.distanceKm).toBe(8.0);

    const updated = await workoutsService.update(
      created.id,
      user.id,
      { steps: 6500, location: 'Updated Integration Run' },
    );
    expect(updated.steps).toBe(6500);
    expect(updated.location).toBe('Updated Integration Run');

    await workoutsService.remove(created.id, user.id);
    const listAfter = await workoutsService.findAll(user.id);
    const gone = listAfter.find((w) => w.id === created.id);
    expect(gone).toBeUndefined();
  });

  it('create workout without shoe (optional shoeId)', async () => {
    const user = await prisma.user.findUnique({
      where: { email: THOMAS_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Integration test requires user ${THOMAS_EMAIL}; run test-migrations first`,
      );
    }

    const created = await workoutsService.create(user.id, {
      type: WorkoutType.WALKING,
      startTime: '2025-02-23T10:00:00.000Z',
      endTime: '2025-02-23T11:00:00.000Z',
      steps: 4000,
      distanceKm: 3.5,
      location: 'No Shoe Walk',
    });
    expect(created.id).toBeDefined();
    expect(created.shoeId).toBeUndefined();
    expect(created.shoe).toBeUndefined();

    await workoutsService.remove(created.id, user.id);
  });

  it('rejects create when shoeId is not user’s shoe', async () => {
    const user = await prisma.user.findUnique({
      where: { email: THOMAS_EMAIL },
    });
    if (!user) {
      throw new Error(
        `Integration test requires user ${THOMAS_EMAIL}; run test-migrations first`,
      );
    }

    try {
      await workoutsService.create(user.id, {
        type: WorkoutType.RUNNING,
        startTime: '2025-02-25T08:00:00.000Z',
        endTime: '2025-02-25T09:00:00.000Z',
        steps: 1000,
        distanceKm: 1,
        location: 'Test',
        shoeId: 99999,
      });
      fail('expected BadRequestException');
    } catch (e) {
      expect((e as Error).message).toContain('Shoe not found or does not belong to user');
    }
  });

  it('bulkAssignShoe: assigns one shoe to multiple workouts and persists', async () => {
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
      throw new Error('Integration test requires at least one shoe for thomas; run test-migrations');
    }

    const workouts = await prisma.workout.findMany({
      where: { userId: user.id },
      take: 2,
      orderBy: { id: 'asc' },
    });
    if (workouts.length < 2) {
      const w1 = await workoutsService.create(user.id, {
        type: WorkoutType.RUNNING,
        startTime: '2025-02-20T08:00:00.000Z',
        endTime: '2025-02-20T09:00:00.000Z',
        steps: 5000,
        distanceKm: 5,
        location: 'Bulk test 1',
      });
      const w2 = await workoutsService.create(user.id, {
        type: WorkoutType.WALKING,
        startTime: '2025-02-21T10:00:00.000Z',
        endTime: '2025-02-21T11:00:00.000Z',
        steps: 3000,
        distanceKm: 2.5,
        location: 'Bulk test 2',
      });
      workouts.length = 0;
      workouts.push(
        await prisma.workout.findUniqueOrThrow({ where: { id: w1.id } }),
        await prisma.workout.findUniqueOrThrow({ where: { id: w2.id } }),
      );
    }

    const workoutIds = workouts.map((w) => w.id);
    const result = await workoutsService.bulkAssignShoe(user.id, {
      workoutIds,
      shoeId: shoe.id,
    });

    expect(result.length).toBe(workoutIds.length);
    for (const dto of result) {
      expect(dto.shoeId).toBe(shoe.id);
      expect(dto.shoe).toBeDefined();
      expect(dto.shoe?.id).toBe(shoe.id);
      expect(dto.shoe?.brandName).toBe(shoe.brandName);
      expect(dto.shoe?.shoeName).toBe(shoe.shoeName);
    }

    const after = await prisma.workout.findMany({
      where: { id: { in: workoutIds } },
      include: { shoe: true },
    });
    for (const w of after) {
      expect(w.shoeId).toBe(shoe.id);
      expect(w.shoe?.id).toBe(shoe.id);
    }
  });
});
