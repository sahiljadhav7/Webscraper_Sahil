const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000/api";

export async function fetchArticles() {
  const response = await fetch(`${API_BASE_URL}/articles`);
  if (!response.ok) {
    throw new Error("Failed to fetch articles");
  }
  return response.json();
}

export async function fetchWordFrequency() {
  const response = await fetch(`${API_BASE_URL}/analytics/word-frequency`);
  if (!response.ok) {
    throw new Error("Failed to fetch word frequency");
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
