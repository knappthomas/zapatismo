import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Post,
  Query,
  Res,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiOkResponse,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { Public } from '../auth/decorators/public.decorator';
import { RequestUser } from '../auth/decorators/request-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthorizeUrlResponseDto } from './dto/authorize-url-response.dto';
import { LastSyncResponseDto } from './dto/last-sync-response.dto';
import { StravaStatusDto } from './dto/strava-status.dto';
import { SyncRequestDto } from './dto/sync-request.dto';
import { SyncResponseDto } from './dto/sync-response.dto';
import { StravaService } from './strava.service';

@ApiTags('strava')
@ApiBearerAuth()
@Controller('strava')
export class StravaController {
  constructor(private readonly stravaService: StravaService) {}

  @Get('authorize-url')
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  @ApiOkResponse({ type: AuthorizeUrlResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  getAuthorizeUrl(@RequestUser('id') userId: number): AuthorizeUrlResponseDto {
    return this.stravaService.getAuthorizeUrl(userId);
  }

  @Get('callback')
  @Public()
  @ApiOkResponse({ description: 'Redirects to frontend Settings after OAuth' })
  @ApiBadRequestResponse({ description: 'Invalid or missing code/state' })
  async handleCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Res() res: Response,
  ): Promise<void> {
    if (!state) {
      throw new UnauthorizedException('Missing state');
    }
    const { redirectUrl } = await this.stravaService.handleCallback(
      state,
      code ?? '',
    );
    res.redirect(302, redirectUrl);
  }

  @Get('status')
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  @ApiOkResponse({ type: StravaStatusDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getStatus(@RequestUser('id') userId: number): Promise<StravaStatusDto> {
    return this.stravaService.getStatus(userId);
  }

  @Get('last-sync')
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  @ApiOkResponse({ type: LastSyncResponseDto })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async getLastSync(
    @RequestUser('id') userId: number,
  ): Promise<LastSyncResponseDto> {
    return this.stravaService.getLastSyncAt(userId);
  }

  @Post('disconnect')
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  @ApiOkResponse({ description: 'Strava disconnected' })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async disconnect(@RequestUser('id') userId: number): Promise<void> {
    await this.stravaService.disconnect(userId);
  }

  @Post('sync')
  @Roles(Role.USER)
  @UseGuards(RolesGuard)
  @ApiOkResponse({ type: SyncResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid fromDate or Strava not connected',
  })
  @ApiUnauthorizedResponse({ description: 'Unauthorized' })
  async sync(
    @RequestUser('id') userId: number,
    @Body() dto: SyncRequestDto,
  ): Promise<SyncResponseDto> {
    return this.stravaService.sync(userId, dto.fromDate);
  }

  @Get('webhook')
  @Public()
  @ApiOkResponse({ description: 'Webhook subscription verification' })
  webhookVerify(
    @Query('hub.mode') mode: string,
    @Query('hub.verify_token') verifyToken: string,
    @Query('hub.challenge') challenge: string,
    @Res() res: Response,
  ): void {
    const result = this.stravaService.handleWebhookVerify(
      mode ?? '',
      verifyToken ?? '',
      challenge ?? '',
    );
    if (result) {
      res.status(200).json(result);
    } else {
      throw new ForbiddenException('Webhook verification failed');
    }
  }

  @Post('webhook')
  @Public()
  @ApiOkResponse({ description: 'Webhook event acknowledged' })
  async webhookEvent(@Body() payload: Record<string, unknown>, @Res() res: Response): Promise<void> {
    await this.stravaService.handleWebhookEvent({
      object_type: payload.object_type as string | undefined,
      aspect_type: payload.aspect_type as string | undefined,
      updates: payload.updates as { authorized?: string } | undefined,
      owner_id: payload.owner_id as number | undefined,
    });
    res.status(200).send();
  }
}
