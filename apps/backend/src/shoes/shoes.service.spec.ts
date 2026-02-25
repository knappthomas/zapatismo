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
      delete: jest.fn(),
    },
    workout: {
      count: jest.fn(),
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
    it('creates a shoe for the user and returns DTO', async () => {
      mockPrisma.shoe.create.mockResolvedValue(shoeEntity);

      const result = await service.create(userId, createDto);

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

      const result = await service.findAll(userId);

      expect(prisma.shoe.findMany).toHaveBeenCalledWith({
        where: { userId: 1 },
        orderBy: { createdAt: 'desc' },
      });
      expect(result.length).toBe(1);
      expect(result[0].id).toBe(1);
      expect(result[0].userId).toBe(1);
    });

    it('returns empty array when user has no shoes', async () => {
      mockPrisma.shoe.findMany.mockResolvedValue([]);

      const result = await service.findAll(userId);

      expect(result).toEqual([]);
    });
  });

  describe('findOne', () => {
    it('returns shoe when found and owned by user', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(shoeEntity);

      const result = await service.findOne(1, userId);

      expect(prisma.shoe.findFirst).toHaveBeenCalledWith({
        where: { id: 1, userId: 1 },
      });
      expect(result.id).toBe(1);
      expect(result.shoeName).toBe('Pegasus');
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
    it('updates shoe when found and owned by user', async () => {
      mockPrisma.shoe.findFirst.mockResolvedValue(shoeEntity);
      const updated = { ...shoeEntity, brandName: 'Updated Brand' };
      mockPrisma.shoe.update.mockResolvedValue(updated);

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
