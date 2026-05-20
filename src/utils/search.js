const cyrillicToLatin = {
  а: "a",
  б: "b",
  в: "v",
  г: "g",
  д: "d",
  е: "e",
  ж: "zh",
  з: "z",
  и: "i",
  й: "y",
  к: "k",
  л: "l",
  м: "m",
  н: "n",
  о: "o",
  п: "p",
  р: "r",
  с: "s",
  т: "t",
  у: "u",
  ф: "f",
  х: "h",
  ц: "ts",
  ч: "ch",
  ш: "sh",
  щ: "sht",
  ъ: "a",
  ь: "",
  ю: "yu",
  я: "ya",
};

export function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[а-я]/g, (letter) => cyrillicToLatin[letter] || letter)
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function productMatchesSearch(product, query) {
  const normalizedQuery = normalizeSearchText(query);

  if (!normalizedQuery) {
    return false;
  }

  const searchableText = [
    product.name,
    product.slug,
    product.description,
    ...(product.categories || []).map((category) => category.name),
  ].join(" ");

  return normalizeSearchText(searchableText).includes(normalizedQuery);
}

export function getProductUrl(product) {
  return `/products/${product.slug || product.id}`;
}
