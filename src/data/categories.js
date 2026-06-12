import { normalizeSearchText } from "../utils/search";

export const categories = [
  { label: "Свредла", slug: "sverdla", aliases: ["svredla", "drills", "bohrer"] },
  { label: "Фрези", slug: "frezi", aliases: ["milling cutters", "mills", "fraser", "fraeser", "fräser"] },
  { label: "Метчици", slug: "metchici", aliases: ["metcici", "metchitsi", "taps", "gewindebohrer"] },
  { label: "Плашки", slug: "plashki", aliases: ["plaski", "dies", "schneideisen"] },
  { label: "Ножове", slug: "nojove", aliases: ["nozove", "cutters", "knives", "messer"] },
  { label: "Кобалт", slug: "kobalt", aliases: ["cobalt"] },
  { label: "Държачи", slug: "darjachi", aliases: ["darzhachi", "dierzaci", "holders", "holder", "halter"] },
  { label: "Щанги", slug: "shtangi", aliases: ["shhangi", "bars", "stangen"] },
  { label: "Пластини", slug: "plastini", aliases: ["inserts", "plates", "wendeschneidplatten"] },
  { label: "Измервателни", slug: "izmervatelni", aliases: ["measuring tools", "messwerkzeuge"] },
  { label: "Калибри", slug: "kalibri", aliases: ["gauges", "lehren"] },
];

export function getCategoryTokens(category) {
  return [
    category?.label,
    category?.slug,
    ...(category?.aliases || []),
  ]
    .map((token) => normalizeSearchText(token))
    .filter(Boolean);
}

export function getCategoryBySlug(slug) {
  const normalizedSlug = normalizeSearchText(slug);

  return categories.find((category) => getCategoryTokens(category).includes(normalizedSlug));
}

export function getCategoryByName(name) {
  const normalizedName = normalizeSearchText(name);

  return categories.find((category) => getCategoryTokens(category).includes(normalizedName));
}
