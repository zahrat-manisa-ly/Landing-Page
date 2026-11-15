import { expect, test, type Page, type Route } from '@playwright/test';
import { gotoApp } from './helpers';

const currentUser = {
  id: '2d61fca8-a1eb-4fe3-9868-02cfac61b5d7',
  username: null,
  occupation: null,
  employee_id: null,
  email: 'traveler@example.test',
  phone_number: null,
  first_name: 'Test',
  last_name: 'Traveler',
  created_at: '2030-01-01T00:00:00Z',
  updated_at: '2030-01-01T00:00:00Z',
  date_of_birth: null,
  image: null,
  account_type: 'customer',
  is_owner: false,
  is_blocked: false,
  roles: [],
  permissions: [],
};

async function body(route: Route): Promise<Record<string, unknown>> {
  return route.request().postDataJSON() as Record<string, unknown>;
}

async function mockSignIn(page: Page, verifyResponse: 'token' | 'settings' = 'token') {
  await page.route('**/__test_api/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    if (path.endsWith('/auth/login'))
      return route.fulfill({
        json: { requires_terms_acceptance: true, transaction_token: 'terms-secret' },
      });
    if (path.endsWith('/terms/current'))
      return route.fulfill({
        json: {
          id: 'terms-1',
          version: '1.0',
          content: [{ title: 'Travel account terms', items: ['Keep your account secure.'] }],
          published_at: '2030-01-01T00:00:00Z',
          is_current: true,
        },
      });
    if (path.endsWith('/auth/login/accept-terms'))
      return route.fulfill({
        json: {
          status: 'verification_required',
          challenge_token: 'challenge-secret',
          expires_in: 300,
          methods: [
            { id: 'email-1', type: 'email', label: 'Email code' },
            { id: 'key-1', type: 'webauthn', label: 'Security key' },
          ],
          preferred_method: 'email-1',
          recovery_available: true,
        },
      });
    if (path.endsWith('/mfa/select')) {
      const request = await body(route);
      return route.fulfill({
        json:
          request.method_id === 'key-1'
            ? { method_id: 'key-1', type: 'webauthn', options: {} }
            : { method_id: 'email-1', type: 'email', status: 'code_sent' },
      });
    }
    if (path.endsWith('/mfa/verify'))
      return route.fulfill({
        json:
          verifyResponse === 'token'
            ? { access_token: 'access-secret', token_type: 'bearer' }
            : { status: 'reauthenticated', settings_token: 'settings-secret', expires_in: 300 },
      });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: currentUser });
    return route.fulfill({ status: 404, json: {} });
  });
}

async function enterCredentials(page: Page) {
  await page.getByLabel('Email or phone number').fill('traveler@example.test');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByRole('button', { name: 'Continue' }).click();
}

test('sign-in completes terms, WebAuthn fallback, code MFA, and public session state', async ({
  page,
}) => {
  await mockSignIn(page);
  await gotoApp(page, '/en/auth/sign-in/');
  await enterCredentials(page);
  await expect(page.getByRole('heading', { name: 'Review the current terms' })).toBeVisible();
  await expect(page.getByText('Travel account terms')).toBeVisible();
  await page.getByRole('button', { name: 'Accept and continue' }).click();
  await page.getByRole('button', { name: /Security key/ }).click();
  await expect(page.getByRole('heading', { name: 'Security key unavailable' })).toBeVisible();
  await page.getByRole('button', { name: 'Choose another method' }).click();
  await page.getByRole('button', { name: /Email code/ }).click();
  await page.getByLabel('One-time code').fill('123456');
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(page.getByRole('heading', { name: 'You are signed in.' })).toBeVisible();
  await expect(page.locator('.auth-status').getByText(/Test/)).toBeVisible();
  await expect(page.locator('.account-menu summary')).toHaveAttribute(
    'aria-label',
    'Account: Test Traveler',
  );
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(page.url()).not.toContain('secret');
});

test('reloading an incomplete terms flow deliberately restarts sign-in', async ({ page }) => {
  await mockSignIn(page);
  await gotoApp(page, '/en/auth/sign-in/');
  await enterCredentials(page);
  await expect(page.getByRole('heading', { name: 'Review the current terms' })).toBeVisible();
  await page.reload();
  await expect(page.getByLabel('Email or phone number')).toBeVisible();
  await expect(page.getByText(/Reloading during terms or verification/)).toBeVisible();
});

test('recovery-code verification exposes the settings-only backend branch', async ({ page }) => {
  await mockSignIn(page, 'settings');
  await gotoApp(page, '/en/auth/sign-in/');
  await enterCredentials(page);
  await page.getByRole('button', { name: 'Accept and continue' }).click();
  await page.getByRole('button', { name: 'Use a recovery code' }).click();
  await page.getByLabel('Recovery code').fill('recover9');
  await page.getByRole('button', { name: 'Verify and sign in' }).click();
  await expect(page.getByText(/only valid for account security settings/)).toBeVisible();
});

