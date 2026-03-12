const path = require("path");
const mongoose = require("mongoose");
const Article = require("../../database/articleModel");
const { computeWordFrequency } = require("../../analysis/wordFrequency");
const { ensureArticleTranslation, ensureArticleTranslations } = require("../../scraper/translate");

function toApiImageUrl(req, imageValue) {
  if (!imageValue || typeof imageValue !== "string") {
    return "";
  }

  if (/^https?:\/\//i.test(imageValue)) {
    return imageValue;
  }

  const baseUrl = `${req.protocol}://${req.get("host")}`;

  if (imageValue.startsWith("/images/")) {
    return `${baseUrl}${imageValue}`;
  }

  const fileName = path.basename(imageValue);
  return `${baseUrl}/images/${encodeURIComponent(fileName)}`;
}

function serializeArticle(req, articleDoc) {
  const article = articleDoc.toObject ? articleDoc.toObject() : articleDoc;
  return {
    ...article,
    image: toApiImageUrl(req, article.image)
  };
}

async function getArticles(req, res) {
  try {
    const limit = Number.parseInt(req.query.limit, 10) || 50;
    const articles = await Article.find().sort({ updatedAt: -1 }).limit(limit);
    await ensureArticleTranslations(articles);
    const data = articles.map((article) => serializeArticle(req, article));
    res.json({ count: data.length, data });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch articles", details: error.message });
  }
}

async function getArticleById(req, res) {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: "Invalid article id" });
    }

    const article = await Article.findById(id);
    if (!article) {
      return res.status(404).json({ error: "Article not found" });
    }

    await ensureArticleTranslation(article);

    return res.json(serializeArticle(req, article));
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch article", details: error.message });
  }
}

async function searchArticles(req, res) {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      return res.status(400).json({ error: "Query parameter 'q' is required" });
    }

    const regex = new RegExp(q, "i");
    const articles = await Article.find({
      $or: [
        { title: regex },
        { translatedTitle: regex },
        { content: regex },
        { keywords: regex }
      ]
    })
      .sort({ updatedAt: -1 })
      .limit(100);

    const data = articles.map((article) => serializeArticle(req, article));
    return res.json({ count: data.length, data });
  } catch (error) {
    return res.status(500).json({ error: "Search failed", details: error.message });
  }
}

async function getWordFrequency(req, res) {
  try {
    const limit = Number.parseInt(req.query.limit, 10) || 50;
    const articles = await Article.find().sort({ updatedAt: -1 }).limit(limit);
    await ensureArticleTranslations(articles);
    const titles = articles.map((article) => article.translatedTitle || article.title);
    const frequency = computeWordFrequency(titles, 20);

    res.json({ count: frequency.length, data: frequency });
  } catch (error) {
    res.status(500).json({ error: "Failed to compute word frequency", details: error.message });
  }
}

async function getSentimentDistribution(req, res) {
  try {
    const articles = await Article.find({}, { sentimentScore: 1 });

    const distribution = {
      positive: 0,
      neutral: 0,
      negative: 0
    };

    for (const article of articles) {
      if (article.sentimentScore > 0.2) {
        distribution.positive += 1;
      } else if (article.sentimentScore < -0.2) {
        distribution.negative += 1;
      } else {
        distribution.neutral += 1;
      }
    }

    res.json({ data: distribution });
  } catch (error) {
    res.status(500).json({ error: "Failed to compute sentiment distribution", details: error.message });
  }
}

module.exports = {
  getArticles,
  getArticleById,
  searchArticles,
  getWordFrequency,
  getSentimentDistribution
};
