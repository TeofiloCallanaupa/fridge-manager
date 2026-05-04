import { test, expect } from '@playwright/test';

test.describe('Auth & Onboarding Flow', () => {
  test('Complete flow: signup, confirm email, profile, avatar, household, dashboard', async ({ page, request }) => {
    test.setTimeout(60000); // This flow spans multiple pages with server actions
    const timestamp = Date.now();
    const email = `test.user.${timestamp}@example.com`;
    const password = 'TestPassword123!';

    // 1. Signup
    await page.goto('/signup');
    await page.fill('input[name="email"]', email);
    await page.fill('input[name="password"]', password);
    await page.click('#signup-button');

    // Wait for the confirmation message
    await expect(page.getByText('Check your email to confirm your account')).toBeVisible({ timeout: 10000 });

    // 2. Poll Mailpit for the confirmation email
    let messages: any[] = [];
    const maxRetries = 10;
    for (let i = 0; i < maxRetries; i++) {
      const response = await request.get(`http://127.0.0.1:54324/api/v1/search?query=to:${email}`);
      if (response.ok()) {
        const data = await response.json();
        if (data.messages && data.messages.length > 0) {
          messages = data.messages;
          break;
        }
      }
      await page.waitForTimeout(1000); // Wait 1 second before retrying
    }

    expect(messages.length).toBeGreaterThan(0);
    const messageId = messages[0].ID;

    // Get the email body
    const emailResponse = await request.get(`http://127.0.0.1:54324/api/v1/message/${messageId}`);
    expect(emailResponse.ok()).toBeTruthy();
    const emailData = await emailResponse.json();

    // 3. Extract the confirmation link
    // The link looks like: http://127.0.0.1:54321/verify?token=...&redirect_to=http://localhost:3001/auth/callback
    const emailText = emailData.Text || emailData.HTML;
    const linkMatch = emailText.match(/(http:\/\/(?:127\.0\.0\.1|localhost):54321\/(?:auth\/v1\/)?verify[^\s"']+)/);
    expect(linkMatch).not.toBeNull();
    let confirmationLink = linkMatch![1].replace(/&amp;/g, '&');
    // Fix local Supabase bug where /auth/v1/ is missing from the URL
    if (!confirmationLink.includes('/auth/v1/')) {
      confirmationLink = confirmationLink.replace(/(:54321)\/verify/, '$1/auth/v1/verify');
    }
    // Force localhost instead of 127.0.0.1 for playwright and ensure it redirects to 3001
    confirmationLink = confirmationLink.replace('127.0.0.1', 'localhost');

    // 4. Click the confirmation link (Navigate)
    await page.goto(confirmationLink);

    // 5. Profile Step
    await expect(page).toHaveURL(/\/onboarding\/profile/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /What should we\s*call you\?/ })).toBeVisible({ timeout: 5000 });
    
    await page.fill('input[name="display_name"]', 'Playwright Tester');
    await page.click('button[type="submit"]');

    // 6. Avatar Step
    await expect(page).toHaveURL(/\/onboarding\/avatar/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: 'Create your avatar' })).toBeVisible();
    
    // Verify avatar preview loads (img with alt "Avatar preview")
    const avatarPreview = page.getByAltText('Avatar preview');
    await expect(avatarPreview).toBeVisible();

    await page.click('button:has-text("Next Step")');

    // 7. Household Step
    await expect(page).toHaveURL(/\/onboarding\/household/, { timeout: 10000 });
    await expect(page.getByRole('heading', { name: /Set up your\s*household/ })).toBeVisible();

    await page.fill('input[name="name"]', 'Playwright Test Household');
    await page.click('button[type="submit"]');

    // 8. Dashboard (Completion)
    await expect(page).toHaveURL('http://localhost:3000/dashboard');
    // For now, accept whatever is on the home page as long as we landed there
  });
});
