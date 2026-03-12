import React from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

function ChartsPanel({ wordFrequency, sentimentDistribution }) {
  const total =
    (sentimentDistribution.positive || 0) +
    (sentimentDistribution.neutral || 0) +
    (sentimentDistribution.negative || 0) || 1;

  const wordData = {
    labels: wordFrequency.map((item) => item.word),
    datasets: [
      {
        label: "Count",
        data: wordFrequency.map((item) => item.count),
        backgroundColor: "rgba(88,166,255,0.7)",
        borderRadius: 4,
        borderSkipped: false
      }
    ]
  };

  const wordOptions = {
    responsive: true,
    maintainAspectRatio: true,
    plugins: { legend: { display: false } },
    scales: {
      x: {
        ticks: { color: "#8b949e", font: { size: 10 } },
        grid: { color: "#21262d" }
      },
      y: {
        beginAtZero: true,
        ticks: { color: "#8b949e", font: { size: 10 }, stepSize: 1, precision: 0 },
        grid: { color: "#21262d" }
      }
    }
  };

  const sentimentRows = [
    { key: "positive", label: "Positive", color: "#3fb950" },
    { key: "neutral",  label: "Neutral",  color: "#d29922" },
    { key: "negative", label: "Negative", color: "#f85149" }
  ];

  return (
    <section className="charts-grid">
      <div className="chart-card">
        <h2>Word Frequency</h2>
        <Bar data={wordData} options={wordOptions} />
      </div>
      <div className="chart-card">
        <h2>Sentiment</h2>
        <div className="sentiment-pills">
          {sentimentRows.map(({ key, label, color }) => {
            const val = sentimentDistribution[key] || 0;
            const pct = Math.round((val / total) * 100);
            return (
              <div className="sentiment-row" key={key}>
                <span className="label">{label}</span>
                <div className="sentiment-bar-track">
                  <div
                    className="sentiment-bar-fill"
                    style={{ width: `${pct}%`, background: color }}
                  />
                </div>
                <span className="count">{val}</span>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export default ChartsPanel;
