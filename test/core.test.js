import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseRewriteRule, parseFlags, validateFlags } from '../src/index.js';

test('parseRewriteRule parses a basic rule with flags', () => {
  const result = parseRewriteRule('RewriteRule ^/old/(.*)$ /new/$1 [R=301,L]');
  assert.equal(result.pattern, '^/old/(.*)$');
  assert.equal(result.substitution, '/new/$1');
  assert.deepEqual(result.flags, { R: '301', L: '' });
});

test('parseRewriteRule works without the directive keyword', () => {
  const result = parseRewriteRule('^/api/(.*)$ /v2/$1 [NC,QSA]');
  assert.equal(result.pattern, '^/api/(.*)$');
  assert.equal(result.substitution, '/v2/$1');
  assert.deepEqual(result.flags, { NC: '', QSA: '' });
});

test('parseRewriteRule handles rule with no flags', () => {
  const result = parseRewriteRule('RewriteRule ^/a$ /b');
  assert.equal(result.pattern, '^/a$');
  assert.equal(result.substitution, '/b');
  assert.deepEqual(result.flags, {});
});

test('parseRewriteRule handles a flag with no value', () => {
  const result = parseRewriteRule('RewriteRule ^/x$ /y [F]');
  assert.deepEqual(result.flags, { F: '' });
});

test('parseRewriteRule handles multiple flags with and without values', () => {
  const result = parseRewriteRule('RewriteRule ^/old$ /new [R=302,NC,L]');
  assert.deepEqual(result.flags, { R: '302', NC: '', L: '' });
});

test('parseRewriteRule preserves the raw input', () => {
  const input = 'RewriteRule ^/a$ /b [L]';
  const result = parseRewriteRule(input);
  assert.equal(result.raw, input);
});

test('parseRewriteRule handles a dash substitution (no rewrite)', () => {
  const result = parseRewriteRule('RewriteRule ^/images/ - [F]');
  assert.equal(result.substitution, '-');
});

test('parseRewriteRule throws on empty input', () => {
  assert.throws(() => parseRewriteRule(''), { message: 'Input cannot be empty' });
});

test('parseRewriteRule throws on keyword only', () => {
  assert.throws(() => parseRewriteRule('RewriteRule'), { message: 'Directive has no rule body' });
});

test('parseRewriteRule throws on pattern only', () => {
  assert.throws(() => parseRewriteRule('^/pattern$'), {
    message: 'RewriteRule requires at least a pattern and a substitution',
  });
});

test('parseRewriteRule throws on unclosed flag bracket', () => {
  assert.throws(() => parseRewriteRule('RewriteRule ^/a$ /b [L'), {
    message: 'Unclosed flag bracket',
  });
});

test('parseRewriteRule throws on non-string input', () => {
  assert.throws(() => parseRewriteRule(42), { name: 'TypeError' });
});

test('parseRewriteRule is case-insensitive on directive keyword', () => {
  const result = parseRewriteRule('rewriterule ^/a$ /b [L]');
  assert.equal(result.pattern, '^/a$');
  assert.equal(result.substitution, '/b');
});

test('parseFlags returns empty object for empty string', () => {
  assert.deepEqual(parseFlags(''), {});
});

test('parseFlags handles whitespace and empty entries between commas', () => {
  assert.deepEqual(parseFlags('L , , NC '), { L: '', NC: '' });
});

test('parseFlags preserves the value as-is', () => {
  assert.deepEqual(parseFlags('R=301,QSA'), { R: '301', QSA: '' });
});

test('validateFlags returns empty array for known flags', () => {
  assert.deepEqual(validateFlags({ L: '', R: '301', NC: '' }), []);
});

test('validateFlags lists unknown flags', () => {
  assert.deepEqual(validateFlags({ L: '', FOO: 'bar', QSA: '' }), ['FOO']);
});
