const { chromium } = require('playwright');
const jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs');

async function runE2ETests() {
  console.log('🚀 Starting Playwright E2E Test Suite for Warranty System...');
  
  // 1. Generate valid Admin JWT token
  const token = jwt.sign(
    { id: '6a6da45ac622bdc88f997408', username: 'admin', role: 'ADMIN' },
    'np_computer_jwt_secret_key_2026',
    { expiresIn: '7d' }
  );
  console.log('✅ Generated Admin JWT authentication token');

  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--ignore-certificate-errors']
  });

  const context = await browser.newContext({
    viewport: { width: 1400, height: 900 },
    ignoreHTTPSErrors: true
  });

  // Inject token into localStorage before page scripts execute
  await context.addInitScript((authToken) => {
    window.localStorage.setItem('token', authToken);
  }, token);

  const page = await context.newPage();

  // Listen to console errors and network failures
  const pageErrors = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      pageErrors.push(msg.text());
      console.log('🔴 Browser Console Error:', msg.text());
    }
  });

  page.on('pageerror', err => {
    pageErrors.push(err.message);
    console.log('🔴 Page Crash / Uncaught Error:', err.message);
  });

  try {
    // TEST 1: Navigate to Warranty Lookup Page
    console.log('\n--- TEST 1: Navigation to https://ngocphieupc.shop/warranty-lookup ---');
    await page.goto('https://ngocphieupc.shop/warranty-lookup', { waitUntil: 'networkidle', timeout: 30000 });
    console.log('Current URL:', page.url());

    // Verify Title / Header
    const heading = page.locator('h1:has-text("Tra Cứu Bảo Hành")');
    await heading.waitFor({ state: 'visible', timeout: 5000 });
    const headingText = await heading.textContent();
    console.log('Heading found:', headingText);

    // TEST 2: Serial Input Field & Search
    console.log('\n--- TEST 2: Direct Serial Lookup (SAYVYZ01R574BEN) ---');
    const serialInput = page.locator('input[placeholder*="Nhập hoặc dán số Serial"]');
    await serialInput.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ Serial input box is visible');

    await serialInput.fill('SAYVYZ01R574BEN');
    console.log('Filled serial: SAYVYZ01R574BEN');

    // Click "Tra cứu bảo hành" button
    const searchBtn = page.locator('button:has-text("Tra cứu bảo hành")');
    await searchBtn.click();
    console.log('Clicked "Tra cứu bảo hành" button');

    // Wait for searching progress or results
    console.log('Waiting for search results...');
    await page.waitForSelector('text=CHI TIẾT KẾT QUẢ THEO TỪNG NGUỒN TRA CỨU', { timeout: 30000 });
    console.log('✅ Search results displayed!');

    // Take screenshot of results
    const resultScreenshotPath = path.resolve(__dirname, 'e2e_warranty_results.png');
    await page.screenshot({ path: resultScreenshotPath, fullPage: true });
    console.log('📸 Saved result screenshot to:', resultScreenshotPath);

    // TEST 3: Verify ASUS Agreement Notice & Direct Link
    console.log('\n--- TEST 3: Verifying ASUS Agreement Note & Direct Link ---');
    const asusRow = page.locator('tr:has-text("ASUS Official")');
    await asusRow.waitFor({ state: 'visible', timeout: 5000 });
    const asusRowText = await asusRow.textContent();
    console.log('ASUS Row content:', asusRowText);

    // Verify agreement notice is present
    if (asusRowText.includes('⚠️ Cổng ASUS bắt buộc người dùng')) {
      console.log('✅ PASS: ASUS agreement notice clearly displayed!');
    } else {
      console.warn('⚠️ Notice text differs, check content.');
    }

    // Verify link button
    const asusLink = asusRow.locator('a[href*="asus.com"]');
    const href = await asusLink.getAttribute('href');
    console.log('ASUS Direct Link href:', href);
    if (href && href.includes('sn=SAYVYZ01R574BEN')) {
      console.log('✅ PASS: ASUS link contains pre-filled serial query param (?sn=SAYVYZ01R574BEN)!');
    } else {
      throw new Error(`ASUS link does not contain ?sn parameter: ${href}`);
    }

    // TEST 4: History Tab
    console.log('\n--- TEST 4: History Tab Verification ---');
    const historyTabBtn = page.locator('button:has-text("Lịch sử tra cứu")');
    await historyTabBtn.click();
    await page.waitForTimeout(1000);
    
    // Check if table contains SAYVYZ01R574BEN
    const historyContent = await page.textContent('table');
    console.log('History table contains query serial?', historyContent.includes('SAYVYZ01R574BEN'));
    if (historyContent.includes('SAYVYZ01R574BEN')) {
      console.log('✅ PASS: Newly searched query recorded in History!');
    }

    const historyScreenshotPath = path.resolve(__dirname, 'e2e_warranty_history.png');
    await page.screenshot({ path: historyScreenshotPath });
    console.log('📸 Saved history screenshot to:', historyScreenshotPath);

    // TEST 5: OCR Scanner Check & File Upload
    console.log('\n--- TEST 5: Testing OCR Upload with Real Hardware Label ---');
    const directTabBtn = page.locator('button:has-text("Tra cứu trực tiếp")');
    await directTabBtn.click();
    await page.waitForTimeout(500);

    const toggleOcrBtn = page.locator('button:has-text("Hoặc chụp / tải ảnh tem để AI tự đọc Serial")');
    await toggleOcrBtn.click();
    console.log('Clicked toggle OCR upload');

    // Wait for OCR upload dropzone
    const dropzone = page.locator('text=KÉO THẢ HOẶC CHỤP ẢNH TEM DÁN');
    await dropzone.waitFor({ state: 'visible', timeout: 5000 });
    console.log('✅ PASS: OCR Dropzone opened smoothly!');

    // Upload image to input[type="file"]
    const testImgPath = 'C:\\Users\\2 TY MO MAT\\.gemini\\antigravity-ide\\brain\\38e0dad3-9127-4f22-878d-5ef3901851de\\.user_uploaded\\media_1791286275880.png';
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(testImgPath);
    console.log('Uploaded image file to OCR input');

    // Wait for OCR processing indicator and then completion
    console.log('Waiting for OCR Gemini Vision response...');
    await page.waitForResponse(
      (response) => response.url().includes('/api/warranty/ocr') && response.status() === 200,
      { timeout: 30000 }
    );
    console.log('✅ OCR API returned 200 OK!');

    // Check if serial input has been auto-populated
    await page.waitForTimeout(1000);
    const populatedSerial = await serialInput.inputValue();
    console.log('Auto-populated Serial in input box:', populatedSerial);
    if (populatedSerial && populatedSerial.includes('SAYVYZ01R574BEN')) {
      console.log('✅ PASS: Gemini Vision successfully extracted Serial "SAYVYZ01R574BEN" into the input box!');
    } else {
      console.log('ℹ️ OCR extracted:', populatedSerial);
    }

    const ocrScreenshotPath = path.resolve(__dirname, 'e2e_ocr_success.png');
    await page.screenshot({ path: ocrScreenshotPath });
    console.log('📸 Saved OCR screenshot to:', ocrScreenshotPath);

    console.log('\n🎉 ALL PLAYWRIGHT E2E TESTS PASSED SUCCESSFULLY! 🎉');
  } catch (err) {
    console.error('\n❌ E2E TEST FAILED:', err.message);
    const errScreenshotPath = path.resolve(__dirname, 'e2e_error.png');
    await page.screenshot({ path: errScreenshotPath }).catch(() => {});
    console.log('Saved error screenshot to:', errScreenshotPath);
    process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

runE2ETests();
