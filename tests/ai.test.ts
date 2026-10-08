import test from 'node:test';
import assert from 'node:assert/strict';
import { createGeminiFunctionResponse, prepareAssistantChat, publicGeminiError } from '../server/ai-support.js';

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

test('Gemini 3 function responses preserve the function-call id', () => {
  assert.deepEqual(
    createGeminiFunctionResponse({ id: 'call-123', name: 'query_samples' }, { samples: [] }),
    {
      role: 'user',
      parts: [{ functionResponse: { id: 'call-123', name: 'query_samples', response: { samples: [] } } }]
    }
  );
  assert.throws(() => createGeminiFunctionResponse({ name: 'query_samples' }, {}), /did not include an id/);
});

test('depleted prepayment is a billing failure even when Gemini returns quota status', () => {
  for (const failure of [
    new Error('429 RESOURCE_EXHAUSTED: Your prepayment credits are depleted. secret-value'),
    new Error('403 PERMISSION_DENIED: Billing account is inactive'),
    { error: { code: 402, message: 'Your prepayment credits are depleted. secret-value' } },
    { status: 429, message: 'Please switch your billing account to Prepay' }
  ]) {
    const result = publicGeminiError(failure);
    assert.equal(result.category, 'billing');
    assert.equal(result.status, 503);
    assert.match(result.message, /Google AI Studio Billing/);
    assert.equal(result.message.includes('secret-value'), false);
  }
});

test('structured rate limits and key failures retain their separate remedies', () => {
  assert.equal(publicGeminiError({ error: { code: 429, status: 'RESOURCE_EXHAUSTED' } }).category, 'quota');
  assert.equal(publicGeminiError({ error: { code: 403, message: 'API_KEY_INVALID' } }).category, 'authentication');
  assert.equal(publicGeminiError(new Error('503 UNAVAILABLE')).category, 'upstream');
});
