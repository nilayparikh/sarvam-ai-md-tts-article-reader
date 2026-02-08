import { test, expect, Download } from "@playwright/test";
import * as path from "path";
import * as fs from "fs";
import * as url from "url";

// Get directory name for ES modules
const __filename = url.fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Test file path - use the article-1.md from translate/hi (large file for full tests)
const TEST_FILE_PATH = path.resolve(
  __dirname,
  "../../../pipeline/translate/hi/artilce-1.md",
);

// Simple test file for quick TTS generation tests (3 chunks only)
const SIMPLE_TEST_FILE = path.resolve(
  __dirname,
  "./fixtures/test-simple.md",
);

// Small test content for quick TTS tests
const SMALL_TEST_CONTENT = `# Test Title

Google ka Nested Learning paper argue karta hai ki deep learning ka stack of layers wala view ek illusion hai.

Authors ne demonstrate kiya hai ki standard components primitive memory systems hain.
`;

test.describe("TTS Application E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    // Wait for app to load
    await page.waitForLoadState("networkidle");
  });

  test("should display the header with app title", async ({ page }) => {
    await expect(page.locator("text=Sarvam TTS")).toBeVisible();
    await expect(page.locator("text=Document Reader")).toBeVisible();
  });

  test("should show file selection panel", async ({ page }) => {
    await expect(page.locator("text=File Selection")).toBeVisible();
    await expect(page.getByLabel("Language")).toBeVisible();
  });

  test("should show settings panel", async ({ page }) => {
    await expect(page.locator("text=TTS Settings")).toBeVisible();
    await expect(page.getByLabel("Target Language")).toBeVisible();
    await expect(page.getByLabel("Speaker")).toBeVisible();
  });

  test("should have generate button disabled when no file selected", async ({
    page,
  }) => {
    const generateButton = page.getByTestId("generate-button");
    await expect(generateButton).toBeDisabled();
  });

  test("should display placeholder when no file is selected", async ({
    page,
  }) => {
    await expect(page.locator("text=Select a file to preview")).toBeVisible();
  });

  test("should allow changing TTS settings", async ({ page }) => {
    // Change speaker
    const speakerSelect = page.getByLabel("Speaker");
    await speakerSelect.click();

    // Wait for dropdown to open
    await page.waitForSelector('[role="listbox"]');

    // Check that speaker options are available
    await expect(page.locator('[role="option"]').first()).toBeVisible();
  });

  test("should expand advanced settings", async ({ page }) => {
    // Click on Advanced Settings accordion
    const advancedSettings = page.locator("text=Advanced Settings");
    await advancedSettings.click();

    // Check that advanced options are visible
    await expect(page.getByLabel("Sample Rate")).toBeVisible();
  });
});

test.describe("File Mode Toggle Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should show Select File mode by default", async ({ page }) => {
    const selectButton = page.getByRole("button", { name: /Select File/i });
    // Default mode should be selected
    await expect(selectButton).toHaveAttribute("aria-pressed", "true");
  });

  test("should toggle to Upload File mode", async ({ page }) => {
    const uploadButton = page.getByRole("button", { name: /Upload File/i });
    await uploadButton.click();
    await expect(uploadButton).toHaveAttribute("aria-pressed", "true");
  });

  test("should show upload button in upload mode", async ({ page }) => {
    // Switch to upload mode
    const uploadModeButton = page.getByRole("button", { name: /Upload File/i });
    await uploadModeButton.click();

    // Should show the upload button
    const chooseFileButton = page.getByTestId("upload-button");
    await expect(chooseFileButton).toBeVisible();
    await expect(chooseFileButton).toContainText("Choose Markdown File");
  });

  test("should show file list in select mode when language chosen", async ({
    page,
  }) => {
    // Wait for files to load
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    const languageSelect = page.getByLabel("Language");
    await languageSelect.click();

    // Select Hindi if available
    const hiOption = page.locator('[role="option"]').filter({ hasText: /hi/i });
    if ((await hiOption.count()) > 0) {
      await hiOption.first().click();
      // Should show available files
      await expect(page.locator("text=Available Files")).toBeVisible();
    }
  });
});

