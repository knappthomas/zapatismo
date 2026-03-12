import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { WorkoutType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { WorkoutsService } from './workouts.service';

describe('WorkoutsService (unit)', () => {
  let service: WorkoutsService;
  let prisma: PrismaService;

  const mockPrisma = {
    workout: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    shoe: {
      findFirst: jest.fn(),
    },
  };

  const userId = 1;
  const createDto: CreateWorkoutDto = {
    type: WorkoutType.RUNNING,
    startTime: '2025-02-25T08:00:00.000Z',
    endTime: '2025-02-25T09:30:00.000Z',
    steps: 5000,
    distanceKm: 10.5,
    location: 'Central Park',
  };

  const workoutEntity = {
    id: 1,
    userId: 1,
    type: WorkoutType.RUNNING,
    startTime: new Date('2025-02-25T08:00:00.000Z'),
    endTime: new Date('2025-02-25T09:30:00.000Z'),
    steps: 5000,
    distanceKm: 10.5,
    location: 'Central Park',
    shoeId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    shoe: null,
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WorkoutsService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<WorkoutsService>(WorkoutsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a workout for the user and returns DTO', async () => {
      mockPrisma.workout.create.mockResolvedValue(workoutEntity);

      const result = await service.create(userId, createDto);

      expect(prisma.workout.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          type: createDto.type,
          startTime: new Date(createDto.startTime),
          endTime: new Date(createDto.endTime),
          steps: createDto.steps,
          distanceKm: createDto.distanceKm,
          location: createDto.location,
          shoeId: null,
        },
        include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
      });
      expect(result.id).toBe(1);
      expect(result.userId).toBe(1);
      expect(result.type).toBe(WorkoutType.RUNNING);
      expect(result.distanceKm).toBe(10.5);
    });

    it('creates workout with optional shoeId when shoe belongs to user', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue({ id: 2, userId: 1 });
      mockPrisma.workout.create.mockResolvedValue({ ...workoutEntity, shoeId: 2 });

      await service.create(userId, { ...createDto, shoeId: 2 });

      expect(prisma.shoe.findFirst).toHaveBeenCalledWith({
        where: { id: 2, userId: 1 },
      });
      const createCall = (prisma.workout.create as jest.Mock).mock.calls[0][0];
      expect(createCall.data.shoeId).toBe(2);
    });

    it('throws BadRequestException when shoeId is not user’s shoe', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(null);

      try {
        await service.create(userId, { ...createDto, shoeId: 99 });
        fail('expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
      expect(prisma.workout.create).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when endTime is before startTime', async () => {
      const invalidDto: CreateWorkoutDto = {
        ...createDto,
        startTime: '2025-02-25T09:00:00.000Z',
        endTime: '2025-02-25T08:00:00.000Z',
      };

      try {
        await service.create(userId, invalidDto);
        fail('expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as Error).message).toContain('endTime');
      }
    });

    it('accepts endTime equal to startTime', async () => {
      mockPrisma.workout.create.mockResolvedValue(workoutEntity);
      const dto: CreateWorkoutDto = {
        ...createDto,
        startTime: '2025-02-25T08:00:00.000Z',
        endTime: '2025-02-25T08:00:00.000Z',
      };

      await service.create(userId, dto);

      expect(prisma.workout.create).toHaveBeenCalled();
    });
  });

  describe('findAll', () => {
    it('returns only the current user’s workouts', async () => {
      mockPrisma.workout.findMany.mockResolvedValue([workoutEntity]);

      const result = await service.findAll(userId);

      expect(prisma.workout.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { startTime: 'desc' },
        include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
      expect(result[0].userId).toBe(1);
    });

    it('returns empty array when user has no workouts', async () => {
      mockPrisma.workout.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns workout when found and owned by user', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(workoutEntity);

      const result = await service.findOne(1, userId);

      expect(prisma.workout.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
        include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
      });
      expect(result.id).toBe(1);
      expect(result.location).toBe('Central Park');
    });

    it('throws NotFoundException when workout not found', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(null);

      try {
        await service.findOne(999, userId);
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect((e as Error).message).toContain('999');
      }
    });

    it('throws NotFoundException when workout belongs to another user', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(null);

      try {
        await service.findOne(1, 2);
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
      expect(prisma.workout.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 2 },
        include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
      });
    });
  });

  describe('update', () => {
    it('updates workout when found and owned by user', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(workoutEntity);
      const updated = { ...workoutEntity, location: 'Updated Location' };
      mockPrisma.workout.update.mockResolvedValue(updated);

      const dto: UpdateWorkoutDto = { location: 'Updated Location' };
      const result = await service.update(1, userId, dto);

      expect(prisma.workout.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
      expect(prisma.workout.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { location: 'Updated Location' },
        include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
      });
      expect(result.location).toBe('Updated Location');
    });

    it('throws NotFoundException when workout not found', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(null);

      try {
        await service.update(999, userId, { location: 'X' });
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
      expect(prisma.workout.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when workout belongs to another user', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(null);

      try {
        await service.update(1, 2, { location: 'X' });
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });

    it('throws BadRequestException when update would set endTime before startTime', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(workoutEntity);

      try {
        await service.update(1, userId, {
          startTime: '2025-02-25T10:00:00.000Z',
          endTime: '2025-02-25T09:00:00.000Z',
        });
        fail('expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
      expect(prisma.workout.update).not.toHaveBeenCalled();
    });

    it('rejects shoeId that does not belong to user on update', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(workoutEntity);
      mockPrisma.shoe.findFirst.mockResolvedValue(null);

      try {
        await service.update(1, userId, { shoeId: 99 });
        fail('expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
      }
      expect(prisma.workout.update).not.toHaveBeenCalled();
    });
  });

  describe('createByExternalId', () => {
    const externalData = {
      externalId: 'strava-123',
      type: WorkoutType.RUNNING,
      startTime: new Date('2025-02-25T08:00:00.000Z'),
      endTime: new Date('2025-02-25T09:00:00.000Z'),
      steps: 0,
      distanceKm: 5,
      location: 'Strava',
    };

    it('creates workout when no existing by externalId and returns { created: true }', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(null);
      mockPrisma.workout.create.mockResolvedValue({
        ...workoutEntity,
        externalId: externalData.externalId,
      });

      const result = await service.createByExternalId(userId, externalData);

      expect(result.created).toBe(true);
      expect(result.workout).toBeDefined();
      expect(result.workout?.id).toBe(1);
      expect(prisma.workout.findFirst).toHaveBeenCalledWith({
        where: { userId: 1, externalId: externalData.externalId },
        include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
      });
      expect(prisma.workout.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          externalId: externalData.externalId,
          type: externalData.type,
          startTime: externalData.startTime,
          endTime: externalData.endTime,
          steps: externalData.steps,
          distanceKm: externalData.distanceKm,
          location: externalData.location,
          shoeId: null,
        },
        include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
      });
    });

    it('returns { created: false } when workout with same externalId already exists', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue({
        ...workoutEntity,
        externalId: externalData.externalId,
      });

      const result = await service.createByExternalId(userId, externalData);

      expect(result.created).toBe(false);
      expect(result.workout).toBeUndefined();
      expect(prisma.workout.findFirst).toHaveBeenCalledWith({
        where: { userId: 1, externalId: externalData.externalId },
        include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
      });
      expect(prisma.workout.create).not.toHaveBeenCalled();
    });
  });

  describe('bulkAssignShoe', () => {
    it('assigns shoe to all given workouts when all belong to user and shoe is owned', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue({ id: 2, userId: 1 });
      mockPrisma.workout.findMany
        .mockResolvedValueOnce([{ ...workoutEntity, id: 1 }, { ...workoutEntity, id: 2 }])
        .mockResolvedValueOnce([
          { ...workoutEntity, id: 1, shoeId: 2, shoe: { id: 2, brandName: 'Nike', shoeName: 'Pegasus' } },
          { ...workoutEntity, id: 2, shoeId: 2, shoe: { id: 2, brandName: 'Nike', shoeName: 'Pegasus' } },
        ]);
      mockPrisma.workout.updateMany.mockResolvedValue({ count: 2 });

      const result = await service.bulkAssignShoe(userId, {
        workoutIds: [1, 2],
        shoeId: 2,
      });

      expect(prisma.shoe.findFirst).toHaveBeenCalledWith({
        where: { id: 2, userId: 1 },
      });
      expect(prisma.workout.findMany).toHaveBeenCalledTimes(2);
      expect((prisma.workout.findMany as jest.Mock).mock.calls[0][0]).toEqual({
        where: { id: { in: [1, 2] }, userId: 1 },
      });
      expect(prisma.workout.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [1, 2] }, userId: 1 },
        data: { shoeId: 2 },
      });
      expect(result.length).toBe(2);
      expect(result[0].shoeId).toBe(2);
      expect(result[0].shoe?.brandName).toBe('Nike');
      expect(result[1].shoeId).toBe(2);
    });

    it('throws BadRequestException when workoutIds is empty', async () => {
      try {
        await service.bulkAssignShoe(userId, { workoutIds: [], shoeId: 1 });
        fail('expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as Error).message).toContain('At least one workout id');
      }
      expect(prisma.shoe.findFirst).not.toHaveBeenCalled();
      expect(prisma.workout.findMany).not.toHaveBeenCalled();
    });

    it('throws BadRequestException when shoeId is not owned by user', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(null);

      try {
        await service.bulkAssignShoe(userId, { workoutIds: [1, 2], shoeId: 99 });
        fail('expected BadRequestException');
      } catch (e) {
        expect(e).toBeInstanceOf(BadRequestException);
        expect((e as Error).message).toContain('Shoe not found');
      }
      expect(prisma.workout.findMany).not.toHaveBeenCalled();
      expect(prisma.workout.updateMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when one or more workout IDs are not found or not owned', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue({ id: 2, userId: 1 });
      mockPrisma.workout.findMany.mockResolvedValue([{ ...workoutEntity, id: 1 }]);

      try {
        await service.bulkAssignShoe(userId, { workoutIds: [1, 999], shoeId: 2 });
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect((e as Error).message).toContain('One or more workouts not found');
      }
      expect(prisma.workout.updateMany).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when all workout IDs belong to another user', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue({ id: 2, userId: 1 });
      mockPrisma.workout.findMany.mockResolvedValue([]);

      try {
        await service.bulkAssignShoe(userId, { workoutIds: [1, 2], shoeId: 2 });
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
      expect(prisma.workout.updateMany).not.toHaveBeenCalled();
    });
  });

  describe('remove', () => {
    it('deletes workout when found and owned by user', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(workoutEntity);
      mockPrisma.workout.delete.mockResolvedValue(workoutEntity);

      await service.remove(1, userId);

      expect(prisma.workout.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
      expect(prisma.workout.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws NotFoundException when workout not found', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(null);

      try {
        await service.remove(999, userId);
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
      expect(prisma.workout.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when workout belongs to another user', async () => {
      mockPrisma.workout.findFirst.mockResolvedValue(null);

      try {
        await service.remove(1, 2);
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
      expect(prisma.workout.delete).not.toHaveBeenCalled();
    });
  });
});
