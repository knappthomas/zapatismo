import { WorkoutType } from '@prisma/client';
import { PrismaClient } from '@prisma/client';

const THOMAS_EMAIL = 'thomas@zapatismo.local';

export default async function run(prisma: PrismaClient): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: THOMAS_EMAIL },
  });

  if (!user) {
    throw new Error(
      `Test migration 00004_workouts_for_thomas requires user ${THOMAS_EMAIL} (run 00002_thomas_user.ts first)`,
    );
  }

  const shoe = await prisma.shoe.findFirst({
    where: { userId: user.id, shoeName: 'Gel-Kayano 32' },
  });

  const existing = await prisma.workout.findFirst({
    where: { userId: user.id, location: 'Villach Park' },
  });
  if (existing) return;

  await prisma.workout.create({
    data: {
      userId: user.id,
      type: WorkoutType.RUNNING,
      startTime: new Date('2025-02-20T08:00:00.000Z'),
      endTime: new Date('2025-02-20T09:15:00.000Z'),
      steps: 12000,
      distanceKm: 12.5,
      location: 'Villach Park',
      shoeId: shoe?.id ?? null,
    },
  });

  const existing2 = await prisma.workout.findFirst({
    where: { userId: user.id, location: 'Central Park' },
  });
  if (existing2) return;

  await prisma.workout.create({
    data: {
      userId: user.id,
      type: WorkoutType.WALKING,
      startTime: new Date('2025-02-22T14:00:00.000Z'),
      endTime: new Date('2025-02-22T15:30:00.000Z'),
      steps: 8000,
      distanceKm: 6.2,
      location: 'Central Park',
      shoeId: null,
    },
  });
}
