const { chromium } = require('playwright');
const path = require('path');

async function testAsusAutomation() {
  console.log('Testing automated ASUS inquiry with Playwright...');
  const browser = await chromium.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    viewport: { width: 1280, height: 800 }
  });
  const page = await context.newPage();

  try {
    const sn = 'SAYVYZ01R574BEN';
    const url = 'https://www.asus.com/vn/support/warranty-status-inquiry/?sn=' + sn;
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'networkidle', timeout: 30000 });

    console.log('Page loaded, URL:', page.url());

    // Check if #checkPrivacy exists
    const privacyCheckbox = page.locator('#checkPrivacy');
    const exists = await privacyCheckbox.count();
    console.log('#checkPrivacy count:', exists);

    if (exists > 0) {
      await privacyCheckbox.check({ force: true });
      console.log('Checked #checkPrivacy!');

      // Listen for network responses
      page.on('response', async res => {
        if (res.url().includes('GetWarranty')) {
          console.log('Intercepted GetWarranty response:', res.status());
          const json = await res.json().catch(() => null);
          console.log('GetWarranty payload:', JSON.stringify(json));
        }
      });

      // Find submit button (contains Hoàn tất)
      const submitBtn = page.locator('text=Hoàn tất');
      console.log('Submit button count:', await submitBtn.count());
      await submitBtn.first().click();
      console.log('Clicked submit button!');

      await page.waitForTimeout(6000);
      console.log('Final Page URL:', page.url());

      await page.screenshot({ path: path.resolve(__dirname, 'asus_result.png') });
      console.log('Screenshot saved to asus_result.png');
    }
  } catch (err) {
    console.error('Error during test:', err);
  } finally {
    await browser.close();
  }
}

testAsusAutomation();
