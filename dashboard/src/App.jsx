import React, { useEffect, useState } from "react";
import {
  DASHBOARD_ARTICLE_LIMIT,
  fetchArticles,
  fetchSentimentDistribution
} from "./api";
import ArticleCard from "./components/ArticleCard";
import ChartsPanel from "./components/ChartsPanel";

function computeWordFrequency(articles, limit = 20) {
  const frequency = new Map();
  const wordPattern = /[\p{L}\p{N}]+(?:['\u2019][\p{L}\p{N}]+)*/gu;

  for (const article of articles) {
    const title = article.translatedTitle || article.title || "";
    const tokens = title.toLowerCase().match(wordPattern) || [];

    for (const token of tokens) {
      frequency.set(token, (frequency.get(token) || 0) + 1);
    }
  }

  return [...frequency.entries()]
    .sort((a, b) => {
      if (b[1] !== a[1]) {
        return b[1] - a[1];
      }
      return a[0].localeCompare(b[0]);
    })
    .slice(0, limit)
    .map(([word, count]) => ({ word, count }));
}

function App() {
  const [articles, setArticles] = useState([]);
  const [wordFrequency, setWordFrequency] = useState([]);
  const [sentimentDistribution, setSentimentDistribution] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [articlesResponse, sentimentResponse] = await Promise.all([
          fetchArticles(DASHBOARD_ARTICLE_LIMIT),
          fetchSentimentDistribution()
        ]);
        const nextArticles = articlesResponse.data || [];
        setArticles(nextArticles);
        setWordFrequency(computeWordFrequency(nextArticles));
        setSentimentDistribution(sentimentResponse.data || {});
      } catch (err) {
        setError(err.message || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, []);

  if (loading) {
    return (
      <main className="container loading-state">
        <div className="spinner" />
        <span>Loading dashboard...</span>
      </main>
    );
  }

  if (error) {
    return <main className="container error-state">{error}</main>;
  }

  return (
    <main className="container">
      <header>
        <div>
          <h1>ElPais Intelligence</h1>
          <p>Opinion scraping · NLP · Visualization</p>
        </div>
        <div className="header-meta">
          <span className="badge">{articles.length} articles</span>
        </div>
      </header>

      <ChartsPanel wordFrequency={wordFrequency} sentimentDistribution={sentimentDistribution} />

      <div>
        <div className="section-header">
          <h2>Latest Articles</h2>
          <span className="article-count">{articles.length} total</span>
        </div>
        <div className="cards-grid">
          {articles.map((article) => (
            <ArticleCard key={article._id} article={article} />
          ))}
        </div>
      </div>
    </main>
  );
}

export default App;
