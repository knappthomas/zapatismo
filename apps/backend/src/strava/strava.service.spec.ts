import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkoutType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ShoesService } from '../shoes/shoes.service';
import { WorkoutsService } from '../workouts/workouts.service';
import { StravaService } from './strava.service';

describe('StravaService (unit)', () => {
  let service: StravaService;
  let prisma: PrismaService;
  let workoutsService: WorkoutsService;
  let fetchMock: jest.SpyInstance;

  const mockConfig = {
    get: jest.fn((key: string) => {
      const map: Record<string, string> = {
        STRAVA_CLIENT_ID: 'client-id',
        STRAVA_CLIENT_SECRET: 'secret',
        STRAVA_CALLBACK_URL: 'http://localhost:3000/api/strava/callback',
        FRONTEND_URL: 'http://localhost:4200',
        JWT_SECRET: 'test-secret',
      };
      return map[key];
    }),
  };

  const mockJwt = {
    sign: jest.fn(() => 'signed-state'),
    verify: jest.fn((token: string) => ({ sub: 1 })),
  };

  const mockPrisma = {
    stravaConnection: {
      findUnique: jest.fn(),
      upsert: jest.fn(),
      delete: jest.fn(),
      deleteMany: jest.fn(),
      update: jest.fn(),
    },
    user: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  const mockShoesService = {
    findDefaultShoeId: jest.fn(),
  };

  const mockWorkoutsService = {
    createByExternalId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    mockShoesService.findDefaultShoeId.mockResolvedValue(null);
    fetchMock = jest.spyOn(global, 'fetch').mockImplementation(() => Promise.resolve(new Response()));

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        StravaService,
        { provide: ConfigService, useValue: mockConfig },
        { provide: JwtService, useValue: mockJwt },
        { provide: PrismaService, useValue: mockPrisma },
        { provide: ShoesService, useValue: mockShoesService },
        { provide: WorkoutsService, useValue: mockWorkoutsService },
      ],
    }).compile();

    service = module.get<StravaService>(StravaService);
    prisma = module.get<PrismaService>(PrismaService);
    workoutsService = module.get<WorkoutsService>(WorkoutsService);
  });

  afterEach(() => {
    fetchMock.mockRestore();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('mapStravaTypeToWorkoutType', () => {
    it('maps Run to RUNNING', () => {
      expect(service.mapStravaTypeToWorkoutType('Run')).toBe(WorkoutType.RUNNING);
    });

    it('maps VirtualRun to RUNNING', () => {
      expect(service.mapStravaTypeToWorkoutType('VirtualRun')).toBe(WorkoutType.RUNNING);
    });

    it('maps Walk to WALKING', () => {
      expect(service.mapStravaTypeToWorkoutType('Walk')).toBe(WorkoutType.WALKING);
    });

    it('maps Hike to WALKING', () => {
      expect(service.mapStravaTypeToWorkoutType('Hike')).toBe(WorkoutType.WALKING);
    });

    it('returns null for Ride', () => {
      expect(service.mapStravaTypeToWorkoutType('Ride')).toBeNull();
    });

    it('returns null for Swim', () => {
      expect(service.mapStravaTypeToWorkoutType('Swim')).toBeNull();
    });

    it('returns null for empty or unknown type', () => {
      expect(service.mapStravaTypeToWorkoutType('')).toBeNull();
      expect(service.mapStravaTypeToWorkoutType('Other')).toBeNull();
    });
  });

  describe('getStatus', () => {
    it('returns connected true when connection exists', async () => {
      mockPrisma.stravaConnection.findUnique.mockResolvedValue({ id: 1 });

      const result = await service.getStatus(1);

      expect(result.connected).toBe(true);
      expect(prisma.stravaConnection.findUnique).toHaveBeenCalledWith({
        where: { userId: 1 },
      });
    });

    it('returns connected false when no connection', async () => {
      mockPrisma.stravaConnection.findUnique.mockResolvedValue(null);

      const result = await service.getStatus(1);

      expect(result.connected).toBe(false);
    });
  });

  describe('getLastSyncAt', () => {
    it('returns lastSyncAt when user has synced', async () => {
      const date = new Date('2025-02-20T14:30:00.000Z');
      mockPrisma.user.findUnique.mockResolvedValue({ lastStravaSyncAt: date });

      const result = await service.getLastSyncAt(1);

      expect(result.lastSyncAt).toBe(date.toISOString());
    });

    it('returns null when user never synced', async () => {
      mockPrisma.user.findUnique.mockResolvedValue({ lastStravaSyncAt: null });

      const result = await service.getLastSyncAt(1);

      expect(result.lastSyncAt).toBeNull();
    });
  });

  describe('sync', () => {
    const conn = {
      id: 1,
      userId: 1,
      stravaAthleteId: '123',
      refreshToken: 'rt',
      accessToken: 'at',
      expiresAt: new Date(Date.now() + 3600 * 1000),
    };

    it('throws when Strava not connected', async () => {
      mockPrisma.stravaConnection.findUnique.mockResolvedValue(null);

      try {
        await service.sync(1, '2025-02-01');
        fail('expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as Error).message).toMatch(/not connected/);
      }
    });

    it('imports activities and updates last-sync on success', async () => {
      mockPrisma.stravaConnection.findUnique.mockResolvedValue(conn);
      mockPrisma.user.update.mockResolvedValue({});
      mockWorkoutsService.createByExternalId.mockResolvedValue({ created: true });
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 100,
              type: 'Run',
              name: 'Morning Run',
              distance: 5000,
              moving_time: 1800,
              start_date: '2025-02-15T07:00:00Z',
            },
          ]),
          { status: 200 },
        ),
      );

      const result = await service.sync(1, '2025-02-01');

      expect(result.imported).toBe(1);
      expect(result.skipped).toBeDefined();
      const createCall = (workoutsService.createByExternalId as jest.Mock).mock.calls[0];
      expect(createCall[0]).toBe(1);
      expect(createCall[1].externalId).toBe('100');
      expect(createCall[1].type).toBe(WorkoutType.RUNNING);
      expect(createCall[1].distanceKm).toBe(5);
      expect(createCall[1].location).toBe('Morning Run');
      expect(createCall[1].shoeId).toBeUndefined();
      expect(prisma.user.update).toHaveBeenCalledTimes(1);
      const updateCall = (prisma.user.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: 1 });
      expect(updateCall.data.lastStravaSyncAt).toBeInstanceOf(Date);
    });

    it('when user has default shoe, passes shoeId to createByExternalId for new workouts', async () => {
      mockPrisma.stravaConnection.findUnique.mockResolvedValue(conn);
      mockPrisma.user.update.mockResolvedValue({});
      mockShoesService.findDefaultShoeId.mockResolvedValue(42);
      mockWorkoutsService.createByExternalId.mockResolvedValue({ created: true });
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 101,
              type: 'Run',
              name: 'Run',
              distance: 3000,
              moving_time: 900,
              start_date: '2025-02-16T08:00:00Z',
            },
          ]),
          { status: 200 },
        ),
      );

      await service.sync(1, '2025-02-01');

      expect(mockShoesService.findDefaultShoeId).toHaveBeenCalledWith(1);
      const createCall = (workoutsService.createByExternalId as jest.Mock).mock.calls[0];
      expect(createCall[1].shoeId).toBe(42);
    });

    it('when user has no default shoe, createByExternalId is called without shoeId', async () => {
      mockPrisma.stravaConnection.findUnique.mockResolvedValue(conn);
      mockPrisma.user.update.mockResolvedValue({});
      mockShoesService.findDefaultShoeId.mockResolvedValue(null);
      mockWorkoutsService.createByExternalId.mockResolvedValue({ created: true });
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            {
              id: 102,
              type: 'Walk',
              name: 'Walk',
              distance: 2000,
              moving_time: 600,
              start_date: '2025-02-17T09:00:00Z',
            },
          ]),
          { status: 200 },
        ),
      );

      await service.sync(1, '2025-02-01');

      const createCall = (workoutsService.createByExternalId as jest.Mock).mock.calls[0];
      expect(createCall[1].shoeId).toBeUndefined();
    });

    it('idempotent re-sync: when createByExternalId returns created false, workout is not updated (no shoe change)', async () => {
      mockPrisma.stravaConnection.findUnique.mockResolvedValue(conn);
      mockPrisma.user.update.mockResolvedValue({});
      mockShoesService.findDefaultShoeId.mockResolvedValue(99);
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: 200, type: 'Run', name: 'Run', distance: 5000, moving_time: 1800, start_date: '2025-02-10T07:00:00Z' },
          ]),
          { status: 200 },
        ),
      );
      mockWorkoutsService.createByExternalId.mockResolvedValue({ created: false });

      const result = await service.sync(1, '2025-02-01');

      expect(result.imported).toBe(0);
      expect(workoutsService.createByExternalId).toHaveBeenCalledTimes(1);
      expect((workoutsService.createByExternalId as jest.Mock).mock.calls[0][1].externalId).toBe('200');
      expect((workoutsService.createByExternalId as jest.Mock).mock.calls[0][1].shoeId).toBe(99);
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('skips non-running/walking activities', async () => {
      mockPrisma.stravaConnection.findUnique.mockResolvedValue(conn);
      mockPrisma.user.update.mockResolvedValue({});
      mockWorkoutsService.createByExternalId.mockResolvedValue({ created: true });
      fetchMock.mockImplementation((url: string) => {
        if (typeof url === 'string' && url.includes('athlete/activities')) {
          return Promise.resolve(
            new Response(
              JSON.stringify([
                { id: 101, type: 'Ride', name: 'Bike', distance: 10000, moving_time: 3600, start_date: '2025-02-15T08:00:00Z' },
                { id: 102, type: 'Run', name: 'Run', distance: 3000, moving_time: 900, start_date: '2025-02-15T09:00:00Z' },
              ]),
              { status: 200 },
            ),
          );
        }
        return Promise.resolve(new Response());
      });

      const result = await service.sync(1, '2025-02-01');

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(1);
      expect(workoutsService.createByExternalId).toHaveBeenCalledTimes(1);
      const createCall = (workoutsService.createByExternalId as jest.Mock).mock.calls[0];
      expect(createCall[0]).toBe(1);
      expect(createCall[1].externalId).toBe('102');
      expect(createCall[1].type).toBe(WorkoutType.RUNNING);
    });

    it('idempotent: when createByExternalId returns created false, imported count is 0', async () => {
      mockPrisma.stravaConnection.findUnique.mockResolvedValue(conn);
      mockPrisma.user.update.mockResolvedValue({});
      fetchMock.mockResolvedValueOnce(
        new Response(
          JSON.stringify([
            { id: 200, type: 'Run', name: 'Run', distance: 5000, moving_time: 1800, start_date: '2025-02-10T07:00:00Z' },
          ]),
          { status: 200 },
        ),
      );
      mockWorkoutsService.createByExternalId.mockResolvedValue({ created: false });

      const result = await service.sync(1, '2025-02-01');

      expect(result.imported).toBe(0);
      expect(workoutsService.createByExternalId).toHaveBeenCalledTimes(1);
      expect((workoutsService.createByExternalId as jest.Mock).mock.calls[0][1].externalId).toBe('200');
      expect(prisma.user.update).toHaveBeenCalled();
    });

    it('rejects fromDate in the future', async () => {
      const future = new Date();
      future.setDate(future.getDate() + 1);

      try {
        await service.sync(1, future.toISOString());
        fail('expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
    });
  });

  describe('handleWebhookVerify', () => {
    beforeEach(() => {
      (mockConfig.get as jest.Mock).mockImplementation((key: string) =>
        key === 'STRAVA_WEBHOOK_VERIFY_TOKEN' ? 'expected-token' : mockConfig.get(key),
      );
    });

    it('returns hub.challenge when mode and token match', () => {
      const result = service.handleWebhookVerify('subscribe', 'expected-token', 'challenge-123');

      expect(result).toEqual({ 'hub.challenge': 'challenge-123' });
    });

    it('returns null when token does not match', () => {
      const result = service.handleWebhookVerify('subscribe', 'wrong-token', 'challenge-123');

      expect(result).toBeNull();
    });

    it('returns null when mode is not subscribe', () => {
      const result = service.handleWebhookVerify('unsubscribe', 'expected-token', 'challenge-123');

      expect(result).toBeNull();
    });
  });

  describe('handleWebhookEvent', () => {
    it('deletes connection on athlete deauthorization', async () => {
      mockPrisma.stravaConnection.deleteMany.mockResolvedValue({ count: 1 });

      await service.handleWebhookEvent({
        object_type: 'athlete',
        aspect_type: 'update',
        updates: { authorized: 'false' },
        owner_id: 456,
      });

      expect(prisma.stravaConnection.deleteMany).toHaveBeenCalledWith({
        where: { stravaAthleteId: '456' },
      });
    });

    it('does nothing for non-athlete event', async () => {
      await service.handleWebhookEvent({
        object_type: 'activity',
        aspect_type: 'create',
        owner_id: 456,
      });

      expect(prisma.stravaConnection.deleteMany).not.toHaveBeenCalled();
    });

    it('does nothing when authorized is not false', async () => {
      await service.handleWebhookEvent({
        object_type: 'athlete',
        aspect_type: 'update',
        updates: { authorized: 'true' },
        owner_id: 456,
      });

      expect(prisma.stravaConnection.deleteMany).not.toHaveBeenCalled();
    });
  });
});
