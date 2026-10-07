const puppeteer = require('/var/www/ngocphieupc.shop/server/node_modules/puppeteer');

async function testAsusPuppeteer(serial) {
  console.log(`Starting Puppeteer ASUS lookup for S/N: ${serial}...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-accelerated-2d-canvas',
      '--no-first-run',
      '--no-zygote',
      '--disable-gpu',
    ],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.setViewport({ width: 1280, height: 800 });

    const url = `https://www.asus.com/vn/support/warranty-status-inquiry/?sn=${encodeURIComponent(serial)}`;
    console.log('Navigating to:', url);
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });

    // Wait for #checkPrivacy checkbox
    await page.waitForSelector('#checkPrivacy', { timeout: 10000 });
    console.log('Found #checkPrivacy, checking it...');
    await page.click('#checkPrivacy');

    // Click submit button containing "Hoàn tất"
    console.log('Looking for submit button...');
    const clicked = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button, input[type="submit"], a'));
      const submitBtn = buttons.find((b) => b.innerText && b.innerText.includes('Hoàn tất'));
      if (submitBtn) {
        submitBtn.click();
        return true;
      }
      return false;
    });
    console.log('Clicked submit button:', clicked);

    // Wait for result URL or result elements
    console.log('Waiting for result navigation...');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 20000 }).catch(() => null);

    console.log('Current Page URL after submit:', page.url());

    // Extract text content
    const data = await page.evaluate(() => {
      const bodyText = document.body.innerText;
      return {
        url: window.location.href,
        textSnippet: bodyText.slice(0, 800),
      };
    });

    console.log('Extracted Data:', data);
  } catch (err) {
    console.error('Puppeteer ASUS Error:', err);
  } finally {
    await browser.close();
  }
}

testAsusPuppeteer('SAYVYZ01R574BEN');
