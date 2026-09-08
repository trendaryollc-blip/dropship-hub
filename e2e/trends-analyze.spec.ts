import { test, expect } from '@playwright/test';

test('Analyze Trend button is clickable and triggers API', async ({ page }) => {
  // Intercept the API call and return a mock analysis result
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

  // Go to the trends page
  await page.goto('/trends');

  // Click the Analyze tab
  await page.getByRole('button', { name: /analyze/i }).click();

  // Enter keyword into the input
  const input = page.locator('input[placeholder^="Enter keyword"]');
  await input.fill('wireless earbuds');

  // Click the Analyze Trend button
  const analyzeBtn = page.getByRole('button', { name: /analyze trend/i });
  await expect(analyzeBtn).toBeEnabled();
  await analyzeBtn.click();

  // Wait for analysis result to appear
  await expect(page.getByText(/Analysis Result/i)).toBeVisible();
  await expect(page.getByText(/Mocked response for test/)).toBeVisible();
});
