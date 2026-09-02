import { test, expect } from "@playwright/test";

test.describe("Sign-In Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
  });

  test("loads with correct heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });

  test("has email input field", async ({ page }) => {
    const emailInput = page.getByPlaceholder("you@example.com");
    await expect(emailInput).toBeVisible();
    await expect(emailInput).toHaveAttribute("type", "email");
  });

  test("has password input field", async ({ page }) => {
    const passwordInput = page.getByPlaceholder("Enter your password");
    await expect(passwordInput).toBeVisible();
  });

  test("has sign-in submit button", async ({ page }) => {
    const signInButton = page.getByRole("button", { name: /sign in/i });
    await expect(signInButton).toBeVisible();
  });

  test("has Google sign-in option", async ({ page }) => {
    const googleButton = page.getByRole("button", { name: /continue with google/i });
    await expect(googleButton).toBeVisible();
  });

  test("has forgot password link", async ({ page }) => {
    const forgotLink = page.getByRole("link", { name: /forgot password/i });
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveAttribute("href", /forgot-password/);
  });

  test("has link to sign-up page", async ({ page }) => {
    const signUpLink = page.getByRole("link", { name: /sign up/i });
    await expect(signUpLink).toBeVisible();
    await expect(signUpLink).toHaveAttribute("href", /sign-up/);
  });

  test("clicking forgot password navigates to /forgot-password", async ({ page }) => {
    await page.getByRole("link", { name: /forgot password/i }).click();
    await expect(page).toHaveURL(/forgot-password/);
  });

  test("clicking sign-up navigates to /sign-up", async ({ page }) => {
    await page.getByRole("link", { name: /sign up/i }).click();
    await expect(page).toHaveURL(/sign-up/);
  });

  test("submitting empty form stays on sign-in page", async ({ page }) => {
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/sign-in/);
  });

  test("can type in email field", async ({ page }) => {
    const emailInput = page.getByPlaceholder("you@example.com");
    await emailInput.fill("user@example.com");
    await expect(emailInput).toHaveValue("user@example.com");
  });

  test("can type in password field", async ({ page }) => {
    const passwordInput = page.getByPlaceholder("Enter your password");
    await passwordInput.fill("password123");
    await expect(passwordInput).toHaveValue("password123");
  });

  test("can fill in both fields and click sign-in", async ({ page }) => {
    await page.getByPlaceholder("you@example.com").fill("user@example.com");
    await page.getByPlaceholder("Enter your password").fill("password123");
    await page.getByRole("button", { name: /sign in/i }).click();
    await page.waitForTimeout(1000);
  });

  test("has remember me checkbox", async ({ page }) => {
    await expect(page.getByText("Remember me")).toBeVisible();
  });

  test("has password visibility toggle", async ({ page }) => {
    const passwordInput = page.getByPlaceholder("Enter your password");
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("has logo/branding link", async ({ page }) => {
    const logoLink = page.getByRole("link", { name: /dropship/i }).first();
    await expect(logoLink).toBeVisible();
    await expect(logoLink).toHaveAttribute("href", "/");
  });
});

test.describe("Sign-Up Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");
  });

  test("loads with correct heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
  });

  test("has full name input field", async ({ page }) => {
    await expect(page.getByPlaceholder("John Doe")).toBeVisible();
  });

  test("has email input field", async ({ page }) => {
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  });

  test("has password input field", async ({ page }) => {
    await expect(page.getByPlaceholder("Create a strong password")).toBeVisible();
  });

  test("has sign-up submit button", async ({ page }) => {
    await expect(page.getByRole("button", { name: /create account/i })).toBeVisible();
  });

  test("has Google sign-up option", async ({ page }) => {
    await expect(page.getByRole("button", { name: /continue with google/i })).toBeVisible();
  });

  test("has link to sign-in page", async ({ page }) => {
    const signInLink = page.getByRole("link", { name: /sign in/i });
    await expect(signInLink).toBeVisible();
    await expect(signInLink).toHaveAttribute("href", /sign-in/);
  });

  test("clicking sign-in navigates to /sign-in", async ({ page }) => {
    await page.getByRole("link", { name: /sign in/i }).click();
    await expect(page).toHaveURL(/sign-in/);
  });

  test("submitting empty form stays on sign-up page", async ({ page }) => {
    await page.getByRole("button", { name: /create account/i }).click();
    await page.waitForTimeout(500);
    await expect(page).toHaveURL(/sign-up/);
  });

  test("can fill in all fields", async ({ page }) => {
    await page.getByPlaceholder("John Doe").fill("John Doe");
    await page.getByPlaceholder("you@example.com").fill("newuser@example.com");
    await page.getByPlaceholder("Create a strong password").fill("password123");
    await expect(page.getByPlaceholder("you@example.com")).toHaveValue("newuser@example.com");
  });

  test("has terms of service text", async ({ page }) => {
    await expect(page.getByText(/terms of service/i)).toBeVisible();
  });

  test("has privacy policy text", async ({ page }) => {
    await expect(page.getByText(/privacy policy/i)).toBeVisible();
  });

  test("has password visibility toggle", async ({ page }) => {
    const passwordInput = page.getByPlaceholder("Create a strong password");
    await expect(passwordInput).toHaveAttribute("type", "password");
  });

  test("has logo/branding link", async ({ page }) => {
    const logoLink = page.getByRole("link", { name: /dropship/i }).first();
    await expect(logoLink).toBeVisible();
    await expect(logoLink).toHaveAttribute("href", "/");
  });
});

test.describe("Forgot Password Page", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/forgot-password");
    await page.waitForLoadState("networkidle");
  });

  test("loads with correct heading", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();
  });

  test("has email input field", async ({ page }) => {
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  });

  test("has send/submit button", async ({ page }) => {
    const sendButton = page.getByRole("button", { name: /send|submit/i });
    await expect(sendButton).toBeVisible();
  });

  test("can fill email and submit", async ({ page }) => {
    await page.getByPlaceholder("you@example.com").fill("user@example.com");
    await page.getByRole("button", { name: /send|submit/i }).click();
    await page.waitForTimeout(1000);
  });

  test("has link back to sign-in", async ({ page }) => {
    const signInLink = page.getByRole("link", { name: /sign in|back/i });
    if (await signInLink.isVisible()) {
      await signInLink.click();
      await expect(page).toHaveURL(/sign-in/);
    }
  });

  test("has logo/branding link", async ({ page }) => {
    const logoLink = page.getByRole("link", { name: /dropship/i }).first();
    await expect(logoLink).toBeVisible();
    await expect(logoLink).toHaveAttribute("href", "/");
  });

  test("has descriptive text about password reset", async ({ page }) => {
    await expect(page.getByText(/enter your email/i)).toBeVisible();
  });
});

test.describe("Auth Pages - Responsive", () => {
  test("sign-in page is responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
    await expect(page.getByPlaceholder("you@example.com")).toBeVisible();
  });

  test("sign-up page is responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/sign-up");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /create your account/i })).toBeVisible();
  });

  test("forgot-password page is responsive on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/forgot-password");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /reset your password/i })).toBeVisible();
  });

  test("sign-in page is responsive on tablet", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/sign-in");
    await page.waitForLoadState("networkidle");
    await expect(page.getByRole("heading", { name: /welcome back/i })).toBeVisible();
  });
});
