const DEFAULT_SOURCE_LANGUAGE = process.env.TRANSLATE_SOURCE_LANGUAGE || "es";
const DEFAULT_TARGET_LANGUAGE = process.env.TRANSLATE_TARGET_LANGUAGE || "en";
const PRIMARY_TRANSLATE_ENGINE = process.env.TRANSLATE_ENGINE || "google";

let translatorsPromise;

function normalizeTitle(value) {
  return typeof value === "string" ? value.trim() : "";
}

function needsTranslation(article) {
  if (!article || typeof article !== "object") {
    return false;
  }

  const title = normalizeTitle(article.title);
  const translatedTitle = normalizeTitle(article.translatedTitle);
  return Boolean(title) && (!translatedTitle || translatedTitle === title);
}

function buildTranslateOptions(engine) {
  const options = {
    engine,
    from: DEFAULT_SOURCE_LANGUAGE,
    to: DEFAULT_TARGET_LANGUAGE
  };

  if (engine === PRIMARY_TRANSLATE_ENGINE && process.env.TRANSLATE_API_KEY) {
    options.key = process.env.TRANSLATE_API_KEY;
  }

  if (engine === PRIMARY_TRANSLATE_ENGINE && process.env.TRANSLATE_API_URL) {
    options.url = process.env.TRANSLATE_API_URL;
  }

  return options;
}

async function getTranslators() {
  if (!translatorsPromise) {
    translatorsPromise = import("translate").then((module) => {
      const { Translate } = module;
      const engines = [PRIMARY_TRANSLATE_ENGINE];

      if (PRIMARY_TRANSLATE_ENGINE !== "google") {
        engines.push("google");
      }

      return engines.map((engine) => ({
        engine,
        translate: Translate(buildTranslateOptions(engine))
      }));
    });
  }

  return translatorsPromise;
}

async function translateTitle(title) {
  const normalizedTitle = normalizeTitle(title);
  if (!normalizedTitle) {
    return "";
  }

  const translators = await getTranslators();

  for (const translatorEntry of translators) {
    try {
      const translatedTitle = await translatorEntry.translate(normalizedTitle, {
        from: DEFAULT_SOURCE_LANGUAGE,
        to: DEFAULT_TARGET_LANGUAGE
      });

      const normalizedTranslation = normalizeTitle(translatedTitle);
      if (normalizedTranslation) {
        return normalizedTranslation;
      }
    } catch (error) {
      console.log(
        `Translation failed for: ${normalizedTitle} via ${translatorEntry.engine}`,
        error.message
      );
    }
  }

  return normalizedTitle;
}

async function ensureArticleTranslation(article) {
  if (!article || typeof article !== "object") {
    return article;
  }

  if (!needsTranslation(article)) {
    return article;
  }

  const previousTranslatedTitle = normalizeTitle(article.translatedTitle);
  article.translatedTitle = await translateTitle(article.title);

  if (
    typeof article.save === "function" &&
    article.translatedTitle &&
    article.translatedTitle !== previousTranslatedTitle
  ) {
    await article.save();
  }

  return article;
}

async function ensureArticleTranslations(articles) {
  if (!Array.isArray(articles)) {
    return [];
  }

  for (const article of articles) {
    await ensureArticleTranslation(article);
  }

  return articles;
}

async function translateTitles(articleData) {
  if (!Array.isArray(articleData)) {
    return [];
  }

  for (const article of articleData) {
    const originalTitle = normalizeTitle(article && article.title);
    article.translatedTitle = await translateTitle(originalTitle);

    if (originalTitle) {
      console.log(`Original: ${originalTitle}`);
      console.log(`Translated: ${article.translatedTitle}`);
    }
  }

  return articleData;
}

module.exports = {
  ensureArticleTranslation,
  ensureArticleTranslations,
  needsTranslation,
  translateTitle,
  translateTitles
};
