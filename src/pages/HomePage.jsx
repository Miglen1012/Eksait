import { useEffect, useMemo, useRef, useState } from "react";
import HeroSlider from "../components/home/HeroSlider";
import { normalizeErrors } from "../api/client";
import { fetchProducts, getCachedProducts } from "../api/products";
import logo from "../assets/logo-widget.png";
import { getCategoryBySlug, getCategoryTokens } from "../data/categories";
import { useLanguage } from "../utils/language";
import { normalizeSearchText } from "../utils/search";
import "../styles/home.css";

const HOME_CATEGORY_SECTIONS = [
  { slug: "frezi", titleKey: "category.frezi", limit: 8 },
  { slug: "plastini", titleKey: "category.plastini", limit: 8 },
  { slug: "metchici", titleKey: "category.metchici", limit: 8 },
];

function getProductPath(product) {
  return `/products/${product.slug || product.id}`;
}

function productBelongsToSection(product, section, sectionTitle) {
  const category = getCategoryBySlug(section.slug);
  const sectionTokens = [
    section.slug,
    sectionTitle,
    ...(category ? getCategoryTokens(category) : []),
  ]
    .map((token) => normalizeSearchText(token))
    .filter(Boolean);

  return (product.categories || []).some((category) => {
    const categoryTokens = [
      category?.name,
      category?.slug,
      category?.label,
      category?.title,
      category?.category_name,
      category?.categoryName,
      category?.category_slug,
      category?.categorySlug,
    ]
      .map((token) => normalizeSearchText(token))
      .filter(Boolean);

    return categoryTokens.some((categoryToken) => (
      sectionTokens.some((sectionToken) => (
        categoryToken === sectionToken ||
        categoryToken.includes(sectionToken) ||
        sectionToken.includes(categoryToken)
      ))
    ));
  });
}

function HomeCategorySection({ section, products }) {
  const { t } = useLanguage();
  const scrollerRef = useRef(null);
  const sectionTitle = t(section.titleKey);

  function scrollProducts(direction) {
    const scroller = scrollerRef.current;

    if (!scroller) {
      return;
    }

    const card = scroller.querySelector(".home-product-card");
    const distance = card ? card.getBoundingClientRect().width + 16 : 420;

    scroller.scrollBy({
      left: direction * distance,
      behavior: "smooth",
    });
  }

  return (
    <section className="home-category-section" aria-label={sectionTitle}>
      <div className="home-category-header">
        <h2>{sectionTitle}</h2>
      </div>

      {products.length === 0 ? (
        <p className="home-empty-category">{t("home.emptyCategory")}</p>
      ) : (
        <div className="home-carousel-wrap">
          {products.length > 1 ? (
            <>
              <div className="home-carousel-zone home-carousel-zone-left">
                <button type="button" onClick={() => scrollProducts(-1)} aria-label={t("home.prevCategory", { category: sectionTitle })} />
              </div>
              <div className="home-carousel-zone home-carousel-zone-right">
                <button type="button" onClick={() => scrollProducts(1)} aria-label={t("home.nextCategory", { category: sectionTitle })} />
              </div>
            </>
          ) : null}

          <div className="home-products-carousel" ref={scrollerRef}>
            {products.map((product) => {
              const productPath = getProductPath(product);

              return (
                <article className="home-product-card" key={product.id}>
                  <a href={productPath} className="home-product-image" aria-label={product.name}>
                    {product.image ? (
                      <img src={product.image} alt={product.name} loading="lazy" decoding="async" />
                    ) : (
                      <span>{t("common.noImage")}</span>
                    )}
                    <span className="home-product-more">{t("home.more")}</span>
                  </a>

                  <div className="home-product-body">
                    <h3>
                      <a href={productPath}>{product.name}</a>
                    </h3>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}

export default function HomePage() {
  const { language, t } = useLanguage();
  const [products, setProducts] = useState(() => getCachedProducts(language) || []);
  const [loading, setLoading] = useState(() => !getCachedProducts(language));
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      if (!getCachedProducts(language)) {
        setLoading(true);
      }
      setMessages([]);

      try {
        const nextProducts = await fetchProducts({ language });

        if (isMounted) {
          setProducts(nextProducts);
        }
      } catch (error) {
        if (isMounted) {
          setMessages(normalizeErrors(error));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadProducts();

    return () => {
      isMounted = false;
    };
  }, [language]);

  const productsBySection = useMemo(
    () =>
      HOME_CATEGORY_SECTIONS.map((section) => {
        const sectionTitle = t(section.titleKey);
        const filtered = products
          .filter((product) => productBelongsToSection(product, section, sectionTitle))
          .slice(0, section.limit);

        return { section, products: filtered };
      }),
    [products, t],
  );

  return (
    <main className="home-page">
      <HeroSlider />

      <div className="layout-container home-content-panel">
        {messages.length > 0 ? (
          <div className="home-alert">
            {messages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}

        {loading ? <p className="home-loading">{t("home.loadingProducts")}</p> : null}

        {!loading && messages.length === 0 ? (
          <div className="home-categories">
            {productsBySection.map(({ section, products: sectionProducts }) => (
              <HomeCategorySection section={section} products={sectionProducts} key={section.slug} />
            ))}
          </div>
        ) : null}

        <section className="home-brand-block" aria-label={t("home.videoAria")}>
          <div className="home-brand-logo-wrap">
            <img src={logo} alt="Excite Company" decoding="async" />
          </div>

          <div className="home-brand-video-wrap">
            <video controls preload="metadata">
              <source src="/media/company.mp4" type="video/mp4" />
            </video>
          </div>
        </section>
      </div>
    </main>
  );
}

