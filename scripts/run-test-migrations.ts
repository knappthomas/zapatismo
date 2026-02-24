/**
 * Test migrations runner: applies data-only migrations from prisma/test-migrations/
 * only in development or stage. Never run in production.
 *
 * Environment gate: runs only when NODE_ENV=development, APP_ENV=stage, or RUN_TEST_MIGRATIONS=true.
 * Supports .sql files (executed as raw SQL) and .ts files (default export function receiving prisma).
 */

import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const TEST_MIGRATIONS_DIR = path.join(__dirname, '..', 'prisma', 'test-migrations');

function isTestMigrationsAllowed(): boolean {
  const nodeEnv = process.env.NODE_ENV;
  const appEnv = process.env.APP_ENV;
  const runTest = process.env.RUN_TEST_MIGRATIONS === 'true';
  if (runTest) return true;
  if (nodeEnv === 'development') return true;
  if (appEnv === 'stage') return true;
  return false;
}

async function main(): Promise<void> {
  if (!isTestMigrationsAllowed()) {
    console.log('Test migrations skipped (not in development/stage and RUN_TEST_MIGRATIONS not set).');
    return;
  }

  const prisma = new PrismaClient();

  if (!fs.existsSync(TEST_MIGRATIONS_DIR)) {
    console.log('No prisma/test-migrations directory; nothing to run.');
    await prisma.$disconnect();
    return;
  }

  const files = fs.readdirSync(TEST_MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql') || f.endsWith('.ts'))
    .sort();

  if (files.length === 0) {
    console.log('No test migration files found.');
    await prisma.$disconnect();
    return;
  }

  const applied = await prisma.testMigration.findMany().then((rows) => new Set(rows.map((r) => r.name)));

  for (const file of files) {
    const name = file;
    if (applied.has(name)) {
      console.log(`Skip (already applied): ${name}`);
      continue;
    }

    const filePath = path.join(TEST_MIGRATIONS_DIR, file);
    if (file.endsWith('.sql')) {
      const sql = fs.readFileSync(filePath, 'utf-8');
      const statements = sql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));
      for (const statement of statements) {
        if (statement.length > 0) {
          await prisma.$executeRawUnsafe(statement + ';');
        }
      }
    } else if (file.endsWith('.ts')) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mod = require(path.resolve(filePath));
      const run = mod.default ?? mod.run;
      if (typeof run !== 'function') {
        throw new Error(`Test migration ${name} must export default or run(prisma) function.`);
      }
      await run(prisma);
    }

    await prisma.testMigration.create({ data: { name } });
    console.log(`Applied: ${name}`);
  }

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error('Test migrations failed:', e);
  process.exit(1);
});
