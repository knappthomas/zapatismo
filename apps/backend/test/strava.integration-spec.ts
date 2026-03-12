import { Test, TestingModule } from '@nestjs/testing';
import { ConfigModule } from '@nestjs/config';
import { WorkoutType } from '@prisma/client';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';
import { ShoesModule } from '../src/shoes/shoes.module';
import { ShoesService } from '../src/shoes/shoes.service';
import { WorkoutsModule } from '../src/workouts/workouts.module';
import { JwtModule } from '@nestjs/jwt';
import { StravaService } from '../src/strava/strava.service';
import { ConfigService } from '@nestjs/config';

/**
 * Integration tests for Strava sync and connection. Require MySQL and DATABASE_URL.
 * Test-migrations must be applied so thomas@zapatismo.local exists.
 * Strava HTTP is mocked via global fetch.
 */
describe('Strava integration (DB)', () => {
  let prisma: PrismaService;
  let shoesService: ShoesService;
  let stravaService: StravaService;
  let fetchMock: jest.SpyInstance;
  const THOMAS_EMAIL = 'thomas@zapatismo.local';

  beforeAll(async () => {
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() =>
      Promise.resolve(new Response()),
    );

    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: ['.env', '.env.development'],
        }),
        PrismaModule,
        ShoesModule,
        WorkoutsModule,
        JwtModule.registerAsync({
          inject: [ConfigService],
          useFactory: (config: ConfigService) => ({
            secret: config.getOrThrow<string>('JWT_SECRET'),
            signOptions: { expiresIn: '1h' },
          }),
        }),
      ],
      providers: [StravaService],
    }).compile();

    prisma = module.get<PrismaService>(PrismaService);
    shoesService = module.get<ShoesService>(ShoesService);
    stravaService = module.get<StravaService>(StravaService);
  });

  afterAll(async () => {
    fetchMock.mockRestore();
    await prisma.$disconnect();
  });

  it('getStatus returns connected false when no connection', async () => {
    const user = await prisma.user.findUnique({ where: { email: THOMAS_EMAIL } });
    if (!user) throw new Error(`Requires user ${THOMAS_EMAIL}; run test-migrations first`);

    await prisma.stravaConnection.deleteMany({ where: { userId: user.id } });
    const status = await stravaService.getStatus(user.id);
    expect(status.connected).toBe(false);
  });

  it('getStatus returns connected true after connection exists', async () => {
    const user = await prisma.user.findUnique({ where: { email: THOMAS_EMAIL } });
    if (!user) throw new Error(`Requires user ${THOMAS_EMAIL}; run test-migrations first`);

    await prisma.stravaConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stravaAthleteId: '999',
        refreshToken: 'rt',
        accessToken: 'at',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
      update: {},
    });

    const status = await stravaService.getStatus(user.id);
    expect(status.connected).toBe(true);
  });

  it('sync imports activities and updates lastStravaSyncAt; second sync does not duplicate', async () => {
    const user = await prisma.user.findUnique({ where: { email: THOMAS_EMAIL } });
    if (!user) throw new Error(`Requires user ${THOMAS_EMAIL}; run test-migrations first`);

    await prisma.stravaConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stravaAthleteId: '999',
        refreshToken: 'rt',
        accessToken: 'at',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
      update: {},
    });

    const activityPayload = [
      {
        id: 888,
        type: 'Run',
        name: 'Integration Test Run',
        distance: 6000,
        moving_time: 2400,
        start_date: '2025-02-18T08:00:00Z',
      },
    ];

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('athlete/activities')) {
        return Promise.resolve(
          new Response(JSON.stringify(activityPayload), { status: 200 }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const result1 = await stravaService.sync(user.id, '2025-02-01');
    expect(result1.imported).toBe(1);

    const workout = await prisma.workout.findFirst({
      where: { userId: user.id, externalId: '888' },
    });
    expect(workout).toBeDefined();
    expect(workout?.type).toBe(WorkoutType.RUNNING);
    expect(workout?.distanceKm).toBe(6);

    const updatedUser = await prisma.user.findUnique({
      where: { id: user.id },
      select: { lastStravaSyncAt: true },
    });
    expect(updatedUser?.lastStravaSyncAt).toBeDefined();

    const result2 = await stravaService.sync(user.id, '2025-02-01');
    expect(result2.imported).toBe(0);

    const workoutCount = await prisma.workout.count({
      where: { userId: user.id, externalId: '888' },
    });
    expect(workoutCount).toBe(1);

    await prisma.workout.deleteMany({ where: { userId: user.id, externalId: '888' } });
  });

  it('getLastSyncAt returns null when never synced', async () => {
    const user = await prisma.user.findUnique({ where: { email: THOMAS_EMAIL } });
    if (!user) throw new Error(`Requires user ${THOMAS_EMAIL}; run test-migrations first`);

    await prisma.user.update({
      where: { id: user.id },
      data: { lastStravaSyncAt: null },
    });

    const lastSync = await stravaService.getLastSyncAt(user.id);
    expect(lastSync.lastSyncAt).toBeNull();
  });

  it('sync with default running shoe set assigns running workout to that shoe', async () => {
    const user = await prisma.user.findUnique({ where: { email: THOMAS_EMAIL } });
    if (!user) throw new Error(`Requires user ${THOMAS_EMAIL}; run test-migrations first`);

    const shoe = await prisma.shoe.findFirst({ where: { userId: user.id } });
    if (!shoe) throw new Error('Need at least one shoe for thomas from test-migrations');

    await prisma.stravaConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stravaAthleteId: '999',
        refreshToken: 'rt',
        accessToken: 'at',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
      update: {},
    });

    await shoesService.update(shoe.id, user.id, { isDefaultForRunning: true });
    expect(await shoesService.findDefaultRunningShoeId(user.id)).toBe(shoe.id);
    expect(await shoesService.findDefaultWalkingShoeId(user.id)).toBeNull();

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('athlete/activities')) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: 777,
                type: 'Run',
                name: 'Default Shoe Run',
                distance: 5000,
                moving_time: 1800,
                start_date: '2025-02-19T08:00:00Z',
              },
            ]),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const result = await stravaService.sync(user.id, '2025-02-01');
    expect(result.imported).toBe(1);

    const workout = await prisma.workout.findFirst({
      where: { userId: user.id, externalId: '777' },
    });
    expect(workout).toBeDefined();
    expect(workout?.shoeId).toBe(shoe.id);

    await shoesService.update(shoe.id, user.id, { isDefaultForRunning: false });
    await prisma.workout.deleteMany({ where: { userId: user.id, externalId: '777' } });
  });

  it('sync with default walking shoe only: walking workout gets shoe, running has no shoe', async () => {
    const user = await prisma.user.findUnique({ where: { email: THOMAS_EMAIL } });
    if (!user) throw new Error(`Requires user ${THOMAS_EMAIL}; run test-migrations first`);

    const shoe = await prisma.shoe.findFirst({ where: { userId: user.id } });
    if (!shoe) throw new Error('Need at least one shoe for thomas from test-migrations');

    await prisma.stravaConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stravaAthleteId: '999',
        refreshToken: 'rt',
        accessToken: 'at',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
      update: {},
    });

    await prisma.shoe.updateMany({
      where: { userId: user.id },
      data: { isDefaultForRunning: false, isDefaultForWalking: false },
    });
    await shoesService.update(shoe.id, user.id, { isDefaultForWalking: true });
    expect(await shoesService.findDefaultWalkingShoeId(user.id)).toBe(shoe.id);
    expect(await shoesService.findDefaultRunningShoeId(user.id)).toBeNull();

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('athlete/activities')) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { id: 778, type: 'Run', name: 'Run', distance: 4000, moving_time: 1200, start_date: '2025-02-19T09:00:00Z' },
              { id: 779, type: 'Walk', name: 'Walk', distance: 1500, moving_time: 500, start_date: '2025-02-19T10:00:00Z' },
            ]),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const result = await stravaService.sync(user.id, '2025-02-01');
    expect(result.imported).toBe(2);

    const runWorkout = await prisma.workout.findFirst({ where: { userId: user.id, externalId: '778' } });
    const walkWorkout = await prisma.workout.findFirst({ where: { userId: user.id, externalId: '779' } });
    expect(runWorkout?.shoeId).toBeNull();
    expect(walkWorkout?.shoeId).toBe(shoe.id);

    await shoesService.update(shoe.id, user.id, { isDefaultForWalking: false });
    await prisma.workout.deleteMany({ where: { userId: user.id, externalId: { in: ['778', '779'] } } });
  });

  it('sync with both default running and walking shoes: each type gets correct shoe', async () => {
    const user = await prisma.user.findUnique({ where: { email: THOMAS_EMAIL } });
    if (!user) throw new Error(`Requires user ${THOMAS_EMAIL}; run test-migrations first`);

    let shoes = await shoesService.findAll(user.id);
    if (shoes.length < 2) {
      await shoesService.create(user.id, {
        photoUrl: 'https://example.com/walk-shoe.jpg',
        brandName: 'WalkBrand',
        shoeName: 'Walk Shoe',
        buyingDate: '2025-02-01',
        kilometerTarget: 400,
      });
      shoes = await shoesService.findAll(user.id);
    }
    const [runningShoe, walkingShoe] = shoes.slice(0, 2);
    await shoesService.update(runningShoe.id, user.id, { isDefaultForRunning: true });
    await shoesService.update(walkingShoe.id, user.id, { isDefaultForWalking: true });
    expect(await shoesService.findDefaultRunningShoeId(user.id)).toBe(runningShoe.id);
    expect(await shoesService.findDefaultWalkingShoeId(user.id)).toBe(walkingShoe.id);

    await prisma.stravaConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stravaAthleteId: '999',
        refreshToken: 'rt',
        accessToken: 'at',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
      update: {},
    });

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('athlete/activities')) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              { id: 780, type: 'Run', name: 'Run', distance: 5000, moving_time: 1800, start_date: '2025-02-19T11:00:00Z' },
              { id: 781, type: 'Walk', name: 'Walk', distance: 2000, moving_time: 600, start_date: '2025-02-19T12:00:00Z' },
            ]),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const result = await stravaService.sync(user.id, '2025-02-01');
    expect(result.imported).toBe(2);

    const runWorkout = await prisma.workout.findFirst({ where: { userId: user.id, externalId: '780' } });
    const walkWorkout = await prisma.workout.findFirst({ where: { userId: user.id, externalId: '781' } });
    expect(runWorkout?.shoeId).toBe(runningShoe.id);
    expect(walkWorkout?.shoeId).toBe(walkingShoe.id);

    await shoesService.update(runningShoe.id, user.id, { isDefaultForRunning: false });
    await shoesService.update(walkingShoe.id, user.id, { isDefaultForWalking: false });
    await prisma.workout.deleteMany({ where: { userId: user.id, externalId: { in: ['780', '781'] } } });
  });

  it('sync with no default walking shoe: walking workout created with shoeId null', async () => {
    const user = await prisma.user.findUnique({ where: { email: THOMAS_EMAIL } });
    if (!user) throw new Error(`Requires user ${THOMAS_EMAIL}; run test-migrations first`);

    await prisma.shoe.updateMany({
      where: { userId: user.id },
      data: { isDefaultForRunning: false, isDefaultForWalking: false },
    });
    await prisma.stravaConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stravaAthleteId: '999',
        refreshToken: 'rt',
        accessToken: 'at',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
      update: {},
    });

    fetchMock.mockImplementation((url: string) => {
      if (url.includes('athlete/activities')) {
        return Promise.resolve(
          new Response(
            JSON.stringify([
              {
                id: 666,
                type: 'Walk',
                name: 'No Default Walk',
                distance: 2000,
                moving_time: 600,
                start_date: '2025-02-20T09:00:00Z',
              },
            ]),
            { status: 200 },
          ),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const result = await stravaService.sync(user.id, '2025-02-01');
    expect(result.imported).toBe(1);

    const workout = await prisma.workout.findFirst({
      where: { userId: user.id, externalId: '666' },
    });
    expect(workout).toBeDefined();
    expect(workout?.shoeId).toBeNull();

    await prisma.workout.deleteMany({ where: { userId: user.id, externalId: '666' } });
  });

  it('re-sync same range does not change existing workout shoeId', async () => {
    const user = await prisma.user.findUnique({ where: { email: THOMAS_EMAIL } });
    if (!user) throw new Error(`Requires user ${THOMAS_EMAIL}; run test-migrations first`);

    const shoe = await prisma.shoe.findFirst({ where: { userId: user.id } });
    if (!shoe) throw new Error('Need at least one shoe for thomas');

    await prisma.stravaConnection.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        stravaAthleteId: '999',
        refreshToken: 'rt',
        accessToken: 'at',
        expiresAt: new Date(Date.now() + 3600 * 1000),
      },
      update: {},
    });

    const activityPayload = [
      {
        id: 555,
        type: 'Run',
        name: 'Re-sync Run',
        distance: 4000,
        moving_time: 1200,
        start_date: '2025-02-21T07:00:00Z',
      },
    ];
    fetchMock.mockImplementation((url: string) => {
      if (url.includes('athlete/activities')) {
        return Promise.resolve(
          new Response(JSON.stringify(activityPayload), { status: 200 }),
        );
      }
      return Promise.resolve(new Response(JSON.stringify({}), { status: 200 }));
    });

    const r1 = await stravaService.sync(user.id, '2025-02-01');
    expect(r1.imported).toBe(1);
    const w = await prisma.workout.findFirst({
      where: { userId: user.id, externalId: '555' },
    });
    expect(w?.shoeId).toBeNull();

    await shoesService.update(shoe.id, user.id, { isDefaultForRunning: true });
    const r2 = await stravaService.sync(user.id, '2025-02-01');
    expect(r2.imported).toBe(0);
    const w2 = await prisma.workout.findFirst({
      where: { userId: user.id, externalId: '555' },
    });
    expect(w2?.shoeId).toBeNull();

    await shoesService.update(shoe.id, user.id, { isDefaultForRunning: false });
    await prisma.workout.deleteMany({ where: { userId: user.id, externalId: '555' } });
  });
});
