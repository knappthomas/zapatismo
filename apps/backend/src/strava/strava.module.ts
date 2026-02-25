import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { ShoesModule } from '../shoes/shoes.module';
import { WorkoutsModule } from '../workouts/workouts.module';
import { StravaController } from './strava.controller';
import { StravaService } from './strava.service';

@Module({
  imports: [
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.getOrThrow<string>('JWT_SECRET'),
        signOptions: { expiresIn: config.get('JWT_EXPIRATION', '1h') },
      }),
    }),
    ShoesModule,
    WorkoutsModule,
  ],
  controllers: [StravaController],
  providers: [StravaService],
  exports: [StravaService],
})
export class StravaModule {}
