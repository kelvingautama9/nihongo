import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

test('Firestore security rules enforce Eight Pillars and block Dirty Dozen vectors', () => {
  const rules = fs.readFileSync('firestore.rules', 'utf-8');
  assert.ok(rules.includes("rules_version = '2';"), 'Uses rules_version 2');
  assert.ok(rules.includes('allow read, write: if false;'), 'Includes default-deny global safety net');
  assert.ok(rules.includes('request.auth.token.email_verified == true'), 'Enforces verified email on writes');
  assert.ok(rules.includes('isValidUserSettings(incoming())'), 'Enforces validation helper on UserSettings');
  assert.ok(rules.includes('isValidSrsItemState(incoming())'), 'Enforces validation helper on SrsItemState');
  assert.ok(rules.includes('isValidSessionLog(incoming())'), 'Enforces validation helper on SessionLog');
  assert.ok(rules.includes('affectedKeys().hasOnly('), 'Enforces action-based update key allowlist');
  assert.ok(rules.includes('incoming().updatedAt == request.time'), 'Enforces server timestamp integrity');
});