test.describe("File Upload Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should upload a markdown file", async ({ page }) => {
    // Switch to upload mode
    const uploadModeButton = page.getByRole("button", { name: /Upload File/i });
    await uploadModeButton.click();

    // Upload the test file
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(TEST_FILE_PATH);

    // Wait for upload and parsing
    await page.waitForResponse((response) =>
      response.url().includes("/files/upload"),
    );

    // Should show uploaded file info
    const uploadedInfo = page.getByTestId("uploaded-file-info");
    await expect(uploadedInfo).toBeVisible({ timeout: 10000 });
  });

  test("should parse uploaded file content", async ({ page }) => {
    // Switch to upload mode
    await page.getByRole("button", { name: /Upload File/i }).click();

    // Upload the test file
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(TEST_FILE_PATH);

    // Wait for content to be parsed
    await page.waitForResponse((response) =>
      response.url().includes("/parse/content"),
    );

    // Should show markdown preview
    await expect(page.locator("text=Markdown Preview")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should show save to translate option after upload", async ({
    page,
  }) => {
    // Switch to upload mode
    await page.getByRole("button", { name: /Upload File/i }).click();

    // Upload the test file
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(TEST_FILE_PATH);

    // Wait for upload
    await page.waitForResponse((response) =>
      response.url().includes("/files/upload"),
    );

    // Should show save checkbox
    const saveCheckbox = page.getByTestId("save-checkbox");
    await expect(saveCheckbox).toBeVisible({ timeout: 10000 });
  });
});

test.describe("File Selection Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should display Hindi language option", async ({ page }) => {
    await page.waitForResponse((response) =>
      response.url().includes("/api/files"),
    );

    const languageSelect = page.getByLabel("Language");
    await languageSelect.click();

    // Check if Hindi option exists
    const options = page.locator('[role="option"]');
    const count = await options.count();
    expect(count).toBeGreaterThan(0);
  });

  test("should select and parse a file", async ({ page }) => {
    await page.waitForResponse((response) =>
      response.url().includes("/api/files"),
    );

    const languageSelect = page.getByLabel("Language");
    await languageSelect.click();

    // Select first available language
    const firstOption = page.locator('[role="option"]').first();
    if ((await firstOption.count()) > 0) {
      await firstOption.click();

      // Click on the first available file
      await page.waitForTimeout(500);
      const fileList = page.locator('[role="button"]').filter({
        hasText: /\.md/i,
      });
      if ((await fileList.count()) > 0) {
        await fileList.first().click();

        // Wait for file to be parsed
        await page.waitForResponse((response) =>
          response.url().includes("/api/parse"),
        );

        // Should show preview
        await expect(page.locator("text=Markdown Preview")).toBeVisible({
          timeout: 10000,
        });
      }
    }
  });
});

test.describe("TTS Settings Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should change target language", async ({ page }) => {
    const targetLangSelect = page.getByLabel("Target Language");
    await targetLangSelect.click();

    // Select a language
    const option = page
      .locator('[role="option"]')
      .filter({ hasText: /Hindi/i });
    if ((await option.count()) > 0) {
      await option.click();
    }
  });

  test("should change speaker", async ({ page }) => {
    const speakerSelect = page.getByLabel("Speaker");
    await speakerSelect.click();

    // Check for speaker options
    const options = page.locator('[role="option"]');
    await expect(options.first()).toBeVisible();
  });

  test("should adjust pace slider", async ({ page }) => {
    // Find the pace slider
    const paceLabel = page.locator("text=Pace");
    await expect(paceLabel).toBeVisible();

    // The pace value should be displayed
    await expect(page.locator("text=/[0-9]\\.[0-9]x/")).toBeVisible();
  });

  test("should show sample rate in advanced settings", async ({ page }) => {
    // Expand advanced settings
    await page.locator("text=Advanced Settings").click();

    // Check for sample rate select
    const sampleRateSelect = page.getByLabel("Sample Rate");
    await expect(sampleRateSelect).toBeVisible();

    // Click to see options
    await sampleRateSelect.click();

    // Should have 48 kHz option
    await expect(
      page.locator('[role="option"]').filter({ hasText: /48 kHz/i }),
    ).toBeVisible();
  });
});

