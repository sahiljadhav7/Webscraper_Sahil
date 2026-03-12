import React from "react";

function sentimentClass(score) {
  if (score > 0.2) return "positive";
  if (score < -0.2) return "negative";
  return "neutral";
}

function sentimentLabel(score) {
  if (score > 0.2) return "Positive";
  if (score < -0.2) return "Negative";
  return "Neutral";
}

function ArticleCard({ article }) {
  const sClass = sentimentClass(article.sentimentScore);
  return (
    <article className="article-card">
      {article.image && (
        <img src={article.image} alt={article.translatedTitle || article.title} className="article-image" />
      )}
      <div className="article-body">
        <h3>{article.translatedTitle || article.title}</h3>
        {article.translatedTitle && article.title !== article.translatedTitle && (
          <p className="translated">{article.title}</p>
        )}
        <div className="article-footer">
          <span className={`sentiment-chip ${sClass}`}>{sentimentLabel(article.sentimentScore)}</span>
          <a href={article.source} target="_blank" rel="noreferrer">↗ Source</a>
        </div>
      </div>
    </article>
  );
}

export default ArticleCard;
