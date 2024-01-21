const puppeteer = require('puppeteer'); 

(async () => {
  const browser = await puppeteer.launch({
    args: ["--proxy-server=socks5://127.0.0.1:9050"]
  });
  const page = await browser.newPage();
  await page.goto('https://check.torproject.org/');
  const ip = await page.evaluate(() => {
    return document.body.textContent; 
  });
  
  console.log(`My public IP is: ${ip}`);
  
  await browser.close();
})();