require("dotenv").config();

const { Builder, By, until } = require("selenium-webdriver");
const chrome = require("selenium-webdriver/chrome");
const { translateTitles } = require("./translate");
const { downloadImage } = require("./imageDownloader");
const connectDB = require("../database/db");
const Article = require("../database/articleModel");
const { analyzeSentiment } = require("../analysis/sentiment");
const { extractKeywords } = require("../analysis/keywordExtraction");

// Tries to click the cookie accept button. El País uses Didomi for consent.
// If no banner appears within 5 seconds, it silently moves on.
async function acceptCookies(driver) {
  const cookieSelectors = [
    "#didomi-notice-agree-button",
    "button[id*='accept']",
    "button[class*='accept']",
    ".didomi-continue-without-agreeing"
  ];

  try {
    for (const selector of cookieSelectors) {
      try {
        const btn = await driver.wait(
          until.elementLocated(By.css(selector)),
          5000
        );
        await driver.wait(until.elementIsVisible(btn), 2000);
        await btn.click();
        console.log(`Accepted cookies via: ${selector}`);
        // Small pause to let the banner dismiss before continuing
        await driver.sleep(1000);
        return;
      } catch (_) {
        // Try next selector
      }
    }
    console.log("No cookie banner found, continuing...");
  } catch (_) {
    console.log("Cookie acceptance skipped.");
  }
}

async function scrapeArticles(driver) {
  await driver.get("https://elpais.com/opinion/");
  await acceptCookies(driver);
  await driver.wait(until.elementLocated(By.css(".c-d")), 10000);

  let articles = await driver.findElements(By.css(".c-d"));
  if (articles.length > 5) {
    articles = articles.slice(0, 5);
  }

  const articleData = [];
  const links = [];

  for (const article of articles) {
    try {
      const titleElement = await article.findElement(By.css("h2 a"));
      const title = await titleElement.getText();
      const link = await titleElement.getAttribute("href");
      links.push({ title, link });
    } catch (error) {
      console.log("Error getting link:", error.message);
    }
  }

  for (const { title, link } of links) {
    try {
      await driver.get(link);
      await driver.wait(until.elementLocated(By.css(".a_c")), 10000);

      const contentElement = await driver.findElement(By.css(".a_c"));
      const content = await contentElement.getText();
      const image = await downloadImage(driver, title);

      articleData.push({ title, content, source: link, image });
    } catch (error) {
      console.log(`Error scraping article: ${title}`, error.message);
    }
  }

  return articleData;
}

function analyzeHeaders(articleData) {
  const allWords = articleData
    .map((article) => article.translatedTitle)
    .join(" ")
    .toLowerCase()
    .replace(/[^\w\s]/g, "")
    .split(/\s+/);

  const wordCount = {};
  allWords.forEach((word) => {
    if (word.length > 2) {
      wordCount[word] = (wordCount[word] || 0) + 1;
    }
  });

  const repeated = Object.keys(wordCount).filter((word) => wordCount[word] > 2);
  console.log("Repeated words (more than 2 times):");
  repeated.forEach((word) => console.log(`${word}: ${wordCount[word]}`));
}

