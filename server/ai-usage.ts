import type { Content, GenerateContentConfig, GenerateContentResponse, GoogleGenAI } from '@google/genai';
import { db, type DB } from './db.js';
import { Fault } from './domain.js';
import { requestGemini } from './ai-support.js';

export function assistantLimits() {
  const positive = (name: string, fallback: number) => {
    const value = Number(process.env[name]);
    return Number.isSafeInteger(value) && value > 0 && value <= 2_147_483_647 ? value : fallback;
  };
  return {
    chats: positive('AI_CHAT_REQUESTS_PER_HOUR', 30),
    titles: positive('AI_TITLE_REQUESTS_PER_HOUR', 30),
    tokens: positive('AI_TOKENS_PER_HOUR', 200_000)
  };
}

export function assistantRetryAfter() {
  return Math.max(1, Math.ceil((3_600_000 - Date.now() % 3_600_000) / 1000));
}

// Atomic reservations are shared across tabs, restarts and server copies.
export async function reserveAssistantUsage(email: string, charge: { chat?: number; title?: number; tokens?: number }, connection: DB = db) {
  const limits = assistantLimits();
  const increments = [charge.chat || 0, charge.title || 0, charge.tokens || 0];
  const maximums = [limits.chats, limits.titles, limits.tokens];
  if (increments.some((value, index) => !Number.isSafeInteger(value) || value < 0 || value > maximums[index])) {
    throw new Fault(429, 'This request exceeds the hourly assistant allowance. Start a shorter chat or try again next hour.');
  }
  const row = (await connection.query(`
    INSERT INTO ai_usage(email,window_start,chat_requests,title_requests,tokens)
    VALUES($1,date_trunc('hour',now() AT TIME ZONE 'UTC') AT TIME ZONE 'UTC',$2,$3,$4)
    ON CONFLICT(email) DO UPDATE SET
      window_start=EXCLUDED.window_start,
      chat_requests=CASE WHEN ai_usage.window_start<EXCLUDED.window_start THEN $2 ELSE ai_usage.chat_requests+$2 END,
      title_requests=CASE WHEN ai_usage.window_start<EXCLUDED.window_start THEN $3 ELSE ai_usage.title_requests+$3 END,
      tokens=CASE WHEN ai_usage.window_start<EXCLUDED.window_start THEN $4 ELSE ai_usage.tokens+$4 END
    WHERE ai_usage.window_start<EXCLUDED.window_start OR
      (ai_usage.chat_requests+$2<=$5 AND ai_usage.title_requests+$3<=$6 AND ai_usage.tokens+$4<=$7)
    RETURNING window_start`, [email.toLowerCase(), ...increments, ...maximums])).rows[0];
  if (!row) throw new Fault(429, 'Your hourly assistant allowance is used up. Try again when the next hour starts.');
  return row.window_start as string | Date;
}

export async function settleAssistantTokens(email: string, window: string | Date, reserved: number, used: number, connection: DB = db) {
  if (!Number.isSafeInteger(used) || used < 0) return;
  await connection.query('UPDATE ai_usage SET tokens=GREATEST(0,tokens+$3) WHERE email=$1 AND window_start=$2', [email.toLowerCase(), window, used - reserved]);
}

export function assistantBudget(email: string, ai: GoogleGenAI, model: string, config: GenerateContentConfig) {
  let spent = 0;
  return async (contents: Content[], send: () => Promise<GenerateContentResponse>) => {
    const count = await requestGemini(() => ai.models.countTokens({
      model,
      // Developer API token counting omits system/tools options; count their text too.
      contents: [{ role: 'user', parts: [{ text: JSON.stringify({ systemInstruction: config.systemInstruction, tools: config.tools }) }] }, ...contents],
      config: { abortSignal: config.abortSignal }
    }));
    if (!Number.isSafeInteger(count.totalTokens) || count.totalTokens! < 0) throw new Error('Gemini did not provide a token count');
    const reserved = count.totalTokens! + (config.maxOutputTokens || 2048) + 256;
    if (spent + reserved > 50_000) throw new Fault(400, 'This chat needs too much processing. Start a new chat or narrow your question.');
    const window = await reserveAssistantUsage(email, { tokens: reserved });
    spent += reserved;
    // Failed/aborted calls keep their reservation because Google may still bill them.
    const response = await requestGemini(send);
    const used = response.usageMetadata?.totalTokenCount;
    if (Number.isSafeInteger(used) && used! >= 0) {
      await settleAssistantTokens(email, window, reserved, used!);
      spent += used! - reserved;
    }
    return response;
  };
}
