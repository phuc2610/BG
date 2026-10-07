const puppeteer = require('/var/www/ngocphieupc.shop/server/node_modules/puppeteer');

(async () => {
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    console.log('Puppeteer launched successfully on VPS!');
    const page = await browser.newPage();
    await page.goto('https://example.com');
    const title = await page.title();
    console.log('Title on example.com:', title);
    await browser.close();
  } catch (e) {
    console.error('Puppeteer error:', e);
  }
})();