test.describe("Generate TTS Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should enable generate button after file selection", async ({
    page,
  }) => {
    // Switch to upload mode and upload a file
    await page.getByRole("button", { name: /Upload File/i }).click();
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(TEST_FILE_PATH);

    // Wait for parsing
    await page.waitForResponse((response) =>
      response.url().includes("/parse/content"),
    );

    // Generate button should be enabled
    const generateButton = page.getByTestId("generate-button");
    await expect(generateButton).toBeEnabled({ timeout: 10000 });
  });

  test("should show chunk analysis after file selection", async ({ page }) => {
    // Upload a file
    await page.getByRole("button", { name: /Upload File/i }).click();
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(TEST_FILE_PATH);

    // Wait for parsing
    await page.waitForResponse((response) =>
      response.url().includes("/parse/content"),
    );

    // Should show chunk analysis
    await expect(page.locator("text=Chunk Analysis")).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Backend Integration Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
  });

  test("should load available languages from API", async ({ page }) => {
    // Wait for API call to complete
    await page.waitForResponse(
      (response) =>
        response.url().includes("/api/files") && response.status() === 200,
    );

    // Check that language selector is populated (or shows no files message)
    const languageSelect = page.getByLabel("Language");
    await languageSelect.click();

    // Either we have languages or we see the "No files found" message
    const hasOptions = (await page.locator('[role="option"]').count()) > 0;
    const hasNoFilesMessage = await page
      .locator("text=No files found")
      .isVisible()
      .catch(() => false);

    expect(hasOptions || hasNoFilesMessage).toBe(true);
  });

  test("should display health status", async ({ page }) => {
    // Wait for health check
    await page.waitForResponse((response) =>
      response.url().includes("/api/health"),
    );

    // Check that version chip is visible
    await expect(
      page.locator("text=/v[0-9]+\\.[0-9]+\\.[0-9]+/"),
    ).toBeVisible();
  });

  test("should get default settings from API", async ({ page }) => {
    await page.waitForResponse((response) =>
      response.url().includes("/api/settings/defaults"),
    );

    // Should have default values set
    const speakerSelect = page.getByLabel("Speaker");
    await expect(speakerSelect).toBeVisible();
  });

  test("should get speakers from API", async ({ page }) => {
    await page.waitForResponse((response) =>
      response.url().includes("/api/settings/speakers"),
    );

    const speakerSelect = page.getByLabel("Speaker");
    await speakerSelect.click();

    // Should have speaker options
    const options = page.locator('[role="option"]');
    await expect(options.first()).toBeVisible();
    expect(await options.count()).toBeGreaterThan(0);
  });
});

test.describe("Accessibility Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
  });

  test("should have proper heading structure", async ({ page }) => {
    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test("should have accessible form controls", async ({ page }) => {
    // All select elements should have labels
    const selects = await page.locator('select, [role="combobox"]').all();
    for (const select of selects) {
      const labelledBy = await select.getAttribute("aria-labelledby");
      const label = await select.getAttribute("aria-label");
      expect(labelledBy || label).toBeTruthy();
    }
  });

  test("should support keyboard navigation", async ({ page }) => {
    // Tab through the interface
    await page.keyboard.press("Tab");

    // Check that something is focused
    const focusedElement = page.locator(":focus");
    await expect(focusedElement).toBeVisible();
  });
});

