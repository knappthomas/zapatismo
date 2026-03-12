import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShoeDto } from './dto/create-shoe.dto';
import { ShoeResponseDto } from './dto/shoe-response.dto';
import { UpdateShoeDto } from './dto/update-shoe.dto';

@Injectable()
export class ShoesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateShoeDto): Promise<ShoeResponseDto> {
    const shoe = await this.prisma.shoe.create({
      data: {
        userId,
        photoUrl: dto.photoUrl,
        brandName: dto.brandName,
        shoeName: dto.shoeName,
        buyingDate: new Date(dto.buyingDate),
        buyingLocation: dto.buyingLocation ?? null,
        kilometerTarget: dto.kilometerTarget,
      },
    });
    return this.toResponse(shoe, { totalSteps: 0, totalDistanceKm: 0 });
  }

  async findAll(userId: number): Promise<ShoeResponseDto[]> {
    const shoes = await this.prisma.shoe.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    if (shoes.length === 0) return [];

    const shoeIds = shoes.map((s) => s.id);
    const aggregates = await this.prisma.workout.groupBy({
      by: ['shoeId'],
      where: { shoeId: { in: shoeIds } },
      _sum: { steps: true, distanceKm: true },
    });
    const totalsByShoeId = new Map<number, { totalSteps: number; totalDistanceKm: number }>();
    for (const row of aggregates) {
      if (row.shoeId != null) {
        totalsByShoeId.set(row.shoeId, {
          totalSteps: row._sum.steps ?? 0,
          totalDistanceKm: Number(row._sum.distanceKm ?? 0),
        });
      }
    }
    return shoes.map((s) =>
      this.toResponse(s, totalsByShoeId.get(s.id) ?? { totalSteps: 0, totalDistanceKm: 0 }),
    );
  }

  async findOne(id: number, userId: number): Promise<ShoeResponseDto> {
    const shoe = await this.prisma.shoe.findFirst({
      where: { id, userId },
    });
    if (!shoe) {
      throw new NotFoundException(`Shoe with id ${id} not found`);
    }
    const agg = await this.prisma.workout.aggregate({
      where: { shoeId: id },
      _sum: { steps: true, distanceKm: true },
    });
    const totalSteps = agg._sum.steps ?? 0;
    const totalDistanceKm = Number(agg._sum.distanceKm ?? 0);
    return this.toResponse(shoe, { totalSteps, totalDistanceKm });
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateShoeDto,
  ): Promise<ShoeResponseDto> {
    const existing = await this.prisma.shoe.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Shoe with id ${id} not found`);
    }
    if (dto.isDefaultForRunning === true) {
      await this.prisma.shoe.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefaultForRunning: false },
      });
    }
    if (dto.isDefaultForWalking === true) {
      await this.prisma.shoe.updateMany({
        where: { userId, id: { not: id } },
        data: { isDefaultForWalking: false },
      });
    }
    const shoe = await this.prisma.shoe.update({
      where: { id },
      data: {
        ...(dto.photoUrl !== undefined && { photoUrl: dto.photoUrl }),
        ...(dto.brandName !== undefined && { brandName: dto.brandName }),
        ...(dto.shoeName !== undefined && { shoeName: dto.shoeName }),
        ...(dto.buyingDate !== undefined && {
          buyingDate: new Date(dto.buyingDate),
        }),
        ...(dto.buyingLocation !== undefined && {
          buyingLocation: dto.buyingLocation,
        }),
        ...(dto.kilometerTarget !== undefined && {
          kilometerTarget: dto.kilometerTarget,
        }),
        ...(dto.isDefaultForRunning !== undefined && {
          isDefaultForRunning: dto.isDefaultForRunning,
        }),
        ...(dto.isDefaultForWalking !== undefined && {
          isDefaultForWalking: dto.isDefaultForWalking,
        }),
      },
    });
    const agg = await this.prisma.workout.aggregate({
      where: { shoeId: id },
      _sum: { steps: true, distanceKm: true },
    });
    return this.toResponse(shoe, {
      totalSteps: agg._sum.steps ?? 0,
      totalDistanceKm: Number(agg._sum.distanceKm ?? 0),
    });
  }

  /**
   * Returns the id of the user's default running shoe, or null if none is set.
   * Used by Strava sync to assign newly imported running workouts.
   */
  async findDefaultRunningShoeId(userId: number): Promise<number | null> {
    const shoe = await this.prisma.shoe.findFirst({
      where: { userId, isDefaultForRunning: true },
      select: { id: true },
    });
    return shoe?.id ?? null;
  }

  /**
   * Returns the id of the user's default walking shoe, or null if none is set.
   * Used by Strava sync to assign newly imported walking workouts.
   */
  async findDefaultWalkingShoeId(userId: number): Promise<number | null> {
    const shoe = await this.prisma.shoe.findFirst({
      where: { userId, isDefaultForWalking: true },
      select: { id: true },
    });
    return shoe?.id ?? null;
  }

  async remove(id: number, userId: number): Promise<void> {
    const existing = await this.prisma.shoe.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Shoe with id ${id} not found`);
    }
    const workoutsCount = await this.prisma.workout.count({
      where: { shoeId: id },
    });
    if (workoutsCount > 0) {
      throw new ConflictException(
        `Shoe is linked to ${workoutsCount} workout(s) and cannot be deleted. Remove or change the shoe assignment on those workouts first.`,
      );
    }
    await this.prisma.shoe.delete({ where: { id } });
  }

  private toResponse(
    shoe: {
      id: number;
      userId: number;
      photoUrl: string;
      brandName: string;
      shoeName: string;
      buyingDate: Date;
      buyingLocation: string | null;
      kilometerTarget: number;
      isDefaultForRunning: boolean;
      isDefaultForWalking: boolean;
      createdAt: Date;
      updatedAt: Date;
    },
    totals: { totalSteps: number; totalDistanceKm: number },
  ): ShoeResponseDto {
    return {
      id: shoe.id,
      userId: shoe.userId,
      photoUrl: shoe.photoUrl,
      brandName: shoe.brandName,
      shoeName: shoe.shoeName,
      buyingDate: shoe.buyingDate,
      buyingLocation: shoe.buyingLocation,
      kilometerTarget: shoe.kilometerTarget,
      totalSteps: totals.totalSteps,
      totalDistanceKm: totals.totalDistanceKm,
      isDefaultForRunning: shoe.isDefaultForRunning,
      isDefaultForWalking: shoe.isDefaultForWalking,
      createdAt: shoe.createdAt,
      updatedAt: shoe.updatedAt,
    };
  }
}
