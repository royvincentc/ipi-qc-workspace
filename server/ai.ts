import { GoogleGenAI, type FunctionDeclaration } from '@google/genai';
import { db } from './db.js';
import { z } from 'zod';
import { Fault } from './domain.js';
import express from 'express';
import { prepareAssistantChat, publicGeminiError } from './ai-support.js';

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

aiRouter.post('/chat', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Fault(503, 'Smart Assistant is not configured. Ask an administrator to add GEMINI_API_KEY and redeploy the service.');
  }

  try {
    const input = inputSchema.parse(req.body);
    const { history, lastMessage } = prepareAssistantChat(input.messages);
    const ai = new GoogleGenAI({ apiKey });
    const chat = ai.chats.create({
      model: process.env.GEMINI_MODEL?.trim() || 'gemini-3.8-flash',
      history,
      config: {
        systemInstruction: 'You are Miss Minutes, the cheerful, slightly eerie, Southern-drawling AI assistant for the IPI QC Microbiology workspace. Greet the user warmly (e.g. "Hey y\'all!", "Howdy hun!"). Keep the Timeline (laboratory records) in perfect order. Use only returned records. Never invent laboratory data, infer pass/fail, or claim a sample is released. State when records are insufficient, but do it with a smile and a reminder to stay on the Sacred Timeline! Always try to interact and ask a follow-up question.',
        tools: [{ functionDeclarations: [querySamples, queryAuditLogs] }]
      }
    });

    let response = await chat.sendMessage({ message: lastMessage.parts });
    const call = response.functionCalls?.[0];
    if (call) {
      let functionResponseData: Record<string, unknown>;
      if (call.name === 'query_samples') {
        const { q, category, limit } = sampleArgs.parse(call.args || {});
        const all = (await db.query('SELECT data FROM samples ORDER BY updated_at DESC')).rows.map(row => row.data as any);
        const normalized = q?.toLowerCase();
        const samples = all.filter(sample => (
          !normalized || [sample.ml, sample.name, sample.batch, sample.received].join(' ').toLowerCase().includes(normalized)
        ) && (!category || sample.category === category)).slice(0, limit);
        functionResponseData = { samples };
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

      response = await chat.sendMessage({
        message: [{ functionResponse: { name: call.name || 'unknown', response: functionResponseData } }]
      });
    }

    const text = response.text?.trim();
    if (!text) throw new Error('Gemini returned an empty response');
    res.json({ role: 'model', parts: [{ text }] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new Fault(400, 'The assistant request was malformed. Clear the chat and try again.');
    }
    const publicError = publicGeminiError(error);
    console.error('Gemini request failed', { category: publicError.category, status: publicError.status });
    throw new Fault(publicError.status, publicError.message);
  }
});