test.describe("Responsive Design Tests", () => {
  test("should work on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("http://localhost:5173");

    // Header should still be visible
    await expect(page.locator("text=Sarvam TTS")).toBeVisible();

    // Settings panel should still be accessible
    await expect(page.locator("text=TTS Settings")).toBeVisible();
  });

  test("should work on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("http://localhost:5173");

    // All main sections should be visible
    await expect(page.locator("text=File Selection")).toBeVisible();
    await expect(page.locator("text=TTS Settings")).toBeVisible();
  });
});

test.describe("Error Handling Tests", () => {
  test("should handle file upload errors gracefully", async ({ page }) => {
    await page.goto("http://localhost:5173");

    // Switch to upload mode
    await page.getByRole("button", { name: /Upload File/i }).click();

    // Try to upload a non-existent file (this should be handled by the browser)
    const fileInput = page.getByTestId("file-input");

    // The input should only accept .md files
    const accept = await fileInput.getAttribute("accept");
    expect(accept).toBe(".md");
  });
});
// ============================================================================
// TTS Generation Flow Tests - Comprehensive UI Interactive Tests
// ============================================================================

test.describe("Complete TTS Generation Flow", () => {
  test.setTimeout(180000); // 3 minute timeout for TTS generation

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should upload file and enable generate button", async ({ page }) => {
    // Step 1: Switch to upload mode
    const uploadModeBtn = page.getByRole("button", { name: /Upload File/i });
    await uploadModeBtn.click();

    // Step 2: Upload test file (use simple file for faster tests)
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(SIMPLE_TEST_FILE);

    // Step 3: Wait for file to be uploaded
    await page.waitForResponse(
      (response) =>
        response.url().includes("/files/upload") && response.status() === 200,
    );

    // Step 4: Verify uploaded file info is shown
    await expect(page.getByTestId("uploaded-file-info")).toBeVisible({
      timeout: 10000,
    });

    // Step 5: Generate button should be enabled
    const generateButton = page.getByTestId("generate-button");
    await expect(generateButton).toBeEnabled({ timeout: 10000 });
  });

  test("should start TTS generation and show progress", async ({ page }) => {
    // Upload file
    await page.getByRole("button", { name: /Upload File/i }).click();
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(SIMPLE_TEST_FILE);

    await page.waitForResponse(
      (response) =>
        response.url().includes("/files/upload") && response.status() === 200,
    );

    // Click generate
    const generateButton = page.getByTestId("generate-button");
    await expect(generateButton).toBeEnabled({ timeout: 10000 });
    await generateButton.click();

    // Should show "Generating..." state
    await expect(page.locator("text=Generating...")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should complete TTS generation and show success", async ({ page }) => {
    // Upload simple file for faster testing
    await page.getByRole("button", { name: /Upload File/i }).click();
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(SIMPLE_TEST_FILE);

    await page.waitForResponse(
      (response) =>
        response.url().includes("/files/upload") && response.status() === 200,
    );

    // Click generate
    const generateButton = page.getByTestId("generate-button");
    await expect(generateButton).toBeEnabled({ timeout: 10000 });
    await generateButton.click();

    // Wait a bit and capture what's on the page
    await page.waitForTimeout(5000);
    
    // Check for any error alerts
    const errorAlert = page.locator('[role="alert"]');
    if (await errorAlert.isVisible({ timeout: 1000 }).catch(() => false)) {
      const errorText = await errorAlert.textContent();
      console.log("ERROR ALERT FOUND:", errorText);
      await page.screenshot({ path: "test-error-screenshot.png" });
    }

    // Wait for completion - look for Download MP3 button OR error
    // Use a polling approach to see what's happening
    const startTime = Date.now();
    while (Date.now() - startTime < 120000) {
      // Check for download button
      if (await page.getByRole("button", { name: /Download MP3/i }).isVisible({ timeout: 500 }).catch(() => false)) {
        console.log("Download button appeared!");
        break;
      }
      // Check for error
      if (await page.locator('[role="alert"]').isVisible({ timeout: 500 }).catch(() => false)) {
        const errorText = await page.locator('[role="alert"]').textContent();
        console.log("Error during generation:", errorText);
        await page.screenshot({ path: "test-generation-error.png" });
        throw new Error(`Generation failed with error: ${errorText}`);
      }
      // Still generating?
      const generating = await page.locator("text=Generating...").isVisible({ timeout: 500 }).catch(() => false);
      if (generating) {
        console.log("Still generating...");
      }
      await page.waitForTimeout(2000);
    }

    // Final check - download button should be visible
    await expect(
      page.getByRole("button", { name: /Download MP3/i }),
    ).toBeVisible({ timeout: 5000 });
  });

  test("should display API call summary after generation", async ({ page }) => {
    // Upload simple file for faster testing
    await page.getByRole("button", { name: /Upload File/i }).click();
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(SIMPLE_TEST_FILE);

    await page.waitForResponse(
      (response) =>
        response.url().includes("/files/upload") && response.status() === 200,
    );

    const generateButton = page.getByTestId("generate-button");
    await expect(generateButton).toBeEnabled({ timeout: 10000 });
    await generateButton.click();

    // Wait for completion
    await expect(
      page.getByRole("button", { name: /Download MP3/i }),
    ).toBeVisible({
      timeout: 120000,
    });

    // API stats card should be visible
    await expect(page.getByTestId("api-stats-card")).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("MP3 Download Tests", () => {
  test.setTimeout(180000);

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should show Download MP3 button after TTS generation", async ({
    page,
  }) => {
    // Upload simple file for faster testing
    await page.getByRole("button", { name: /Upload File/i }).click();
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(SIMPLE_TEST_FILE);

    await page.waitForResponse((response) =>
      response.url().includes("/files/upload"),
    );

    // Generate TTS
    const generateButton = page.getByTestId("generate-button");
    await expect(generateButton).toBeEnabled({ timeout: 10000 });
    await generateButton.click();

    // Download MP3 button should be visible after completion
    const downloadButton = page.getByRole("button", { name: /Download MP3/i });
    await expect(downloadButton).toBeVisible({ timeout: 120000 });
  });

  test("should download MP3 file when Download MP3 button clicked", async ({
    page,
  }) => {
    // Upload simple file for faster testing
    await page.getByRole("button", { name: /Upload File/i }).click();
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(SIMPLE_TEST_FILE);

    await page.waitForResponse((response) =>
      response.url().includes("/files/upload"),
    );

    // Generate TTS
    const generateButton = page.getByTestId("generate-button");
    await expect(generateButton).toBeEnabled({ timeout: 10000 });
    await generateButton.click();

    // Wait for download button to appear
    const downloadButton = page.getByRole("button", { name: /Download MP3/i });
    await expect(downloadButton).toBeVisible({ timeout: 120000 });

    // Listen for popup/new window (the download opens in new tab)
    const [newPage] = await Promise.all([
      page.waitForEvent("popup"),
      downloadButton.click(),
    ]);

    // Verify the URL contains download endpoint
    expect(newPage.url()).toContain("/api/tts/download/");

    // Close the popup
    await newPage.close();
  });
});

