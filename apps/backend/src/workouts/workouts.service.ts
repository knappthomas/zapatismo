import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkoutType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { WorkoutResponseDto } from './dto/workout-response.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';

@Injectable()
export class WorkoutsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateWorkoutDto): Promise<WorkoutResponseDto> {
    this.validateEndAfterStart(dto.startTime, dto.endTime);
    if (dto.shoeId != null) {
      await this.ensureShoeBelongsToUser(dto.shoeId, userId);
    }

    const workout = await this.prisma.workout.create({
      data: {
        userId,
        type: dto.type as WorkoutType,
        startTime: new Date(dto.startTime),
        endTime: new Date(dto.endTime),
        steps: dto.steps,
        distanceKm: dto.distanceKm,
        location: dto.location,
        shoeId: dto.shoeId ?? null,
      },
      include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
    });
    return this.toResponse(workout);
  }

  async findAll(userId: number): Promise<WorkoutResponseDto[]> {
    const workouts = await this.prisma.workout.findMany({
      where: { userId },
      orderBy: { startTime: 'desc' },
      include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
    });
    return workouts.map((w) => this.toResponse(w));
  }

  async findOne(id: number, userId: number): Promise<WorkoutResponseDto> {
    const workout = await this.prisma.workout.findFirst({
      where: { id, userId },
      include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
    });
    if (!workout) {
      throw new NotFoundException(`Workout with id ${id} not found`);
    }
    return this.toResponse(workout);
  }

  async update(
    id: number,
    userId: number,
    dto: UpdateWorkoutDto,
  ): Promise<WorkoutResponseDto> {
    const existing = await this.prisma.workout.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Workout with id ${id} not found`);
    }

    if (dto.startTime != null || dto.endTime != null) {
      const start = dto.startTime != null ? new Date(dto.startTime) : existing.startTime;
      const end = dto.endTime != null ? new Date(dto.endTime) : existing.endTime;
      this.validateEndAfterStart(start.toISOString(), end.toISOString());
    }
    if (dto.shoeId !== undefined) {
      if (dto.shoeId != null) {
        await this.ensureShoeBelongsToUser(dto.shoeId, userId);
      }
    }

    const workout = await this.prisma.workout.update({
      where: { id },
      data: {
        ...(dto.type !== undefined && { type: dto.type as WorkoutType }),
        ...(dto.startTime !== undefined && { startTime: new Date(dto.startTime) }),
        ...(dto.endTime !== undefined && { endTime: new Date(dto.endTime) }),
        ...(dto.steps !== undefined && { steps: dto.steps }),
        ...(dto.distanceKm !== undefined && { distanceKm: dto.distanceKm }),
        ...(dto.location !== undefined && { location: dto.location }),
        ...(dto.shoeId !== undefined && { shoeId: dto.shoeId ?? null }),
      },
      include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
    });
    return this.toResponse(workout);
  }

  async remove(id: number, userId: number): Promise<void> {
    const existing = await this.prisma.workout.findFirst({
      where: { id, userId },
    });
    if (!existing) {
      throw new NotFoundException(`Workout with id ${id} not found`);
    }
    await this.prisma.workout.delete({ where: { id } });
  }

  /**
   * Idempotent create by external ID (e.g. Strava activity ID). Used by Strava sync only.
   * If a workout with this userId and externalId already exists, returns { created: false }.
   */
  async createByExternalId(
    userId: number,
    data: {
      externalId: string;
      type: WorkoutType;
      startTime: Date;
      endTime: Date;
      steps: number;
      distanceKm: number;
      location: string;
      shoeId?: number | null;
    },
  ): Promise<{ created: boolean; workout?: WorkoutResponseDto }> {
    const existing = await this.prisma.workout.findFirst({
      where: { userId, externalId: data.externalId },
      include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
    });
    if (existing) {
      return { created: false };
    }
    if (data.shoeId != null) {
      await this.ensureShoeBelongsToUser(data.shoeId, userId);
    }
    const workout = await this.prisma.workout.create({
      data: {
        userId,
        externalId: data.externalId,
        type: data.type,
        startTime: data.startTime,
        endTime: data.endTime,
        steps: data.steps,
        distanceKm: data.distanceKm,
        location: data.location,
        shoeId: data.shoeId ?? null,
      },
      include: { shoe: { select: { id: true, brandName: true, shoeName: true } } },
    });
    return { created: true, workout: this.toResponse(workout) };
  }

  private validateEndAfterStart(startTime: string, endTime: string): void {
    const start = new Date(startTime).getTime();
    const end = new Date(endTime).getTime();
    if (end < start) {
      throw new BadRequestException('endTime must be after or equal to startTime');
    }
  }

  private async ensureShoeBelongsToUser(shoeId: number, userId: number): Promise<void> {
    const shoe = await this.prisma.shoe.findFirst({
      where: { id: shoeId, userId },
    });
    if (!shoe) {
      throw new BadRequestException('Shoe not found or does not belong to user');
    }
  }

  private toResponse(workout: {
    id: number;
    userId: number;
    type: WorkoutType;
    startTime: Date;
    endTime: Date;
    steps: number;
    distanceKm: number;
    location: string;
    shoeId: number | null;
    createdAt: Date;
    updatedAt: Date;
    shoe?: { id: number; brandName: string; shoeName: string } | null;
    externalId?: string | null;
  }): WorkoutResponseDto {
    return {
      id: workout.id,
      userId: workout.userId,
      type: workout.type,
      startTime: workout.startTime,
      endTime: workout.endTime,
      steps: workout.steps,
      distanceKm: workout.distanceKm,
      location: workout.location,
      shoeId: workout.shoeId ?? undefined,
      shoe: workout.shoe
        ? {
            id: workout.shoe.id,
            brandName: workout.shoe.brandName,
            shoeName: workout.shoe.shoeName,
          }
        : undefined,
      createdAt: workout.createdAt,
      updatedAt: workout.updatedAt,
    };
  }
}
