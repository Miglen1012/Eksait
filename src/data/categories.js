export const categories = [
  { label: "Свредла", slug: "sverdla" },
  { label: "Фрези", slug: "frezi" },
  { label: "Метчици", slug: "metchici" },
  { label: "Плашки", slug: "plashki" },
  { label: "Ножове", slug: "nojove" },
  { label: "Кобалт", slug: "kobalt" },
  { label: "Държачи", slug: "darjachi" },
  { label: "Щанги", slug: "shtangi" },
  { label: "Пластини", slug: "plastini" },
  { label: "Измервателни", slug: "izmervatelni" },
  { label: "Калибри", slug: "kalibri" },
];

export function getCategoryBySlug(slug) {
  return categories.find((category) => category.slug === slug);
}

export function getCategoryByName(name) {
  return categories.find((category) => category.label === name);
}
