import { useEffect, useMemo, useRef, useState } from "react";
import HeroSlider from "../components/home/HeroSlider";
import { normalizeErrors } from "../api/client";
import { fetchProducts, getCachedProducts } from "../api/products";
import logo from "../assets/logo-widget.png";
import promoImageMerged from "../assets/pics/Untitled-3.jpg";
import { normalizeSearchText } from "../utils/search";
import "../styles/home.css";

const HOME_CATEGORY_SECTIONS = [
  { slug: "frezi", title: "Фрези", limit: 8, categoryNames: ["Фрези"] },
  { slug: "plastini", title: "Пластини", limit: 8, categoryNames: ["Пластини"] },
  { slug: "metchici", title: "Метчици", limit: 8, categoryNames: ["Метчици"] },
];

function getProductPath(product) {
  return `/products/${product.slug || product.id}`;
}

function productBelongsToSection(product, section) {
  const sectionTokens = [section.slug, section.title, ...(section.categoryNames || [])]
    .map((token) => normalizeSearchText(token))
    .filter(Boolean);

  return (product.categories || []).some((category) => {
    const categoryTokens = [
      category?.name,
      category?.slug,
      category?.label,
      category?.title,
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
  const scrollerRef = useRef(null);

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
    <section className="home-category-section" aria-label={section.title}>
      <div className="home-category-header">
        <h2>{section.title}</h2>
      </div>

      {products.length === 0 ? (
        <p className="home-empty-category">Няма налични продукти в тази категория.</p>
      ) : (
        <div className="home-carousel-wrap">
          {products.length > 1 ? (
            <>
              <div className="home-carousel-zone home-carousel-zone-left">
                <button type="button" onClick={() => scrollProducts(-1)} aria-label={`Предишни ${section.title}`} />
              </div>
              <div className="home-carousel-zone home-carousel-zone-right">
                <button type="button" onClick={() => scrollProducts(1)} aria-label={`Следващи ${section.title}`} />
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
                      <span>Няма снимка</span>
                    )}
                    <span className="home-product-more">Още</span>
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
  const [products, setProducts] = useState(() => getCachedProducts() || []);
  const [loading, setLoading] = useState(() => !getCachedProducts());
  const [messages, setMessages] = useState([]);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts() {
      if (!getCachedProducts()) {
        setLoading(true);
      }
      setMessages([]);

      try {
        const nextProducts = await fetchProducts();

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
  }, []);

  const productsBySection = useMemo(
    () =>
      HOME_CATEGORY_SECTIONS.map((section) => {
        const filtered = products
          .filter((product) => productBelongsToSection(product, section))
          .slice(0, section.limit);

        return { section, products: filtered };
      }),
    [products],
  );

  return (
    <main className="home-page">
      <HeroSlider />

      <div className="layout-container home-content-panel">
        <section className="home-promo-images" aria-label="Акценти">
          <img src={promoImageMerged} alt="Промо изображения" loading="lazy" decoding="async" />
        </section>

        <section className="home-brand-block" aria-label="За Ексайт Къмпани">
          <div className="home-brand-logo-wrap">
            <img src={logo} alt="Excite Company" decoding="async" />
          </div>

          <div className="home-brand-video-wrap">
            <video controls preload="metadata">
              <source src="/media/company.mp4" type="video/mp4" />
            </video>
          </div>
        </section>

        {messages.length > 0 ? (
          <div className="home-alert">
            {messages.map((message) => (
              <p key={message}>{message}</p>
            ))}
          </div>
        ) : null}

        {loading ? <p className="home-loading">Зареждане на продукти...</p> : null}

        {!loading && messages.length === 0 ? (
          <div className="home-categories">
            {productsBySection.map(({ section, products: sectionProducts }) => (
              <HomeCategorySection section={section} products={sectionProducts} key={section.slug} />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

