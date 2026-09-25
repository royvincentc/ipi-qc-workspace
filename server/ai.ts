import { GoogleGenerativeAI, FunctionDeclaration, SchemaType } from '@google/generative-ai';
import { db } from './db.js';
import { z } from 'zod';
import { Fault } from './domain.js';
import express from 'express';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const aiRouter = express.Router();

aiRouter.post('/chat', async (req, res) => {
  if (!process.env.GEMINI_API_KEY) {
    throw new Fault(500, 'GEMINI_API_KEY is not configured in the server.');
  }

  const input = z.object({
    messages: z.array(z.object({
      role: z.enum(['user', 'model']),
      parts: z.array(z.any())
    }))
  }).parse(req.body);

  const model = genAI.getGenerativeModel({
    model: 'gemini-1.5-flash',
    tools: [
      {
        functionDeclarations: [
          {
            name: "query_samples",
            description: "Query QC sample records from the database. Use this when the user asks about historical QC samples, out of specification results, etc.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                q: { type: SchemaType.STRING, description: "Text to search in sample id, name, batch" },
                category: { type: SchemaType.STRING, description: "Sample category" },
                limit: { type: SchemaType.INTEGER, description: "Max results" }
              }
            }
          },
          {
            name: "query_audit_logs",
            description: "Query the audit logs to see who did what and when.",
            parameters: {
              type: SchemaType.OBJECT,
              properties: {
                q: { type: SchemaType.STRING, description: "Search query" },
                limit: { type: SchemaType.INTEGER, description: "Max results" }
              }
            }
          }
        ]
      }
    ]
  });

  const chat = model.startChat({
    history: input.messages.slice(0, -1).map(m => ({
      role: m.role,
      parts: m.parts
    }))
  });

  const lastMessage = input.messages[input.messages.length - 1];
  let response = await chat.sendMessage(lastMessage.parts);

  // Simple function calling loop (1 iteration)
  if (response.response.functionCalls && response.response.functionCalls.length > 0) {
    const call = response.response.functionCalls[0];
    let functionResponseData = {};

    try {
      if (call.name === 'query_samples') {
        const { q, category, limit = 50 } = call.args as any;
        const all = (await db.query('SELECT data FROM samples ORDER BY updated_at DESC')).rows.map(x => x.data as any);
        const filtered = all.filter(s => {
          const matchQ = !q || [s.ml, s.name, s.batch, s.received].join(' ').toLowerCase().includes(q.toLowerCase());
          const matchCat = !category || s.category === category;
          return matchQ && matchCat;
        }).slice(0, limit);
        functionResponseData = { samples: filtered };
      } else if (call.name === 'query_audit_logs') {
         const { q, limit = 50 } = call.args as any;
         let qStr = q ? `%${q.toLowerCase()}%` : '%';
         const items = (await db.query(`SELECT id,actor,action,created_at FROM audit WHERE concat_ws(' ',actor,action) ILIKE $1 ORDER BY created_at DESC LIMIT $2`, [qStr, limit])).rows;
         functionResponseData = { logs: items };
      } else {
        functionResponseData = { error: 'Unknown function' };
      }
    } catch (e: any) {
      functionResponseData = { error: e.message };
    }

    response = await chat.sendMessage([{
      functionResponse: {
        name: call.name,
        response: functionResponseData
      }
    }]);
  }

  res.json({
    role: 'model',
    parts: response.response.parts.map(p => {
      if (p.text) return { text: p.text };
      return p; // fallback
    }).filter(p => p.text)
  });
});
