import { ConflictException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShoeDto } from './dto/create-shoe.dto';
import { UpdateShoeDto } from './dto/update-shoe.dto';
import { ShoesService } from './shoes.service';

describe('ShoesService (unit)', () => {
  let service: ShoesService;
  let prisma: PrismaService;

  const mockPrisma = {
    shoe: {
      create: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    workout: {
      count: jest.fn(),
      groupBy: jest.fn(),
      aggregate: jest.fn(),
    },
  };

  const userId = 1;
  const createDto: CreateShoeDto = {
    photoUrl: 'https://example.com/shoe.jpg',
    brandName: 'Nike',
    shoeName: 'Pegasus',
    buyingDate: '2024-01-15',
    buyingLocation: 'Berlin',
    kilometerTarget: 800,
  };

  const shoeEntity = {
    id: 1,
    userId: 1,
    photoUrl: 'https://example.com/shoe.jpg',
    brandName: 'Nike',
    shoeName: 'Pegasus',
    buyingDate: new Date('2024-01-15'),
    buyingLocation: 'Berlin',
    kilometerTarget: 800,
    isDefaultForRunning: false,
    isDefaultForWalking: false,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShoesService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<ShoesService>(ShoesService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a shoe for the user and returns DTO with totalSteps and totalDistanceKm 0', async () => {
      mockPrisma.shoe.create.mockResolvedValue(shoeEntity);

      const result = await service.create(userId, createDto);

      expect(result.totalSteps).toBe(0);
      expect(result.totalDistanceKm).toBe(0);
      expect(prisma.shoe.create).toHaveBeenCalledWith({
        data: {
          userId: 1,
          photoUrl: createDto.photoUrl,
          brandName: createDto.brandName,
          shoeName: createDto.shoeName,
          buyingDate: new Date(createDto.buyingDate),
          buyingLocation: 'Berlin',
          kilometerTarget: createDto.kilometerTarget,
        },
      });
      expect(result.id).toBe(1);
      expect(result.userId).toBe(1);
      expect(result.brandName).toBe('Nike');
      expect(result.kilometerTarget).toBe(800);
    });

    it('passes null for optional buyingLocation when omitted', async () => {
      const dtoWithoutLocation = { ...createDto, buyingLocation: undefined };
      mockPrisma.shoe.create.mockResolvedValue(shoeEntity);

      await service.create(userId, dtoWithoutLocation);

      const call = (prisma.shoe.create as jest.Mock).mock.calls[0][0];
      expect(call.data.buyingLocation).toBeNull();
    });
  });

  describe('findAll', () => {
    it('returns only the current user’s shoes', async () => {
      mockPrisma.shoe.findMany.mockResolvedValue([shoeEntity]);
      mockPrisma.workout.groupBy.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(prisma.shoe.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
      expect(result[0].userId).toBe(1);
      expect(result[0].totalSteps).toBe(0);
      expect(result[0].totalDistanceKm).toBe(0);
    });

    it('returns empty array when user has no shoes', async () => {
      mockPrisma.shoe.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
      expect(prisma.workout.groupBy).not.toHaveBeenCalled();
    });

    it('returns shoes with totalSteps and totalDistanceKm from linked workouts', async () => {
      mockPrisma.shoe.findMany.mockResolvedValue([shoeEntity]);
      mockPrisma.workout.groupBy.mockResolvedValue([
        { shoeId: 1, _sum: { steps: 5000, distanceKm: 12.5 } },
      ]);

      const result = await service.findAll(userId);

      expect(prisma.workout.groupBy).toHaveBeenCalled();
      expect(result[0].totalSteps).toBe(5000);
      expect(result[0].totalDistanceKm).toBe(12.5);
    });

    it('returns 0, 0 for shoe with no linked workouts', async () => {
      mockPrisma.shoe.findMany.mockResolvedValue([shoeEntity]);
      mockPrisma.workout.groupBy.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result[0].totalSteps).toBe(0);
      expect(result[0].totalDistanceKm).toBe(0);
    });

    it('maps multiple shoes with correct aggregates per shoe', async () => {
      const shoe2 = { ...shoeEntity, id: 2, shoeName: 'Second' };
      mockPrisma.shoe.findMany.mockResolvedValue([shoeEntity, shoe2]);
      mockPrisma.workout.groupBy.mockResolvedValue([
        { shoeId: 1, _sum: { steps: 100, distanceKm: 1 } },
        { shoeId: 2, _sum: { steps: 200, distanceKm: 2 } },
      ]);

      const result = await service.findAll(userId);

      expect(result.length).toBe(2);
      expect(result[0].id).toBe(1);
      expect(result[0].totalSteps).toBe(100);
      expect(result[0].totalDistanceKm).toBe(1);
      expect(result[1].id).toBe(2);
      expect(result[1].totalSteps).toBe(200);
      expect(result[1].totalDistanceKm).toBe(2);
    });
  });

  describe('findOne', () => {
    it('returns shoe when found and owned by user', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(shoeEntity);
      mockPrisma.workout.aggregate.mockResolvedValue({
        _sum: { steps: 3000, distanceKm: 5.5 },
      });

      const result = await service.findOne(1, userId);

      expect(prisma.shoe.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
      expect(prisma.workout.aggregate).toHaveBeenCalledWith({
        where: { shoeId: 1 },
        _sum: { steps: true, distanceKm: true },
      });
      expect(result.id).toBe(1);
      expect(result.shoeName).toBe('Pegasus');
      expect(result.totalSteps).toBe(3000);
      expect(result.totalDistanceKm).toBe(5.5);
    });

    it('returns totalSteps 0 and totalDistanceKm 0 when shoe has no linked workouts', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(shoeEntity);
      mockPrisma.workout.aggregate.mockResolvedValue({
        _sum: { steps: null, distanceKm: null },
      });

      const result = await service.findOne(1, userId);

      expect(result.totalSteps).toBe(0);
      expect(result.totalDistanceKm).toBe(0);
    });

    it('throws NotFoundException when shoe not found', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(null);

      try {
        await service.findOne(999, userId);
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
        expect((e as Error).message).toContain('999');
      }
    });

    it('throws NotFoundException when shoe exists but belongs to another user', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(null);

      try {
        await service.findOne(1, 2);
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
      expect(prisma.shoe.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 2 },
      });
    });
  });

  describe('update', () => {
    it('updates shoe when found and owned by user and returns aggregates', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(shoeEntity);
      const updated = { ...shoeEntity, brandName: 'Updated Brand' };
      mockPrisma.shoe.update.mockResolvedValue(updated);
      mockPrisma.workout.aggregate.mockResolvedValue({
        _sum: { steps: 1000, distanceKm: 3 },
      });

      const dto: UpdateShoeDto = { brandName: 'Updated Brand' };
      const result = await service.update(1, userId, dto);

      expect(prisma.shoe.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
      expect(prisma.shoe.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { brandName: 'Updated Brand' },
      });
      expect(result.brandName).toBe('Updated Brand');
      expect(result.totalSteps).toBe(1000);
      expect(result.totalDistanceKm).toBe(3);
    });

    it('throws NotFoundException when shoe not found', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(null);

      try {
        await service.update(999, userId, { brandName: 'X' });
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
      expect(prisma.shoe.update).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when shoe belongs to another user', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(null);

      try {
        await service.update(1, 2, { brandName: 'X' });
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
    });

    it('when isDefaultForRunning true, clears other shoes default-for-running then sets this shoe', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(shoeEntity);
      mockPrisma.shoe.updateMany.mockResolvedValue({ count: 1 });
      const updated = { ...shoeEntity, isDefaultForRunning: true, isDefaultForWalking: false };
      mockPrisma.shoe.update.mockResolvedValue(updated);
      mockPrisma.workout.aggregate.mockResolvedValue({
        _sum: { steps: 0, distanceKm: 0 },
      });

      const result = await service.update(1, userId, { isDefaultForRunning: true });

      expect(prisma.shoe.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, id: { not: 1 } },
        data: { isDefaultForRunning: false },
      });
      const updateCall = (prisma.shoe.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.where).toEqual({ id: 1 });
      expect(updateCall.data.isDefaultForRunning).toBe(true);
      expect(result.isDefaultForRunning).toBe(true);
    });

    it('when isDefaultForWalking true, clears other shoes default-for-walking then sets this shoe', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(shoeEntity);
      mockPrisma.shoe.updateMany.mockResolvedValue({ count: 1 });
      const updated = { ...shoeEntity, isDefaultForRunning: false, isDefaultForWalking: true };
      mockPrisma.shoe.update.mockResolvedValue(updated);
      mockPrisma.workout.aggregate.mockResolvedValue({
        _sum: { steps: 0, distanceKm: 0 },
      });

      const result = await service.update(1, userId, { isDefaultForWalking: true });

      expect(prisma.shoe.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, id: { not: 1 } },
        data: { isDefaultForWalking: false },
      });
      expect(result.isDefaultForWalking).toBe(true);
    });

    it('when both isDefaultForRunning and isDefaultForWalking true, clears both on other shoes then sets this shoe', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(shoeEntity);
      mockPrisma.shoe.updateMany.mockResolvedValue({ count: 2 });
      const updated = {
        ...shoeEntity,
        isDefaultForRunning: true,
        isDefaultForWalking: true,
      };
      mockPrisma.shoe.update.mockResolvedValue(updated);
      mockPrisma.workout.aggregate.mockResolvedValue({
        _sum: { steps: 0, distanceKm: 0 },
      });

      const result = await service.update(1, userId, {
        isDefaultForRunning: true,
        isDefaultForWalking: true,
      });

      expect(prisma.shoe.updateMany).toHaveBeenCalledTimes(2);
      expect(prisma.shoe.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, id: { not: 1 } },
        data: { isDefaultForRunning: false },
      });
      expect(prisma.shoe.updateMany).toHaveBeenCalledWith({
        where: { userId: 1, id: { not: 1 } },
        data: { isDefaultForWalking: false },
      });
      expect(result.isDefaultForRunning).toBe(true);
      expect(result.isDefaultForWalking).toBe(true);
    });

    it('when isDefaultForRunning false, only updates this shoe to non-default running', async () => {
      const defaultShoe = { ...shoeEntity, isDefaultForRunning: true, isDefaultForWalking: false };
      mockPrisma.shoe.findFirst.mockResolvedValue(defaultShoe);
      const updated = { ...defaultShoe, isDefaultForRunning: false };
      mockPrisma.shoe.update.mockResolvedValue(updated);
      mockPrisma.workout.aggregate.mockResolvedValue({
        _sum: { steps: 0, distanceKm: 0 },
      });

      const result = await service.update(1, userId, { isDefaultForRunning: false });

      expect(prisma.shoe.updateMany).not.toHaveBeenCalled();
      const updateCall = (prisma.shoe.update as jest.Mock).mock.calls[0][0];
      expect(updateCall.data.isDefaultForRunning).toBe(false);
      expect(result.isDefaultForRunning).toBe(false);
    });
  });

  describe('findDefaultRunningShoeId', () => {
    it('returns shoe id when user has a default running shoe', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue({ id: 5 });

      const result = await service.findDefaultRunningShoeId(userId);

      expect(prisma.shoe.findFirst).toHaveBeenCalledWith({
        where: { userId: 1, isDefaultForRunning: true },
        select: { id: true },
      });
      expect(result).toBe(5);
    });

    it('returns null when user has no default running shoe', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(null);

      const result = await service.findDefaultRunningShoeId(userId);

      expect(result).toBeNull();
    });
  });

  describe('findDefaultWalkingShoeId', () => {
    it('returns shoe id when user has a default walking shoe', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue({ id: 7 });

      const result = await service.findDefaultWalkingShoeId(userId);

      expect(prisma.shoe.findFirst).toHaveBeenCalledWith({
        where: { userId: 1, isDefaultForWalking: true },
        select: { id: true },
      });
      expect(result).toBe(7);
    });

    it('returns null when user has no default walking shoe', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(null);

      const result = await service.findDefaultWalkingShoeId(userId);

      expect(result).toBeNull();
    });
  });

  describe('remove', () => {
    it('deletes shoe when found and owned by user', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(shoeEntity);
      mockPrisma.shoe.delete.mockResolvedValue(shoeEntity);

      await service.remove(1, userId);

      expect(prisma.shoe.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
      expect(prisma.shoe.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('throws NotFoundException when shoe not found', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(null);

      try {
        await service.remove(999, userId);
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
      expect(prisma.shoe.delete).not.toHaveBeenCalled();
    });

    it('throws NotFoundException when shoe belongs to another user', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(null);

      try {
        await service.remove(1, 2);
        fail('expected NotFoundException');
      } catch (e) {
        expect(e).toBeInstanceOf(NotFoundException);
      }
      expect(prisma.shoe.delete).not.toHaveBeenCalled();
    });

    it('throws ConflictException when shoe is linked to workouts and does not delete', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(shoeEntity);
      mockPrisma.workout.count.mockResolvedValue(2);

      try {
        await service.remove(1, userId);
        fail('expected ConflictException');
      } catch (e) {
        expect(e).toBeInstanceOf(ConflictException);
      }
      expect(prisma.workout.count).toHaveBeenCalledWith({
        where: { shoeId: 1 },
      });
      expect(prisma.shoe.delete).not.toHaveBeenCalled();
    });

    it('deletes shoe when no workouts reference it', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(shoeEntity);
      mockPrisma.workout.count.mockResolvedValue(0);
      mockPrisma.shoe.delete.mockResolvedValue(shoeEntity);

      await service.remove(1, userId);

      expect(prisma.workout.count).toHaveBeenCalledWith({
        where: { shoeId: 1 },
      });
      expect(prisma.shoe.delete).toHaveBeenCalledWith({ where: { id: 1 } });
    });
  });
});
