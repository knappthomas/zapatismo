import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { WorkoutType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { ShoesService } from '../shoes/shoes.service';
import { WorkoutsService } from '../workouts/workouts.service';
import {
  StravaActivitySummary,
  StravaTokenResponse,
} from './strava-api.types';

const STRAVA_AUTHORIZE_URL = 'https://www.strava.com/oauth/authorize';
const STRAVA_TOKEN_URL = 'https://www.strava.com/oauth/token';
const STRAVA_DEAUTHORIZE_URL = 'https://www.strava.com/oauth/deauthorize';
const STRAVA_ACTIVITIES_URL = 'https://www.strava.com/api/v3/athlete/activities';
const STRAVA_SCOPE = 'activity:read_all';

/** Strava activity types we import; map to WorkoutType */
const RUNNING_TYPES = new Set([
  'Run',
  'VirtualRun',
  'Treadmill',
]);
const WALKING_TYPES = new Set([
  'Walk',
  'Hike',
  'VirtualWalk',
]);

@Injectable()
export class StravaService {
  private readonly logger = new Logger(StravaService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly shoesService: ShoesService,
    private readonly workoutsService: WorkoutsService,
  ) { }

  getAuthorizeUrl(userId: number): { url: string } {
    const clientId = this.config.get<string>('STRAVA_CLIENT_ID');
    const callbackUrl = this.config.get<string>('STRAVA_CALLBACK_URL');
    if (!clientId || !callbackUrl) {
      throw new BadGatewayException(
        'Strava integration is not configured (missing STRAVA_CLIENT_ID or STRAVA_CALLBACK_URL)',
      );
    }
    const state = this.jwt.sign(
      { sub: userId },
      { expiresIn: '15m' },
    );
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      response_type: 'code',
      scope: STRAVA_SCOPE,
      state,
    });
    return { url: `${STRAVA_AUTHORIZE_URL}?${params.toString()}` };
  }

  async handleCallback(state: string, code: string): Promise<{ redirectUrl: string }> {
    let userId: number;
    try {
      const payload = this.jwt.verify<{ sub: number }>(state);
      userId = payload.sub;
    } catch {
      throw new BadRequestException('Invalid or expired state');
    }
    if (!code) {
      throw new BadRequestException('Missing authorization code');
    }

    const clientId = this.config.get<string>('STRAVA_CLIENT_ID');
    const clientSecret = this.config.get<string>('STRAVA_CLIENT_SECRET');
    const callbackUrl = this.config.get<string>('STRAVA_CALLBACK_URL');
    const frontendUrl = this.config.get<string>('FRONTEND_URL', 'http://localhost:4200');

    if (!clientId || !clientSecret || !callbackUrl) {
      this.logger.warn('Strava OAuth callback: missing env config');
      throw new BadGatewayException('Strava integration is not configured');
    }

    const tokenRes = await this.exchangeCode(clientId, clientSecret, code, callbackUrl);
    if (!tokenRes) {
      throw new BadGatewayException('Failed to exchange Strava authorization code');
    }

    await this.prisma.stravaConnection.upsert({
      where: { userId },
      create: {
        userId,
        stravaAthleteId: String(tokenRes.athlete?.id ?? ''),
        refreshToken: tokenRes.refresh_token,
        accessToken: tokenRes.access_token,
        expiresAt: new Date(tokenRes.expires_at * 1000),
      },
      update: {
        stravaAthleteId: String(tokenRes.athlete?.id ?? ''),
        refreshToken: tokenRes.refresh_token,
        accessToken: tokenRes.access_token,
        expiresAt: new Date(tokenRes.expires_at * 1000),
      },
    });

    const redirectUrl = `${frontendUrl}/settings?strava=connected`;
    return { redirectUrl };
  }

  async getStatus(userId: number): Promise<{ connected: boolean }> {
    const conn = await this.prisma.stravaConnection.findUnique({
      where: { userId },
    });
    return { connected: !!conn };
  }

  async getLastSyncAt(userId: number): Promise<{ lastSyncAt: string | null }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { lastStravaSyncAt: true },
    });
    return {
      lastSyncAt: user?.lastStravaSyncAt?.toISOString() ?? null,
    };
  }

  async disconnect(userId: number): Promise<void> {
    const conn = await this.prisma.stravaConnection.findUnique({
      where: { userId },
    });
    if (!conn) {
      return;
    }
    const clientId = this.config.get<string>('STRAVA_CLIENT_ID');
    const clientSecret = this.config.get<string>('STRAVA_CLIENT_SECRET');
    if (clientId && clientSecret) {
      const accessToken = await this.ensureValidAccessToken(conn);
      await this.deauthorize(accessToken);
    }
    await this.prisma.stravaConnection.delete({ where: { userId } });
  }

  async sync(
    userId: number,
    fromDate: string,
  ): Promise<{ imported: number; skipped?: number; message?: string }> {
    const from = new Date(fromDate);
    if (isNaN(from.getTime())) {
      throw new BadRequestException('Invalid fromDate');
    }
    if (from > new Date()) {
      throw new BadRequestException('fromDate must not be in the future');
    }

    const conn = await this.prisma.stravaConnection.findUnique({
      where: { userId },
    });
    if (!conn) {
      throw new BadRequestException(
        'Strava account not connected. Connect your Strava account in Settings first.',
      );
    }

    const accessToken = await this.ensureValidAccessToken(conn);
    const after = Math.floor(from.getTime() / 1000);
    const before = Math.floor(Date.now() / 1000);

    const defaultShoeId = await this.shoesService.findDefaultShoeId(userId);

    const activities = await this.fetchActivities(accessToken, after, before);
    let imported = 0;
    let skipped = 0;

    for (const act of activities) {
      const workoutType = this.mapStravaTypeToWorkoutType(act.type);
      if (!workoutType) {
        skipped += 1;
        continue;
      }

      const startTime = new Date(act.start_date);
      const endTime = new Date(startTime.getTime() + act.moving_time * 1000);
      const distanceKm = act.distance / 1000;
      const location = act.name?.slice(0, 50) || 'Strava';

      const result = await this.workoutsService.createByExternalId(userId, {
        externalId: String(act.id),
        type: workoutType,
        startTime,
        endTime,
        steps: 0,
        distanceKm,
        location,
        shoeId: defaultShoeId ?? undefined,
      });
      if (result.created) {
        imported += 1;
      }
    }

    await this.prisma.user.update({
      where: { id: userId },
      data: { lastStravaSyncAt: new Date() },
    });

    return {
      imported,
      skipped,
      message: `Imported ${imported} workout(s). ${skipped > 0 ? `${skipped} activity(ies) skipped (not running/walking).` : ''}`.trim(),
    };
  }

  /**
   * Handle Strava webhook subscription verification (GET). Returns hub.challenge if token matches.
   */
  handleWebhookVerify(
    mode: string,
    verifyToken: string,
    challenge: string,
  ): { 'hub.challenge': string } | null {
    const expectedToken = this.config.get<string>('STRAVA_WEBHOOK_VERIFY_TOKEN');
    if (mode === 'subscribe' && expectedToken && verifyToken === expectedToken) {
      return { 'hub.challenge': challenge };
    }
    return null;
  }

  /**
   * Handle Strava webhook event (POST). On athlete deauthorization, clear stored connection.
   */
  async handleWebhookEvent(payload: {
    object_type?: string;
    aspect_type?: string;
    updates?: { authorized?: string };
    owner_id?: number;
  }): Promise<void> {
    if (
      payload.object_type === 'athlete' &&
      payload.aspect_type === 'update' &&
      payload.updates?.authorized === 'false' &&
      payload.owner_id != null
    ) {
      const athleteId = String(payload.owner_id);
      const deleted = await this.prisma.stravaConnection.deleteMany({
        where: { stravaAthleteId: athleteId },
      });
      if (deleted.count > 0) {
        this.logger.log(`Strava connection removed for athlete ${athleteId} (deauthorization)`);
      }
    }
  }

  /**
   * Map Strava activity type string to internal WorkoutType. Returns null if not running/walking.
   */
  mapStravaTypeToWorkoutType(stravaType: string): WorkoutType | null {
    const t = stravaType?.trim();
    if (RUNNING_TYPES.has(t)) return WorkoutType.RUNNING;
    if (WALKING_TYPES.has(t)) return WorkoutType.WALKING;
    return null;
  }

  private async exchangeCode(
    clientId: string,
    clientSecret: string,
    code: string,
    redirectUri: string,
  ): Promise<StravaTokenResponse | null> {
    try {
      const res = await fetch(STRAVA_TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri,
        }),
      });
      if (!res.ok) {
        this.logger.warn(`Strava token exchange failed: ${res.status}`);
        return null;
      }
      return (await res.json()) as StravaTokenResponse;
    } catch (err) {
      this.logger.warn('Strava token exchange error', err);
      return null;
    }
  }

  private async ensureValidAccessToken(conn: {
    accessToken: string;
    refreshToken: string;
    expiresAt: Date;
    userId: number;
  }): Promise<string> {
    const bufferSeconds = 60;
    const expiresAt = conn.expiresAt.getTime();
    if (Date.now() < expiresAt - bufferSeconds * 1000) {
      return conn.accessToken;
    }

    const clientId = this.config.get<string>('STRAVA_CLIENT_ID');
    const clientSecret = this.config.get<string>('STRAVA_CLIENT_SECRET');
    if (!clientId || !clientSecret) {
      throw new BadGatewayException('Strava integration is not configured');
    }

    const res = await fetch(STRAVA_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        refresh_token: conn.refreshToken,
        grant_type: 'refresh_token',
      }),
    });
    if (!res.ok) {
      this.logger.warn(`Strava token refresh failed: ${res.status}`);
      throw new BadGatewayException(
        'Strava token expired. Please reconnect your Strava account in Settings.',
      );
    }
    const data = (await res.json()) as StravaTokenResponse;
    await this.prisma.stravaConnection.update({
      where: { userId: conn.userId },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token ?? conn.refreshToken,
        expiresAt: new Date(data.expires_at * 1000),
      },
    });
    return data.access_token;
  }

  private async deauthorize(accessToken: string): Promise<void> {
    try {
      const res = await fetch(STRAVA_DEAUTHORIZE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ access_token: accessToken }),
      });
      if (!res.ok) {
        this.logger.warn(`Strava deauthorize failed: ${res.status}`);
      }
    } catch (err) {
      this.logger.warn('Strava deauthorize error', err);
    }
  }

  private async fetchActivities(
    accessToken: string,
    after: number,
    before: number,
  ): Promise<StravaActivitySummary[]> {
    const all: StravaActivitySummary[] = [];
    let page = 1;
    const perPage = 30;

    for (; ;) {
      const params = new URLSearchParams({
        after: String(after),
        before: String(before),
        page: String(page),
        per_page: String(perPage),
      });
      const res = await fetch(`${STRAVA_ACTIVITIES_URL}?${params.toString()}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) {
        this.logger.warn(`Strava activities list failed: ${res.status}`);
        throw new BadGatewayException(
          'Could not fetch activities from Strava. Please try again or reconnect in Settings.',
        );
      }
      const pageActivities = (await res.json()) as StravaActivitySummary[];
      all.push(...pageActivities);
      if (pageActivities.length < perPage) break;
      page += 1;
    }

    return all;
  }
}
