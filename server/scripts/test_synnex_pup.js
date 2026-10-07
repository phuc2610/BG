const puppeteer = require('/var/www/ngocphieupc.shop/server/node_modules/puppeteer');

async function testSynnexPup(serial) {
  console.log(`Testing Synnex FPT Puppeteer for S/N: ${serial}...`);
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setUserAgent(
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
    );
    await page.goto('https://synnexfpt.com/bao-hanh/tra-cuu-san-pham-chinh-hang/', {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    console.log('Synnex Page URL:', page.url());
    // Find input
    const input = await page.$('input[name*="serial"], input[placeholder*="serial"], input[type="text"]');
    console.log('Input found:', Boolean(input));

    // Check reCAPTCHA iframe
    const frames = page.frames();
    const recaptchaFrame = frames.find(f => f.url().includes('recaptcha'));
    console.log('Recaptcha iframe found:', Boolean(recaptchaFrame));

    if (recaptchaFrame) {
      console.log('Synnex FPT has Google reCAPTCHA iframe checkbox.');
    }
  } catch (err) {
    console.error('Synnex Error:', err.message);
  } finally {
    await browser.close();
  }
}

testSynnexPup('SAYVYZ01R574BEN');
