import 'dotenv/config';
process.env.DEMO_MODE = 'true';
process.env.DEMO_DB_PATH = '.data/migration-test-db';
import fs from 'node:fs';
if (fs.existsSync('.data/migration-test-db')) fs.rmSync('.data/migration-test-db', { recursive: true, force: true });

import { migrate } from '../server/db.js';
import { seed } from '../server/seed.js';
import { getConfiguration } from '../server/configuration.js';

async function run() {
  console.log('Validating migrations...');
  await migrate();
  console.log('Migrations complete.');

  console.log('Validating configuration seeding...');
  await seed();
  const configWrapper = await getConfiguration();
  const config = configWrapper.value;
  console.log('Seeding complete.');

  console.log(`Configured sample types: ${config?.sampleTypes?.length}`);
  console.log(`Configured test parameters: ${config?.tests?.length}`);
  
  if (config?.sampleTypes?.length > 0) {
    console.log('SUCCESS: Migrations and configuration seeding validated on disposable copy.');
  } else {
    throw new Error('Validation failed: Configuration was not seeded correctly.');
  }
}

run().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
