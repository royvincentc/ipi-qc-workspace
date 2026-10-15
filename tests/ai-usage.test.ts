import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp } from 'node:fs/promises';
import path from 'node:path';
import type { GoogleGenAI, GenerateContentResponse } from '@google/genai';

process.env.DEMO_MODE = 'true';
process.env.DOTENV_CONFIG_PATH = path.resolve('tmp/no-test-secrets.env');
process.env.DEMO_DB_PATH = await mkdtemp(path.resolve('.data/ai-usage-test-'));
const { db, migrate, close } = await import('../server/db.js');
const { assistantLimits, assistantBudget, reserveAssistantUsage, settleAssistantTokens } = await import('../server/ai-usage.js');
await migrate();
after(close);

test('hourly allowances are separate per person and request type, with atomic concurrent reservations', async () => {
  process.env.AI_CHAT_REQUESTS_PER_HOUR = '2';
  process.env.AI_TITLE_REQUESTS_PER_HOUR = '1';
  process.env.AI_TOKENS_PER_HOUR = '1000';
  const attempts = await Promise.allSettled(Array.from({ length: 5 }, () => reserveAssistantUsage('user@example.test', { chat: 1 })));
  assert.equal(attempts.filter(item => item.status === 'fulfilled').length, 2);
  const rejected = attempts.find(item => item.status === 'rejected') as PromiseRejectedResult;
  assert.equal(rejected.reason.status, 429);
  await reserveAssistantUsage('user@example.test', { title: 1 });
  await assert.rejects(reserveAssistantUsage('user@example.test', { title: 1 }), error => (error as any).status === 429);
  await reserveAssistantUsage('other@example.test', { chat: 1 });
  const row = (await db.query('SELECT * FROM ai_usage WHERE email=$1', ['user@example.test'])).rows[0];
  assert.equal(row.chat_requests, 2);
  assert.equal(row.title_requests, 1);
});

test('token reservations cannot overspend, reset next hour and never refund a newer window', async () => {
  const email = 'tokens@example.test';
  const oldWindow = await reserveAssistantUsage(email, { tokens: 900 });
  await assert.rejects(reserveAssistantUsage(email, { tokens: 101 }), error => (error as any).status === 429);
  await settleAssistantTokens(email, oldWindow, 900, 500);
  await reserveAssistantUsage(email, { tokens: 500 });
  await db.query("UPDATE ai_usage SET window_start=window_start-interval '1 hour' WHERE email=$1", [email]);
  const window = await reserveAssistantUsage(email, { chat: 1, tokens: 20 });
  await settleAssistantTokens(email, new Date(new Date(window).getTime() - 3_600_000), 1000, 0);
  const row = (await db.query('SELECT * FROM ai_usage WHERE email=$1', [email])).rows[0];
  assert.equal(row.tokens, 20);
  assert.equal(row.chat_requests, 1);
  assert.equal(row.title_requests, 0);
});

test('model costs are reserved before generation, settled on success and retained on uncertain failure', async () => {
  process.env.AI_TOKENS_PER_HOUR = '200000';
  const ai = { models: { countTokens: async () => ({ totalTokens: 100 }) } } as unknown as GoogleGenAI;
  const budget = assistantBudget('budget@example.test', ai, 'test-model', { maxOutputTokens: 200 });
  const response = { usageMetadata: { totalTokenCount: 120 } } as GenerateContentResponse;
  assert.equal(await budget([], async () => response), response);
  await assert.rejects(budget([], async () => { throw new Error('upstream failed'); }));
  assert.equal((await db.query('SELECT tokens FROM ai_usage WHERE email=$1', ['budget@example.test'])).rows[0].tokens, 676);
  const oversized = { models: { countTokens: async () => ({ totalTokens: 50_000 }) } } as unknown as GoogleGenAI;
  let sent = false;
  await assert.rejects(assistantBudget('large@example.test', oversized, 'test', { maxOutputTokens: 200 })([], async () => { sent = true; return response; }));
  assert.equal(sent, false);
});

test('invalid configured limits use safe defaults', () => {
  process.env.AI_CHAT_REQUESTS_PER_HOUR = '0';
  process.env.AI_TITLE_REQUESTS_PER_HOUR = '-10';
  process.env.AI_TOKENS_PER_HOUR = 'invalid';
  assert.deepEqual(assistantLimits(), { chats: 30, titles: 30, tokens: 200_000 });
});
