import test from 'node:test';
import assert from 'node:assert/strict';
import { prepareAssistantChat, publicGeminiError } from '../server/ai-support.js';

test('assistant greeting is excluded so Gemini history begins with a user', () => {
  const greeting = { role: 'model' as const, parts: [{ text: 'Hello' }] };
  const firstUser = { role: 'user' as const, parts: [{ text: 'Find ML-001' }] };
  const firstReply = { role: 'model' as const, parts: [{ text: 'Found it' }] };
  const currentUser = { role: 'user' as const, parts: [{ text: 'Show the batch' }] };

  assert.deepEqual(prepareAssistantChat([greeting, currentUser]), { history: [], lastMessage: currentUser });
  assert.deepEqual(
    prepareAssistantChat([greeting, firstUser, firstReply, currentUser]),
    { history: [firstUser, firstReply], lastMessage: currentUser }
  );
});

test('assistant history rejects malformed role order', () => {
  assert.throws(() => prepareAssistantChat([
    { role: 'user', parts: [{ text: 'One' }] },
    { role: 'user', parts: [{ text: 'Two' }] },
    { role: 'user', parts: [{ text: 'Three' }] }
  ]), /alternate/);
});

test('Gemini errors become actionable messages without exposing upstream details', () => {
  assert.equal(publicGeminiError(new Error('API_KEY_INVALID secret-value')).category, 'authentication');
  assert.equal(publicGeminiError(new Error('429 RESOURCE_EXHAUSTED')).category, 'quota');
  assert.equal(publicGeminiError(new Error('model not found 404')).category, 'model');
  assert.equal(publicGeminiError(new Error('socket included sensitive upstream detail')).message.includes('sensitive'), false);
});
