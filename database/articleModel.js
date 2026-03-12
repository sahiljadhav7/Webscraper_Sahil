const mongoose = require("mongoose");

const articleSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    translatedTitle: { type: String, default: "" },
    content: { type: String, required: true },
    image: { type: String, default: "" },
    source: { type: String, required: true, unique: true },
    sentimentScore: { type: Number, default: 0 },
    keywords: [{ type: String }],
    scrapedAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

articleSchema.index({
  title: "text",
  translatedTitle: "text",
  content: "text",
  keywords: "text"
});

module.exports = mongoose.model("Article", articleSchema);