async function persistArticles(articleData) {
  await connectDB();

  const savedArticles = [];
  for (const article of articleData) {
    const payload = {
      title: article.title,
      translatedTitle: article.translatedTitle || article.title,
      content: article.content || "",
      image: article.image || "",
      source: article.source,
      sentimentScore: analyzeSentiment(article.content || ""),
      keywords: extractKeywords(article.content || "", 8),
      scrapedAt: new Date()
    };

    const saved = await Article.findOneAndUpdate(
      { source: payload.source },
      { $set: payload },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    savedArticles.push(saved);
  }

  console.log(`Saved ${savedArticles.length} articles to MongoDB`);
  return savedArticles;
}

async function runLocal() {
  console.log("Running locally...");

  const options = new chrome.Options();
  options.setPageLoadStrategy("eager");
 
  options.addArguments("--disable-gpu");

  const driver = await new Builder()
    .forBrowser("chrome")
    .setChromeOptions(options)
    .build();

  try {
    const articleData = await scrapeArticles(driver);
    await translateTitles(articleData);
    analyzeHeaders(articleData);
    return articleData;
  } finally {
    await driver.quit();
  }
}

async function runOnBrowserStack(capabilities) {
  const username = process.env.BROWSERSTACK_USERNAME;
  const accessKey = process.env.BROWSERSTACK_ACCESS_KEY;

  if (!username || !accessKey) {
    throw new Error("Missing BrowserStack credentials. Set BROWSERSTACK_USERNAME and BROWSERSTACK_ACCESS_KEY.");
  }

  const mergedCapabilities = {
    ...capabilities,
    "bstack:options": {
      ...(capabilities["bstack:options"] || {}),
      buildName: process.env.BROWSERSTACK_BUILD_NAME || "El Pais Scraper Build",
      sessionName:
        (capabilities["bstack:options"] && capabilities["bstack:options"].sessionName) ||
        capabilities.sessionName ||
        "El Pais Scraper Session",
      userName: username,
      accessKey
    }
  };

  const hubUrl =
    process.env.BROWSERSTACK_HUB_URL ||
    `https://${username}:${accessKey}@hub-cloud.browserstack.com/wd/hub`;

  const driver = await new Builder()
    .usingServer(hubUrl)
    .withCapabilities(mergedCapabilities)
    .build();

  try {
    const articleData = await scrapeArticles(driver);
    await translateTitles(articleData);
    analyzeHeaders(articleData);

    await driver.executeScript(
      'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"passed","reason":"Web scraping and translation completed successfully"}}'
    );

    return articleData;
  } catch (error) {
    console.error("Error during test:", error.message);
    try {
      await driver.executeScript(
        'browserstack_executor: {"action": "setSessionStatus", "arguments": {"status":"failed","reason":"' +
          error.message +
          '"}}'
      );
    } catch (sessionError) {
      console.log("Could not update session status:", sessionError.message);
    }
    throw error;
  } finally {
    await driver.quit();
  }
}

async function scrapeOpinionArticles(options = {}) {
  let articleData;
  if (options.browserstack && options.capabilities) {
    articleData = await runOnBrowserStack(options.capabilities);
  } else {
    articleData = await runLocal();
  }

  return persistArticles(articleData);
}

async function main() {
  const useBrowserStack = process.env.USE_BROWSERSTACK === "true";
  if (
    useBrowserStack &&
    process.env.BROWSERSTACK_USERNAME &&
    process.env.BROWSERSTACK_ACCESS_KEY
  ) {
    console.log("Running on BrowserStack...");

    const capabilitiesList = [
      {
        browserName: "Chrome",
        "bstack:options": {
          os: "Windows",
          osVersion: "10",
          browserVersion: "latest",
          buildName: process.env.BROWSERSTACK_BUILD_NAME || "El Pais Scraper Build",
          sessionName: "El Pais Scraper - Chrome Desktop",
          userName: process.env.BROWSERSTACK_USERNAME,
          accessKey: process.env.BROWSERSTACK_ACCESS_KEY
        }
      },
      {
        browserName: "Firefox",
        "bstack:options": {
          os: "Windows",
          osVersion: "10",
          browserVersion: "latest",
          buildName: process.env.BROWSERSTACK_BUILD_NAME || "El Pais Scraper Build",
          sessionName: "El Pais Scraper - Firefox Desktop",
          userName: process.env.BROWSERSTACK_USERNAME,
          accessKey: process.env.BROWSERSTACK_ACCESS_KEY
        }
      },
      {
        browserName: "Safari",
        "bstack:options": {
          os: "OS X",
          osVersion: "Ventura",
          browserVersion: "latest",
          buildName: process.env.BROWSERSTACK_BUILD_NAME || "El Pais Scraper Build",
          sessionName: "El Pais Scraper - Safari Desktop",
          userName: process.env.BROWSERSTACK_USERNAME,
          accessKey: process.env.BROWSERSTACK_ACCESS_KEY
        }
      },
      {
        deviceName: "iPhone 14",
        browserName: "Safari",
        "bstack:options": {
          osVersion: "16",
          buildName: process.env.BROWSERSTACK_BUILD_NAME || "El Pais Scraper Build",
          sessionName: "El Pais Scraper - Safari Mobile",
          userName: process.env.BROWSERSTACK_USERNAME,
          accessKey: process.env.BROWSERSTACK_ACCESS_KEY
        }
      },
      {
        deviceName: "Google Pixel 7",
        browserName: "Chrome",
        "bstack:options": {
          osVersion: "13.0",
          buildName: process.env.BROWSERSTACK_BUILD_NAME || "El Pais Scraper Build",
          sessionName: "El Pais Scraper - Chrome Mobile",
          userName: process.env.BROWSERSTACK_USERNAME,
          accessKey: process.env.BROWSERSTACK_ACCESS_KEY
        }
      }
    ];

    const runs = await Promise.all(capabilitiesList.map((cap) => runOnBrowserStack(cap)));
    const merged = runs.flat();
    return persistArticles(merged);
  }

  const articleData = await runLocal();
  return persistArticles(articleData);
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  scrapeArticles,
  analyzeHeaders,
  persistArticles,
  runLocal,
  runOnBrowserStack,
  scrapeOpinionArticles,
  main
};
