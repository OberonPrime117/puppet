const puppeteer = require('puppeteer');
const mongoose = require('mongoose');

// MongoDB connection
mongoose.connect('mongodb://localhost:27017/example', {useNewUrlParser: true});

const pageSchema = new mongoose.Schema({
  url: {
    type: String,
    unique: true
  },
  html: String,
  text: String,
  title: String  
});

const Page = mongoose.model('Page', pageSchema);

const MAX_PARALLEL_LINKS = 10;
let urls = ['https://example.com'];

async function crawl() {

  const browser = await puppeteer.launch({
    args: ["--proxy-server=socks5://127.0.0.1:9050"]
  });  

  const pages = await Promise.all(Array.from({length: MAX_PARALLEL_LINKS}, () => browser.newPage()));

  while(urls.length > 0) {

    let promises = [];

    for(let i = 0; i < MAX_PARALLEL_LINKS; i++) {
    
      const currentUrl = urls.pop();

      if(!currentUrl) {
        break;
      }

      promises.push(crawlPage(pages[i], currentUrl));
    }

    await Promise.all(promises);
  
  }

  browser.close();

}



async function crawlPage(page, currentUrl) {

  const existing = await Page.findOne({url: currentUrl}).exec();
  if (existing) {
    console.log(`Skipping already saved URL: ${currentUrl}`);
    return;
  }

  try {
    await page.goto(currentUrl, {'timeout': 800000});
  } catch (error) {
    console.log(`Caught error ${error} in URL : ${currentUrl} - Skipping and moving on`);
    return;
  }

  // Extract info  
  const html = await page.content();
  const text = await page.evaluate(() => document.body.innerText);
  const title = await page.title();

  try {
    await new Page({ 
      url: currentUrl,
      html: html,
      text: text,
      title: title
    }).save();
  } catch (error) {
    if (error.code === 11000) {
      console.log(`Skipping already saved URL: ${currentUrl}`);
      return;
    }
    else {
      throw error;
    }
  }
   console.log(currentUrl);

  const links = await page.evaluate(() => {

    const isBBGLink = link => {
      return link.includes('example.com') || link.includes('www.example.com');
    }
    
    const anchors = document.querySelectorAll('a'); 
    return [...anchors]
    .map(anchor => anchor.href)
    .filter(href => isBBGLink(href));;
  });
  
  urls.push(...links);  
}

crawl();