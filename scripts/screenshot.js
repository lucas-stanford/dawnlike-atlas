import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.goto('http://localhost:6006/iframe.html?id=dawnlike-ai-generation-character-gallery--sage-16-bit&viewMode=story', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'storybook_screenshot.png', fullPage: true });
  
  await page.goto('http://localhost:6006/iframe.html?id=dawnlike-ai-generation-character-gallery--sage-jrpg&viewMode=story', { waitUntil: 'networkidle' });
  await page.screenshot({ path: 'storybook_jrpg_screenshot.png', fullPage: true });
  
  await browser.close();
})();
