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
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { BulkAssignShoeDto } from './dto/bulk-assign-shoe.dto';
import { CreateWorkoutDto } from './dto/create-workout.dto';
import { UpdateWorkoutDto } from './dto/update-workout.dto';
import { WorkoutResponseDto } from './dto/workout-response.dto';
import { WorkoutsService } from './workouts.service';

@ApiTags('workouts')
@ApiBearerAuth()
@Controller('workouts')
@Roles(Role.USER)
@UseGuards(RolesGuard)
export class WorkoutsController {
  constructor(private readonly workoutsService: WorkoutsService) {}

  @Get()
  @ApiOkResponse({ type: [WorkoutResponseDto] })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'User role required (admin has no access)' })
  async findAll(@RequestUser('id') userId: number): Promise<WorkoutResponseDto[]> {
    return this.workoutsService.findAll(userId);
  }

  @Post()
  @ApiCreatedResponse({ type: WorkoutResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error or invalid shoe reference' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'User role required' })
  async create(
    @RequestUser('id') userId: number,
    @Body() dto: CreateWorkoutDto,
  ): Promise<WorkoutResponseDto> {
    return this.workoutsService.create(userId, dto);
  }

  @Patch('bulk-assign-shoe')
  @ApiOkResponse({ type: [WorkoutResponseDto], description: 'List of updated workouts' })
  @ApiBadRequestResponse({ description: 'Validation error or shoe not found/not owned' })
  @ApiNotFoundResponse({ description: 'One or more workouts not found or do not belong to user' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'User role required' })
  async bulkAssignShoe(
    @RequestUser('id') userId: number,
    @Body() dto: BulkAssignShoeDto,
  ): Promise<WorkoutResponseDto[]> {
    return this.workoutsService.bulkAssignShoe(userId, dto);
  }

  @Get(':id')
  @ApiOkResponse({ type: WorkoutResponseDto })
  @ApiNotFoundResponse({ description: 'Workout not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'User role required' })
  async findOne(
    @Param('id', ParseIntPipe) id: number,
    @RequestUser('id') userId: number,
  ): Promise<WorkoutResponseDto> {
    return this.workoutsService.findOne(id, userId);
  }

  @Patch(':id')
  @ApiOkResponse({ type: WorkoutResponseDto })
  @ApiBadRequestResponse({ description: 'Validation error or invalid shoe reference' })
  @ApiNotFoundResponse({ description: 'Workout not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'User role required' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @RequestUser('id') userId: number,
    @Body() dto: UpdateWorkoutDto,
  ): Promise<WorkoutResponseDto> {
    return this.workoutsService.update(id, userId, dto);
  }

  @Delete(':id')
  @ApiNoContentResponse({ description: 'Workout deleted' })
  @ApiNotFoundResponse({ description: 'Workout not found' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  @ApiForbiddenResponse({ description: 'User role required' })
  async remove(
    @Param('id', ParseIntPipe) id: number,
    @RequestUser('id') userId: number,
  ): Promise<void> {
    return this.workoutsService.remove(id, userId);
  }
}
