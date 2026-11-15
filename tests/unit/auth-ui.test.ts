import assert from 'node:assert/strict';
import { test } from 'node:test';
import { authText } from '../../src/features/auth/messages.ts';
import { customerIdentifier, validOtp, validPassword } from '../../src/features/auth/validation.ts';
import { safeAuthReturnPath } from '../../src/features/auth/navigation.ts';

test('customer identifiers accept complete email or international phone values', () => {
  assert.deepEqual(customerIdentifier(' traveler@example.test '), {
    email: 'traveler@example.test',
  });
  assert.deepEqual(customerIdentifier('+201234567890'), { phone_number: '+201234567890' });
});

test('ambiguous or incomplete customer identifiers are rejected', () => {
  assert.equal(customerIdentifier('traveler'), null);
  assert.equal(customerIdentifier('traveler@'), null);
  assert.equal(customerIdentifier('00123'), null);
  assert.equal(customerIdentifier('+12 345678'), null);
});

test('password and one-time-code validation adds a strict UI boundary', () => {
  assert.equal(validPassword('short'), false);
  assert.equal(validPassword('eight-ok'), true);
  assert.equal(validOtp('123456'), true);
  assert.equal(validOtp('recover9'), true);
  assert.equal(validOtp('12 34'), false);
});

test('authentication copy is available in English and Arabic', () => {
  assert.equal(authText('en', 'signInTitle'), 'Welcome back.');
  assert.notEqual(authText('ar', 'signInTitle'), authText('en', 'signInTitle'));
  assert.ok(authText('ar', 'neutralReset').trim());
});

test('authentication return paths allow only known local travel routes', () => {
  assert.equal(
    safeAuthReturnPath('en', '/en/flights/results/?from=AAA&to=BBB'),
    '/en/flights/results/?from=AAA&to=BBB',
  );
  assert.equal(safeAuthReturnPath('ar', '/ar/'), '/ar/');
  for (const unsafe of [
    'https://attacker.example/en/flights/',
    '//attacker.example/en/flights/',
    '/en/auth/sign-in/',
    '/ar/flights/',
    '/en/flights/unknown/',
    '/en/flights/\\attacker.example/',
  ]) {
    assert.equal(safeAuthReturnPath('en', unsafe), '/en/flights/');
  }
});
