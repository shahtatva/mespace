import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRequest, parseResponse, estimateCost, ReadError, MODEL, SCHEMA } from '../app/js/claude.js';

test('requests send the photo first, ask for structured JSON, and opt into refusal fallback', () => {
  const req = buildRequest('QUJD', 'image/jpeg');
  assert.equal(req.model, MODEL);
  assert.equal(req.output_config.format.type, 'json_schema');
  assert.deepEqual(req.output_config.format.schema, SCHEMA);
  assert.equal(req.output_config.effort, 'high');
  assert.deepEqual(req.betas, ['server-side-fallback-2026-07-01']);
  assert.equal(req.fallbacks, 'default');
  const [image, text] = req.messages[0].content;
  assert.equal(image.type, 'image');
  assert.equal(image.source.data, 'QUJD');
  assert.equal(text.type, 'text');
  assert.equal(SCHEMA.additionalProperties, false);
});

test('replies are parsed and cleaned', () => {
  const r = parseResponse({ stop_reason: 'end_turn', content: [{ type: 'thinking', thinking: '' }, { type: 'text', text: '{"text":" Hello ","date":"2025-05-18","title":"Hi","legible":true}' }] });
  assert.deepEqual(r, { text: 'Hello', date: '2025-05-18', title: 'Hi', legible: true });
  const bad = parseResponse({ stop_reason: 'end_turn', content: [{ type: 'text', text: '{"text":"x","date":"2025-02-30","title":"t","legible":true}' }] });
  assert.equal(bad.date, null);
});

test('refusals, cut-off replies and broken JSON become reasons the app can explain', () => {
  const reason = res => { try { parseResponse(res); } catch (e) { assert.ok(e instanceof ReadError); return e.reason; } };
  assert.equal(reason({ stop_reason: 'refusal', content: [] }), 'refused');
  assert.equal(reason({ stop_reason: 'max_tokens', content: [] }), 'unreadable-reply');
  assert.equal(reason({ stop_reason: 'end_turn', content: [{ type: 'text', text: 'not json' }] }), 'unreadable-reply');
});

test('cost estimates use Opus 5.5 prices', () => {
  assert.equal(estimateCost({ inputTokens: 1e6, outputTokens: 1e6 }), 24);
  assert.equal(estimateCost(), 0);
});
