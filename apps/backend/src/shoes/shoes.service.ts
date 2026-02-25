import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShoeDto } from './dto/create-shoe.dto';
import { ShoeResponseDto } from './dto/shoe-response.dto';

const IMAGE_DATA_URL_PREFIX = 'data:image/';
const MAX_PHOTO_DATA_URL_LENGTH = 7_000_000;

type ShoeRecord = {
  id: number;
  name: string;
  brand: string | null;
  model: string | null;
  color: string | null;
  notes: string | null;
  photoDataUrl: string | null;
  createdAt: Date;
  updatedAt: Date;
};

@Injectable()
export class ShoesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateShoeDto): Promise<ShoeResponseDto> {
    const shoe = await this.prisma.shoePair.create({
      data: this.toCreateInput(dto),
    });

    return this.toResponse(shoe);
  }

  async findAll(): Promise<ShoeResponseDto[]> {
    const shoes = await this.prisma.shoePair.findMany({
      orderBy: { createdAt: 'desc' },
    });

    return shoes.map((shoe) => this.toResponse(shoe));
  }

  async findOne(id: number): Promise<ShoeResponseDto> {
    const shoe = await this.prisma.shoePair.findUnique({ where: { id } });

    if (!shoe) {
      throw new NotFoundException(`Shoe pair with id ${id} not found`);
    }

    return this.toResponse(shoe);
  }

  private toCreateInput(dto: CreateShoeDto): Prisma.ShoePairCreateInput {
    const name = dto.name.trim();
    if (name.length < 2) {
      throw new BadRequestException('Name must be at least 2 characters long');
    }

    const brand = this.toNullableTrimmed(dto.brand);
    const model = this.toNullableTrimmed(dto.model);
    const color = this.toNullableTrimmed(dto.color);
    const notes = this.toNullableTrimmed(dto.notes);
    const photoDataUrl = this.toNullableTrimmed(dto.photoDataUrl);

    if (photoDataUrl && !photoDataUrl.startsWith(IMAGE_DATA_URL_PREFIX)) {
      throw new BadRequestException('Photo must be an image data URL');
    }

    if (photoDataUrl && photoDataUrl.length > MAX_PHOTO_DATA_URL_LENGTH) {
      throw new BadRequestException('Photo is too large');
    }

    return {
      name,
      brand,
      model,
      color,
      notes,
      photoDataUrl,
    };
  }

  private toResponse(shoe: ShoeRecord): ShoeResponseDto {
    return {
      id: shoe.id,
      name: shoe.name,
      brand: shoe.brand,
      model: shoe.model,
      color: shoe.color,
      notes: shoe.notes,
      photoDataUrl: shoe.photoDataUrl,
      createdAt: shoe.createdAt,
      updatedAt: shoe.updatedAt,
    };
  }

  private toNullableTrimmed(value?: string): string | null {
    if (!value) {
      return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
}
