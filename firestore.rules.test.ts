import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const rulesText = fs.readFileSync('./firestore.rules', 'utf-8');

test('Firestore Rules — Global Safety Net & Version 2', () => {
  assert.ok(rulesText.includes("rules_version = '2';"));
  assert.ok(rulesText.includes('match /{document=**}'));
  assert.ok(rulesText.includes('allow read, write: if false;'));
});

test('Firestore Rules — Dirty Dozen Structural & Semantic Guards', () => {
  // 1 & 2: Auth & Email verification
  assert.ok(rulesText.includes('request.auth != null'));
  assert.ok(rulesText.includes('request.auth.token.email_verified == true'));

  // 3 & 4: Ownership & Identity Spoofing prevention
  assert.ok(rulesText.includes('data.uid == request.auth.uid'));
  assert.ok(rulesText.includes('existing().uid == request.auth.uid'));

  // 5: Master Gate parent check for subcollections
  assert.ok(rulesText.includes('hasValidParentUser(userId)'));

  // 6 & 7: Shadow field prevention via hasAll + hasOnly and affectedKeys().hasOnly()
  assert.ok(rulesText.includes('data.keys().hasAll('));
  assert.ok(rulesText.includes('data.keys().hasOnly('));
  assert.ok(rulesText.includes('incoming().diff(existing()).affectedKeys().hasOnly('));

  // 8 & 9: Temporal & Identity Immutability
  assert.ok(rulesText.includes('incoming().uid == existing().uid'));
  assert.ok(rulesText.includes('incoming().createdAt == existing().createdAt'));
  assert.ok(rulesText.includes('incoming().createdAt == request.time'));
  assert.ok(rulesText.includes('incoming().updatedAt == request.time'));

  // 10, 11, 12: Volumetric size limits, Enum checks, and ID regex guard
  assert.ok(rulesText.includes("id.matches('^[a-zA-Z0-9_\\\\-]+$')"));
  assert.ok(rulesText.includes('data.title.size() <= 140'));
  assert.ok(rulesText.includes('data.title.size() <= 200'));
  assert.ok(rulesText.includes("existing().status != 'archived'"));
  assert.ok(rulesText.includes("existing().status != 'achieved'"));
});
