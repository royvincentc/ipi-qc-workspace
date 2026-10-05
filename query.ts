import { db } from './server/db.ts';
async function run() {
  const temp = await db.query('SELECT data FROM templates');
  console.log('TEMPLATES:', JSON.stringify(temp.rows.map(r => r.data), null, 2));
  process.exit();
}
run();