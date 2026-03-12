const cron = require("node-cron");
const { main } = require("./scraper");

const schedule = process.env.SCRAPER_CRON || "0 0 * * *";

async function runJob() {
  try {
    console.log("Starting scheduled scraper job...");
    await main({ runLocalHeadful: true });
    console.log("Scheduled scraper job finished.");
  } catch (error) {
    console.error("Scheduled scraper job failed:", error.message);
  }
}

cron.schedule(schedule, runJob);
console.log(`Scraper scheduler running with cron: ${schedule}`);

runJob();
