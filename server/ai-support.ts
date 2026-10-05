export interface AssistantMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
}

export class GeminiRequestFailure extends Error {
  constructor(readonly upstream: unknown) {
    super('Gemini request failed');
    this.name = 'GeminiRequestFailure';
  }
}

export async function requestGemini<T>(request: () => Promise<T>): Promise<T> {
  try {
    return await request();
  } catch (error) {
    throw new GeminiRequestFailure(error);
  }
}

export function createGeminiFunctionResponse(
  call: { id?: string; name?: string },
  response: Record<string, unknown>
) {
  if (!call.id) throw new Error('Gemini function call did not include an id');
  // @google/genai rejects function-response parts unless they are wrapped in
  // a Content object. The function result is a user turn in the tool loop.
  return {
    role: 'user' as const,
    parts: [{ functionResponse: { id: call.id, name: call.name || 'unknown', response } }]
  };
}

export function createGeminiFunctionResponses(
  responses: Array<{ call: { id?: string; name?: string }; response: Record<string, unknown> }>
) {
  if (!responses.length) throw new Error('Gemini function responses cannot be empty');
  return {
    role: 'user' as const,
    parts: responses.map(({ call, response }) => {
      if (!call.id) throw new Error('Gemini function call did not include an id');
      return { functionResponse: { id: call.id, name: call.name || 'unknown', response } };
    })
  };
}

export function prepareAssistantChat(messages: AssistantMessage[]) {
  const lastMessage = messages.at(-1);
  if (!lastMessage || lastMessage.role !== 'user') {
    throw new Error('The last assistant message must be from the user');
  }

  const history = messages.slice(0, -1);
  while (history[0]?.role === 'model') history.shift();

  let expected: 'user' | 'model' = 'user';
  for (const message of history) {
    if (message.role !== expected) {
      throw new Error('Assistant history roles must alternate between user and model');
    }
    expected = expected === 'user' ? 'model' : 'user';
  }

  return { history, lastMessage };
}

export function publicGeminiError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  const normalized = message.toLowerCase();

  if (/api.?key|unauthenticated|permission.?denied|\b401\b|\b403\b/.test(normalized)) {
    return { category: 'authentication', status: 502, message: 'Gemini rejected the configured API key. An administrator must replace it with a valid Google AI Studio key and redeploy.' };
  }
  if (/quota|rate.?limit|resource.?exhausted|\b429\b/.test(normalized)) {
    return { category: 'quota', status: 503, message: 'Smart Assistant has reached its Gemini usage limit. Please try again later or ask an administrator to review the API quota.' };
  }
  if (/model.*(not found|unavailable)|not found.*model|\b404\b/.test(normalized)) {
    return { category: 'model', status: 502, message: 'The configured Gemini model is unavailable. Ask an administrator to review GEMINI_MODEL and redeploy.' };
  }
  if (/history|role|last assistant message/.test(normalized)) {
    return { category: 'history', status: 400, message: 'This chat history is invalid. Clear the chat and try again.' };
  }
  return { category: 'upstream', status: 502, message: 'Smart Assistant could not reach Gemini. Please try again shortly; administrators can review the server log category for details.' };
}

export function publicAssistantError(error: unknown) {
  if (error instanceof GeminiRequestFailure) {
    return publicGeminiError(error.upstream);
  }

  const message = error instanceof Error ? error.message : String(error);
  if (/history|role|last assistant message/i.test(message)) {
    return { category: 'history', status: 400, message: 'This chat history is invalid. Clear the chat and try again.' };
  }

  return {
    category: 'internal',
    status: 500,
    message: 'Smart Assistant could not process this request because of a server problem. Please try again. If it continues, ask an administrator to review the Smart Assistant server logs.'
  };
}
