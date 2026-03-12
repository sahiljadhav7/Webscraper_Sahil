const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export const DASHBOARD_ARTICLE_LIMIT = 5;

export async function fetchArticles(limit = DASHBOARD_ARTICLE_LIMIT) {
  const response = await fetch(`${API_BASE_URL}/articles?limit=${limit}`);
  if (!response.ok) {
    throw new Error("Failed to fetch articles");
  }
  return response.json();
}

export async function fetchSentimentDistribution() {
  const response = await fetch(`${API_BASE_URL}/analytics/sentiment-distribution`);
  if (!response.ok) {
    throw new Error("Failed to fetch sentiment distribution");
  }
  return response.json();
}
