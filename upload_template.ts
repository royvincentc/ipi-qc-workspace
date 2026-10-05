import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { db } from './server/db.ts';
import { worker, privatePath } from './server/reports.ts';
import { mkdir, writeFile } from 'fs/promises';
import { createHash } from 'crypto';

async function run() {
  const filePath = 'C:/Users/Roy/.gemini/antigravity/brain/e784925c-0fe7-401e-8db9-427a56560905/.user_uploaded/media_1790522103378.docx';
  const fileData = readFileSync(filePath);
  
  const id = randomUUID();
  await mkdir(privatePath('templates'), { recursive: true });
  const targetFile = 'templates/' + id + '.docx';
  await writeFile(privatePath(targetFile), fileData);
  
  const validation = await worker(['validate', '--input', privatePath(targetFile)]);
  
  const t = {
    id,
    name: 'Auto-Uploaded Template',
    category: 'FG',
    family: 'routine',
    path: targetFile,
    revision: createHash('sha256').update(fileData).digest('base64'),
    manifest: { ...validation, requiredFields: [], resultBindings: [] },
    verified: true
  };
  
  await db.query('INSERT INTO templates(id, data) VALUES($1, $2)', [id, JSON.stringify(t)]);
  console.log('SUCCESS! Template ID: ' + id);
  process.exit(0);
}
run().catch(console.error);
