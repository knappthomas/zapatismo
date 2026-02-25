import { Body, Controller, Get, Param, ParseIntPipe, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateShoeDto } from './dto/create-shoe.dto';
import { ShoeResponseDto } from './dto/shoe-response.dto';
import { ShoesService } from './shoes.service';

@ApiTags('shoes')
@ApiBearerAuth()
@Controller('shoes')
export class ShoesController {
  constructor(private readonly shoesService: ShoesService) {}

  @Post()
  @ApiCreatedResponse({ type: ShoeResponseDto })
  @ApiBadRequestResponse({ description: 'Invalid payload or image data URL' })
  async create(@Body() dto: CreateShoeDto): Promise<ShoeResponseDto> {
    return this.shoesService.create(dto);
  }

  @Get()
  @ApiOkResponse({ type: [ShoeResponseDto] })
  async findAll(): Promise<ShoeResponseDto[]> {
    return this.shoesService.findAll();
  }

  @Get(':id')
  @ApiOkResponse({ type: ShoeResponseDto })
  @ApiNotFoundResponse({ description: 'Shoe pair not found' })
  async findOne(@Param('id', ParseIntPipe) id: number): Promise<ShoeResponseDto> {
    return this.shoesService.findOne(id);
  }
}