test.describe("Settings Interaction Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should persist speaker selection", async ({ page }) => {
    // Change speaker
    const speakerSelect = page.getByLabel("Speaker");
    await speakerSelect.click();

    // Select a specific speaker
    const shubhOption = page
      .locator('[role="option"]')
      .filter({ hasText: /shubh/i });
    if ((await shubhOption.count()) > 0) {
      await shubhOption.click();

      // Verify selection persisted
      await expect(speakerSelect).toContainText(/shubh/i);
    }
  });

  test("should adjust pace using slider", async ({ page }) => {
    // Find pace slider - it should show current value
    const paceValue = page.locator("text=/Pace.*[0-9]\\.[0-9]x/");
    await expect(paceValue).toBeVisible();
  });

  test("should adjust temperature in advanced settings", async ({ page }) => {
    // Expand advanced settings
    await page.locator("text=Advanced Settings").click();

    // Temperature slider should be visible
    const tempLabel = page.locator("text=Temperature");
    await expect(tempLabel).toBeVisible();
  });

  test("should adjust heading boost in advanced settings", async ({ page }) => {
    // Expand advanced settings
    await page.locator("text=Advanced Settings").click();

    // Heading boost slider should be visible
    await expect(page.locator("text=Heading Boost")).toBeVisible();
  });

  test("should adjust pause settings in advanced settings", async ({
    page,
  }) => {
    // Expand advanced settings
    await page.locator("text=Advanced Settings").click();

    // Pause settings should be visible
    await expect(page.locator("text=Heading Pause")).toBeVisible();
    await expect(page.locator("text=Bullet Pause")).toBeVisible();
  });

  test("should change sample rate selection", async ({ page }) => {
    // Expand advanced settings
    await page.locator("text=Advanced Settings").click();

    const sampleRateSelect = page.getByLabel("Sample Rate");
    await sampleRateSelect.click();

    // Should have multiple options
    const options = page.locator('[role="option"]');
    expect(await options.count()).toBeGreaterThanOrEqual(2);

    // Select 48 kHz option
    const option48 = options.filter({ hasText: /48 kHz/i });
    if ((await option48.count()) > 0) {
      await option48.click();
      await expect(sampleRateSelect).toContainText(/48/);
    }
  });
});

