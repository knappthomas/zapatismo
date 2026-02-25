import { PrismaClient } from '@prisma/client';

const THOMAS_EMAIL = 'thomas@zapatismo.local';

export default async function run(prisma: PrismaClient): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { email: THOMAS_EMAIL },
  });

  if (!user) {
    throw new Error(
      `Test migration 00003_shoes_for_thomas requires user ${THOMAS_EMAIL} (run 00002_thomas_user.ts first)`,
    );
  }

  const existing = await prisma.shoe.findFirst({
    where: { userId: user.id, shoeName: 'Thomas Running Shoe' },
  });
  if (existing) return;

  await prisma.shoe.create({
    data: {
      userId: user.id,
      photoUrl: 'https://images.asics.com/is/image/asics/1011C052_101_SR_RT_GLB?$sfcc-product$&wid=764&hei=573',
      brandName: 'Asics',
      shoeName: 'Gel-Kayano 32',
      buyingDate: new Date('2025-02-09'),
      buyingLocation: 'Intersport, Villach',
      kilometerTarget: 800,
    },
  });
}
