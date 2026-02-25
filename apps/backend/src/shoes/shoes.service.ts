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
    return this.toResponse(shoe);
  }

  async findAll(userId: number): Promise<ShoeResponseDto[]> {
    const shoes = await this.prisma.shoe.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
    return shoes.map((s) => this.toResponse(s));
  }

  async findOne(id: number, userId: number): Promise<ShoeResponseDto> {
    const shoe = await this.prisma.shoe.findFirst({
      where: { id, userId },
    });
    if (!shoe) {
      throw new NotFoundException(`Shoe with id ${id} not found`);
    }
    return this.toResponse(shoe);
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
      },
    });
    return this.toResponse(shoe);
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

  private toResponse(shoe: {
    id: number;
    userId: number;
    photoUrl: string;
    brandName: string;
    shoeName: string;
    buyingDate: Date;
    buyingLocation: string | null;
    kilometerTarget: number;
    createdAt: Date;
    updatedAt: Date;
  }): ShoeResponseDto {
    return {
      id: shoe.id,
      userId: shoe.userId,
      photoUrl: shoe.photoUrl,
      brandName: shoe.brandName,
      shoeName: shoe.shoeName,
      buyingDate: shoe.buyingDate,
      buyingLocation: shoe.buyingLocation,
      kilometerTarget: shoe.kilometerTarget,
      createdAt: shoe.createdAt,
      updatedAt: shoe.updatedAt,
    };
  }
}
