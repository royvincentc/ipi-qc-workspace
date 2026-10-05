import { GoogleGenAI, type FunctionDeclaration } from '@google/genai';
import { db } from './db.js';
import { z } from 'zod';
import { Fault } from './domain.js';
import express from 'express';
import { createGeminiFunctionResponses, prepareAssistantChat, publicAssistantError, requestGemini, GeminiRequestFailure } from './ai-support.js';

const querySamples: FunctionDeclaration = {
  name: 'query_samples',
  description: 'Search authorized QC sample records by control number, name, batch, or category.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      q: { type: 'string', description: 'Text to search in the control number, sample name, batch, or received date' },
      category: { type: 'string', description: 'Exact configured sample category identifier' },
      limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Maximum records to return' }
    }
  }
};

const queryAuditLogs: FunctionDeclaration = {
  name: 'query_audit_logs',
  description: 'Search authorized audit events by actor or action.',
  parametersJsonSchema: {
    type: 'object',
    properties: {
      q: { type: 'string', description: 'Text to search in actor and action' },
      limit: { type: 'integer', minimum: 1, maximum: 50, description: 'Maximum events to return' }
    }
  }
};

const messageSchema = z.object({
  role: z.enum(['user', 'model']),
  parts: z.array(z.object({ text: z.string().min(1).max(8000) })).min(1).max(8)
});
const inputSchema = z.object({ messages: z.array(messageSchema).min(2).max(50) });
const titleInputSchema = z.object({ prompt: z.string().trim().min(1).max(8000) });
const sampleArgs = z.object({
  q: z.string().max(200).optional(),
  category: z.string().max(50).optional(),
  limit: z.number().int().min(1).max(50).default(20)
});
const auditArgs = z.object({
  q: z.string().max(200).optional(),
  limit: z.number().int().min(1).max(50).default(20)
});

export const aiRouter = express.Router();

aiRouter.post('/title', async (req, res) => {
  const { prompt } = titleInputSchema.parse(req.body);
  const fallback = prompt.replace(/\s+/g, ' ').replace(/[.!?]+$/, '').trim().slice(0, 48) + (prompt.length > 48 ? '…' : '');
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) return res.json({ title: fallback });
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
      contents: `Create a concise title for this QC microbiology assistant conversation. Return only the title, no quotes, no punctuation at the end, and keep it under 48 characters. User request: ${prompt}`
    });
    const title = response.text?.trim().replace(/^['"]|['"]$/g, '').slice(0, 48);
    return res.json({ title: title || fallback });
  } catch {
    return res.json({ title: fallback });
  }
});

aiRouter.post('/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Fault(503, 'Smart Assistant is not configured. Ask an administrator to add GEMINI_API_KEY and redeploy the service.');
  }

  let input: z.infer<typeof inputSchema>;
  try {
    input = inputSchema.parse(req.body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Fault(400, 'The assistant request was malformed. Clear the chat and try again.');
    }
    throw error;
  }

  try {
    const { history, lastMessage } = prepareAssistantChat(input.messages);
    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
      history,
      config: {
        systemInstruction: 'You are Miss Minutes, the professional QC Smart Assistant for the IPI Microbiology workspace. Use a concise, factual, respectful tone suitable for a regulated laboratory environment. Do not use slang, roleplay, theatrical language, jokes, themed references, or exaggerated enthusiasm. Clearly distinguish documented records from interpretation. Use only returned records; never invent laboratory data, infer pass/fail, or claim that a sample is released. If records are insufficient, state that plainly and request the specific information needed. Ask a focused follow-up question only when it is necessary to complete the request.',
        tools: [{ functionDeclarations: [querySamples, queryAuditLogs] }]
      }
    });

    let response = await requestGemini(() => chat.sendMessage({ message: lastMessage.parts }));
    let toolRounds = 0;
    while (response.functionCalls?.length) {
      if (toolRounds >= 5) throw new Error('Gemini exceeded the assistant tool-call limit');
      toolRounds += 1;
      const functionResponses: Array<{ call: { id?: string; name?: string }; response: Record<string, unknown> }> = [];

      for (const call of response.functionCalls) {
        let functionResponseData: Record<string, unknown>;
        if (call.name === 'query_samples') {
          const { q, category, limit } = sampleArgs.parse(call.args || {});
          const args: unknown[] = [];
          const filters: string[] = [];
          if (q) {
            args.push(`%${q.replace(/[\\%_]/g, '\\$&')}%`);
            filters.push("concat_ws(' ',data->>'ml',data->>'name',data->>'batch',data->>'received') ILIKE $" + args.length);
          }
          if (category) {
            args.push(category);
            filters.push("data->>'category'=$" + args.length);
          }
          args.push(limit);
          const where = filters.length ? `WHERE ${filters.join(' AND ')}` : '';
          const rows = (await db.query(
            `SELECT jsonb_build_object('id',data->'id','category',data->'category','ml',data->'ml','name',data->'name','batch',data->'batch','received',data->'received','status',data->'status','remarks',data->'remarks','context',data->'context','fields',data->'fields') AS data FROM samples ${where} ORDER BY updated_at DESC LIMIT $${args.length}`,
            args
          )).rows;
          functionResponseData = { samples: rows.map(row => row.data) };
        } else if (call.name === 'query_audit_logs') {
          const { q, limit } = auditArgs.parse(call.args || {});
          const search = q ? `%${q.toLowerCase()}%` : '%';
          const logs = (await db.query(
            `SELECT id,actor,action,created_at FROM audit WHERE concat_ws(' ',actor,action) ILIKE $1 ORDER BY created_at DESC LIMIT $2`,
            [search, limit]
          )).rows;
          functionResponseData = { logs };
        } else {
          functionResponseData = { error: 'Unsupported assistant function' };
        }
        functionResponses.push({ call, response: functionResponseData });
      }

      response = await requestGemini(() => chat.sendMessage({
        // Gemini may issue several function calls in one turn; return one result
        // for every call ID before asking it to continue.
        message: createGeminiFunctionResponses(functionResponses) as unknown as Parameters<typeof chat.sendMessage>[0]['message']
      }));
    }

    const text = response.text?.trim();
    if (!text) throw new Error('Gemini returned an empty response');
    res.json({ role: 'model', parts: [{ text }] });
  } catch (error) {
    if (error instanceof Fault) throw error;
    const publicError = publicAssistantError(error);
    console.error('Smart Assistant request failed', {
      source: error instanceof GeminiRequestFailure ? 'gemini' : 'application',
      category: publicError.category,
      status: publicError.status
    });
    throw new Fault(publicError.status, publicError.message);
  }
});