test.describe("Chunk Analysis Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should display chunk statistics after file upload", async ({
    page,
  }) => {
    // Upload file
    await page.getByRole("button", { name: /Upload File/i }).click();
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(TEST_FILE_PATH);

    await page.waitForResponse((response) =>
      response.url().includes("/parse/content"),
    );

    // Chunk analysis should show statistics
    await expect(page.locator("text=Chunk Analysis")).toBeVisible({
      timeout: 10000,
    });

    // Should show chunk type counts (h1, h3, paragraph, bullet)
    await expect(page.locator("text=/h[1-6]:/")).toBeVisible();
  });

  test("should display total character count", async ({ page }) => {
    // Upload file
    await page.getByRole("button", { name: /Upload File/i }).click();
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(TEST_FILE_PATH);

    await page.waitForResponse((response) =>
      response.url().includes("/parse/content"),
    );

    // Should show character count
    await expect(page.locator("text=/[0-9,]+ chars/")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should display estimated duration", async ({ page }) => {
    // Upload file
    await page.getByRole("button", { name: /Upload File/i }).click();
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(TEST_FILE_PATH);

    await page.waitForResponse((response) =>
      response.url().includes("/parse/content"),
    );

    // Should show estimated duration
    await expect(page.locator("text=/~[0-9]+:[0-9]+/")).toBeVisible({
      timeout: 10000,
    });
  });
});

test.describe("Audio Preview Tests", () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should show audio player after successful generation", async ({
    page,
  }) => {
    // Upload and generate
    await page.getByRole("button", { name: /Upload File/i }).click();
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(TEST_FILE_PATH);

    await page.waitForResponse((response) =>
      response.url().includes("/files/upload"),
    );

    const generateButton = page.getByTestId("generate-button");
    await expect(generateButton).toBeEnabled({ timeout: 10000 });
    await generateButton.click();

    // Wait for completion
    await expect(
      page.locator("text=TTS generation completed successfully!"),
    ).toBeVisible({
      timeout: 60000,
    });

    // Audio element or player (Download MP3 button) should be visible
    const hasAudioControls =
      (await page.locator("audio").isVisible().catch(() => false)) ||
      (await page
        .locator('[data-testid="audio-player"]')
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator("text=Play")
        .isVisible()
        .catch(() => false));

    expect(hasAudioControls).toBe(true);
  });
});

