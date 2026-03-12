async function translateTitles(articleData) {
  const translate = (await import("translate")).default;

  for (const article of articleData) {
    try {
      article.translatedTitle = await translate(article.title, {
        from: "es",
        to: "en"
      });
      console.log(`Original: ${article.title}`);
      console.log(`Translated: ${article.translatedTitle}`);
    } catch (error) {
      console.log(`Translation failed for: ${article.title}`, error.message);
      article.translatedTitle = article.title;
    }
  }

  return articleData;
}

module.exports = { translateTitles };
