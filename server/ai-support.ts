export interface AssistantMessage {
  role: 'user' | 'model';
  parts: Array<{ text: string }>;
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
