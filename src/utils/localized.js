export const DEFAULT_LANGUAGE_CODE = "bg";
export const SUPPORTED_LANGUAGE_CODES = ["bg", "en", "de"];

const supportedLanguages = new Set(SUPPORTED_LANGUAGE_CODES);

function isRecord(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function hasValue(value) {
  return value !== null && typeof value !== "undefined" && value !== "";
}

function toCamelCase(key) {
  return String(key || "").replace(/[_-]([a-zA-Z0-9])/g, (_, letter) => letter.toUpperCase());
}

function capitalize(value) {
  const text = String(value || "");
  return text ? `${text.charAt(0).toUpperCase()}${text.slice(1)}` : "";
}

function getKeyVariants(key) {
  const rawKey = String(key || "");
  const camelKey = toCamelCase(rawKey);

  return [...new Set([
    rawKey,
    camelKey,
  ].filter(Boolean))];
}

function getLocalizedFieldCandidates(key, language) {
  return getKeyVariants(key).flatMap((fieldKey) => [
    `${fieldKey}_${language}`,
    `${fieldKey}-${language}`,
    `${language}_${fieldKey}`,
    `${language}-${fieldKey}`,
    `${fieldKey}${capitalize(language)}`,
    `${fieldKey}${language.toUpperCase()}`,
  ]);
}

function getTranslationContainers(source) {
  return [
    source?.translations,
    source?.translation,
    source?.i18n,
    source?.locales,
  ].filter(Boolean);
}

function getTranslationBucket(container, language) {
  if (Array.isArray(container)) {
    return container.find((item) => {
      const itemLanguage = item?.language || item?.lang || item?.locale || item?.code;
      return String(itemLanguage || "").toLowerCase() === language;
    }) || null;
  }

  if (!isRecord(container)) {
    return null;
  }

  return container[language] || container[language.toUpperCase()] || null;
}

function getValueByKeys(source, keys) {
  if (!isRecord(source)) {
    return undefined;
  }

  for (const key of keys) {
    for (const keyVariant of getKeyVariants(key)) {
      if (hasValue(source[keyVariant])) {
        return source[keyVariant];
      }
    }
  }

  return undefined;
}

export function normalizeLanguageCode(language) {
  const normalizedLanguage = String(language || "").toLowerCase();
  return supportedLanguages.has(normalizedLanguage) ? normalizedLanguage : DEFAULT_LANGUAGE_CODE;
}

export function getLocalizedValue(source, keys, language, fallback = "") {
  if (!isRecord(source)) {
    return fallback;
  }

  const normalizedLanguage = normalizeLanguageCode(language);
  const fieldKeys = Array.isArray(keys) ? keys : [keys];
  const languagesToTry = normalizedLanguage === DEFAULT_LANGUAGE_CODE
    ? [DEFAULT_LANGUAGE_CODE]
    : [normalizedLanguage, DEFAULT_LANGUAGE_CODE];

  for (const currentLanguage of languagesToTry) {
    for (const container of getTranslationContainers(source)) {
      const bucket = getTranslationBucket(container, currentLanguage);
      const value = getValueByKeys(bucket, fieldKeys);

      if (hasValue(value)) {
        return value;
      }
    }

    for (const key of fieldKeys) {
      const candidates = getLocalizedFieldCandidates(key, currentLanguage);
      const value = getValueByKeys(source, candidates);

      if (hasValue(value)) {
        return value;
      }
    }
  }

  const directValue = getValueByKeys(source, fieldKeys);
  return hasValue(directValue) ? directValue : fallback;
}

export function getLocalizedText(source, keys, language, fallback = "") {
  const value = getLocalizedValue(source, keys, language, fallback);
  return String(value || "").trim();
}

export function collectLocalizedValues(source, keys = []) {
  if (!isRecord(source)) {
    return [];
  }

  const fieldKeys = Array.isArray(keys) ? keys : [keys];
  const values = [];

  for (const key of fieldKeys) {
    for (const keyVariant of getKeyVariants(key)) {
      if (hasValue(source[keyVariant])) {
        values.push(source[keyVariant]);
      }
    }

    for (const language of SUPPORTED_LANGUAGE_CODES) {
      for (const candidate of getLocalizedFieldCandidates(key, language)) {
        if (hasValue(source[candidate])) {
          values.push(source[candidate]);
        }
      }
    }
  }

  for (const container of getTranslationContainers(source)) {
    if (Array.isArray(container)) {
      container.forEach((item) => {
        const value = getValueByKeys(item, fieldKeys);

        if (hasValue(value)) {
          values.push(value);
        }
      });
      continue;
    }

    if (isRecord(container)) {
      Object.values(container).forEach((bucket) => {
        const value = getValueByKeys(bucket, fieldKeys);

        if (hasValue(value)) {
          values.push(value);
        }
      });
    }
  }

  return [...new Set(values.map((value) => String(value)).filter(Boolean))];
}