test.describe("File Selection Mode Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should switch between Select and Upload modes", async ({ page }) => {
    // Start in Select mode
    const selectBtn = page.getByRole("button", { name: /Select File/i });
    const uploadBtn = page.getByRole("button", { name: /Upload File/i });

    await expect(selectBtn).toHaveAttribute("aria-pressed", "true");
    await expect(uploadBtn).toHaveAttribute("aria-pressed", "false");

    // Switch to Upload mode
    await uploadBtn.click();
    await expect(uploadBtn).toHaveAttribute("aria-pressed", "true");
    await expect(selectBtn).toHaveAttribute("aria-pressed", "false");

    // Switch back to Select mode
    await selectBtn.click();
    await expect(selectBtn).toHaveAttribute("aria-pressed", "true");
    await expect(uploadBtn).toHaveAttribute("aria-pressed", "false");
  });

  test("should remember file selection when switching modes", async ({
    page,
  }) => {
    // Wait for files to load
    await page.waitForResponse((response) =>
      response.url().includes("/api/files"),
    );

    // Select a language
    const languageSelect = page.getByLabel("Language");
    await languageSelect.click();
    const hiOption = page.locator('[role="option"]').filter({ hasText: /hi/i });
    if ((await hiOption.count()) > 0) {
      await hiOption.click();

      // Select a file
      await page.waitForTimeout(500);
      const fileButton = page
        .locator('[role="button"]')
        .filter({ hasText: /\.md/i })
        .first();
      if ((await fileButton.count()) > 0) {
        await fileButton.click();

        // Switch to Upload mode and back
        await page.getByRole("button", { name: /Upload File/i }).click();
        await page.getByRole("button", { name: /Select File/i }).click();

        // Language should still be selected
        await expect(languageSelect).toContainText(/hi/i);
      }
    }
  });
});

test.describe("API Health Status Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
  });

  test("should display API status indicator", async ({ page }) => {
    await page.waitForResponse((response) =>
      response.url().includes("/api/health"),
    );

    // Should show API Ready or version indicator
    const hasStatus =
      (await page
        .locator("text=API Ready")
        .isVisible()
        .catch(() => false)) ||
      (await page
        .locator("text=/v[0-9]+\\.[0-9]+\\.[0-9]+/")
        .isVisible()
        .catch(() => false));

    expect(hasStatus).toBe(true);
  });

  test("should indicate when Sarvam API is configured", async ({ page }) => {
    const response = await page.waitForResponse((response) =>
      response.url().includes("/api/health"),
    );

    const health = await response.json();
    expect(health.sarvam_api_configured).toBe(true);
  });
});

test.describe("Document Preview Tests", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("http://localhost:5173");
    await page.waitForLoadState("networkidle");
  });

  test("should display document title in preview", async ({ page }) => {
    // Upload file
    await page.getByRole("button", { name: /Upload File/i }).click();
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(TEST_FILE_PATH);

    await page.waitForResponse((response) =>
      response.url().includes("/parse/content"),
    );

    // Document preview should show the title
    await expect(page.locator("text=Document Preview")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should render markdown content properly", async ({ page }) => {
    // Upload file
    await page.getByRole("button", { name: /Upload File/i }).click();
    const fileInput = page.getByTestId("file-input");
    await fileInput.setInputFiles(TEST_FILE_PATH);

    await page.waitForResponse((response) =>
      response.url().includes("/parse/content"),
    );

    // Should render headings and paragraphs
    await expect(page.locator("text=Document Preview")).toBeVisible({
      timeout: 10000,
    });

    // Check for rendered content (headings should be bold or larger)
    const content = await page.locator(".markdown-preview, .document-preview").textContent();
    expect(content).toBeTruthy();
  });
});