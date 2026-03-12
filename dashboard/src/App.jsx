import React, { useEffect, useState } from "react";
import { fetchArticles, fetchWordFrequency, fetchSentimentDistribution } from "./api";
import ArticleCard from "./components/ArticleCard";
import ChartsPanel from "./components/ChartsPanel";

function App() {
  const [articles, setArticles] = useState([]);
  const [wordFrequency, setWordFrequency] = useState([]);
  const [sentimentDistribution, setSentimentDistribution] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function loadDashboardData() {
      try {
        const [articlesResponse, frequencyResponse, sentimentResponse] = await Promise.all([
          fetchArticles(),
          fetchWordFrequency(),
          fetchSentimentDistribution()
        ]);
        setArticles(articlesResponse.data || []);
        setWordFrequency(frequencyResponse.data || []);
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