test('registration and confirmation use bodies without putting identifiers or codes in URLs', async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/__test_api/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    const requestBody = await body(route);
    if (requestBody) requests.push(requestBody);
    if (path.endsWith('/auth/register')) return route.fulfill({ status: 204, body: '' });
    if (path.endsWith('/auth/register/confirm'))
      return route.fulfill({ json: { access_token: 'registration-secret', token_type: 'bearer' } });
    if (path.endsWith('/auth/me')) return route.fulfill({ json: currentUser });
    return route.fulfill({ status: 204, body: '' });
  });
  await gotoApp(page, '/en/auth/register/');
  await page.getByLabel('First name').fill('Test');
  await page.getByLabel('Last name').fill('Traveler');
  await page.getByLabel('Email or phone number').fill('traveler@example.test');
  await page.getByLabel('Password', { exact: true }).fill('password123');
  await page.getByLabel('Confirm password').fill('password123');
  await page.getByLabel('I agree to the terms and conditions.').check();
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(
    page.getByRole('heading', { name: 'Your registration was received.' }),
  ).toBeVisible();
  expect(requests[0]).toMatchObject({ email: 'traveler@example.test', terms_and_conditions: true });
  expect(page.url()).not.toContain('traveler');

  await gotoApp(page, '/en/auth/register/verify/');
  await page.getByLabel('Email or phone number').fill('traveler@example.test');
  await page.getByLabel('Registration code').fill('123456');
  await page.getByRole('button', { name: 'Confirm account' }).click();
  await expect(page.getByRole('heading', { name: 'Your account is confirmed.' })).toBeVisible();
  expect(page.url()).not.toContain('123456');
});

test('forgot-password response remains neutral when no account is found', async ({ page }) => {
  await page.route('**/__test_api/api/v1/auth/forgot-password', (route) =>
    route.fulfill({ status: 404, json: { detail: 'not found' } }),
  );
  await gotoApp(page, '/en/auth/forgot-password/');
  await page.getByLabel('Email or phone number').fill('unknown@example.test');
  await page.getByRole('button', { name: 'Request reset instructions' }).click();
  await expect(page.getByText(/If an account matches those details/)).toBeVisible();
  await expect(page.getByText(/not found/i)).toHaveCount(0);
});

test('reset and invitation secrets stay in request bodies and out of URLs and storage', async ({
  page,
}) => {
  const requests: Record<string, unknown>[] = [];
  await page.route('**/__test_api/api/v1/**', async (route) => {
    const path = new URL(route.request().url()).pathname;
    requests.push(await body(route));
    if (path.endsWith('/customers/invitations/accept')) return route.fulfill({ json: currentUser });
    return route.fulfill({ status: 204, body: '' });
  });
  await gotoApp(page, '/en/auth/reset-password/');
  await page.getByLabel('Reset token').fill('reset-secret');
  await page.getByLabel('New password').fill('password123');
  await page.getByLabel('Confirm password').fill('password123');
  await page.getByRole('button', { name: 'Set new password' }).click();
  await expect(page.getByText(/password has been reset/)).toBeVisible();
  expect(page.url()).not.toContain('reset-secret');

  await gotoApp(page, '/en/auth/invitation/');
  await page.getByLabel('Invitation token').fill('invite-secret');
  await page.getByLabel('New password').fill('password123');
  await page.getByLabel('Confirm password').fill('password123');
  await page.getByLabel('I agree to the terms and conditions.').check();
  await page.getByRole('button', { name: 'Accept invitation' }).click();
  await expect(page.getByText(/invitation has been accepted/)).toBeVisible();
  expect(requests).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ token: 'reset-secret' }),
      expect.objectContaining({ token: 'invite-secret' }),
    ]),
  );
  expect(await page.evaluate(() => [localStorage.length, sessionStorage.length])).toEqual([0, 0]);
  expect(page.url()).not.toContain('invite-secret');
});

for (const locale of ['en', 'ar'] as const) {
  for (const width of [390, 768, 1440]) {
    test(`${locale} auth routes remain directional and overflow-free at ${width}px`, async ({
      page,
    }) => {
      await page.setViewportSize({ width, height: 1000 });
      await gotoApp(page, `/${locale}/auth/sign-in/`);
      await expect(page.locator('html')).toHaveAttribute('dir', locale === 'ar' ? 'rtl' : 'ltr');
      await expect(page.locator('.auth-shell')).toBeVisible();
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
      await expect(page.locator('input[dir=ltr]')).toHaveCount(2);
    });
  }
}
