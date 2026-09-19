import { test, expect } from '@playwright/test';
import { setupFirebaseAuth, injectAuthState } from './helpers';

test('Analyze Trend button is clickable and triggers API', async ({ page }) => {
  await setupFirebaseAuth(page);
  await page.goto('/');
  await injectAuthState(page);

  await page.route('/api/ai/trends', (route) => {
    if (route.request().method() === 'POST') {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          prediction: {
            trendScore: 78,
            direction: 'rising',
            timeToPeak: '2-3 weeks',
            estimatedMargin: 22,
            confidence: 'high',
            reasoning: 'Mocked response for test',
            relatedKeywords: ['mock earbuds', 'wireless buds'],
            suggestedPlatforms: ['amazon', 'shopify']
          },
          risingStars: [],
        }),
      });
    } else {
      route.continue();
    }
  });

  await page.goto('/trends');
  await page.waitForLoadState('networkidle');

  await page.getByRole('button', { name: /analyze/i }).click();

  const input = page.locator('input[placeholder^="Enter keyword"]');
  await input.fill('wireless earbuds');

  const analyzeBtn = page.getByRole('button', { name: /analyze trend/i });
  await expect(analyzeBtn).toBeEnabled();
  await analyzeBtn.click();

  await expect(page.getByText(/Analysis Result/i)).toBeVisible();
  await expect(page.getByText(/Mocked response for test/)).toBeVisible();
});
