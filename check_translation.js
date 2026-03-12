require("dotenv").config();
const connectDB = require("./database/db");
const Article = require("./database/articleModel");

async function checkTranslation() {
  await connectDB();
  const articles = await Article.find({ $expr: { $eq: ["$title", "$translatedTitle"] } });
  
  if (articles.length === 0) {
    console.log("No untranslated articles found.");
  } else {
    console.log(`Found ${articles.length} untranslated articles:`);
    articles.forEach(a => {
      console.log(`- ID: ${a._id}`);
      console.log(`  Title: ${a.title}`);
      console.log(`  Source: ${a.source}`);
    });
  }
  process.exit(0);
}

checkTranslation().catch(err => {
  console.error(err);
  process.exit(1);
});
