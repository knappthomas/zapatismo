import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

export default async function run(prisma: PrismaClient): Promise<void> {
  const email = 'thomas@zapatismo.local';
  const password = 'thomas';
  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);

  await prisma.user.upsert({
    where: { email },
    update: { passwordHash },
    create: {
      email,
      passwordHash,
      role: Role.USER,
    },
  });
}
