import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBadRequestResponse,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { CreateShoeDto } from './dto/create-shoe.dto';
import { ShoeResponseDto } from './dto/shoe-response.dto';
import { UpdateShoeDto } from './dto/update-shoe.dto';
import { ShoesService } from './shoes.service';

@ApiTags('shoes')
@ApiBearerAuth()
@Controller('shoes')
@Roles(Role.USER)
@UseGuards(RolesGuard)
export class ShoesController {
  constructor(private readonly shoesService: ShoesService) {}

  @Get()
  @ApiOkResponse({ type: [ShoeResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'User role required (admin has no access)' })
  async findAll(@RequestUser('id') userId: number): Promise<ShoeResponseDto[]> {
    return this.shoesService.findAll(userId);
  }

  @Post()
  @ApiCreatedResponse({ type: ShoeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'User role required' })
  async create(
    @RequestUser('id') userId: number,
    @Body() dto: CreateShoeDto,
  ): Promise<ShoeResponseDto> {
    return this.shoesService.create(userId, dto);
  }

  @Get(':id')
  @ApiOkResponse({ type: ShoeResponseDto })
  @ApiNotFoundResponse({ description: 'Shoe not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'User role required' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @RequestUser('id') userId: number,
  ): Promise<ShoeResponseDto> {
    return this.shoesService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOkResponse({ type: ShoeResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error' })
  @ApiNotFoundResponse({ description: 'Shoe not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'User role required' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @RequestUser('id') userId: number,
    @Body() dto: UpdateShoeDto,
  ): Promise<ShoeResponseDto> {
    return this.shoesService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiNoContentResponse({ description: 'Shoe deleted' })
  @ApiNotFoundResponse({ description: 'Shoe not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'User role required' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @RequestUser('id') userId: number,
  ): Promise<void> {
    return this.shoesService.remove(id, userId);
  }
}
