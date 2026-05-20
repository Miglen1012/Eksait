import { useEffect, useMemo, useState } from "react";
import { API_URL, apiRequest } from "../../api/client";
import sliderImageOne from "../../assets/hero/slider.jpg";
import sliderImageTwo from "../../assets/hero/slider1.jpg";
import sliderImageThree from "../../assets/hero/slider-4.jpg";
import sliderImageFour from "../../assets/hero/метчик-1.jpg";
import sliderImageFive from "../../assets/hero/струг.jpg";

const AUTOPLAY_MS = 4000;
const DEFAULT_SLIDE_CONTENT = {
  eyebrow: "EXCITE COMPANY",
  title: "Технически консумативи",
  subtitle: "Практични предложения за металообработка и монтаж.",
  button_text: "Разгледай продукти",
  button_url: "/products",
};
const DEFAULT_SLIDES = [
  sliderImageOne,
  sliderImageTwo,
  sliderImageThree,
  sliderImageFour,
  sliderImageFive,
].map((image_url, index) => ({
  ...DEFAULT_SLIDE_CONTENT,
  id: `fallback-hero-${index}`,
  image_url,
  sort_order: index,
}));

function normalizeBannerItems(data) {
  const items = Array.isArray(data?.items) ? data.items : [];

  return items.map((item, index) => ({
    id: item?.id ?? `banner-${index}`,
    eyebrow: item?.eyebrow || "",
    title: item?.title || "",
    subtitle: item?.subtitle || "",
    button_text: item?.button_text || "",
    button_url: item?.button_url || "",
    image_url: resolveBannerImageUrl(item?.image_url || item?.image || ""),
    sort_order: item?.sort_order ?? index,
  }));
}

function resolveBannerImageUrl(value) {
  const rawUrl = String(value || "").trim();

  if (!rawUrl) {
    return sliderImageOne;
  }

  if (/^https?:\/\//i.test(rawUrl) || rawUrl.startsWith("data:") || rawUrl.startsWith("blob:")) {
    return rawUrl;
  }

  if (rawUrl.startsWith("//")) {
    return `${window.location.protocol}${rawUrl}`;
  }

  const normalizedPath = rawUrl.startsWith("/") ? rawUrl : `/${rawUrl}`;
  return `${API_URL}${normalizedPath}`;
}

function getRenderedImageUrl(slide, brokenImages) {
  if (!slide) {
    return sliderImageOne;
  }

  if (brokenImages[slide.id]) {
    return sliderImageOne;
  }

  return slide.image_url || sliderImageOne;
}

export default function HeroSlider() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    let isMounted = true;

    async function loadHomeBanner() {
      setLoading(true);
      setError(null);

      try {
        const data = await apiRequest("/api/home-banner");
        const normalized = normalizeBannerItems(data);

        if (isMounted) {
          setItems(normalized);
          setActiveSlide(0);
        }
      } catch (loadError) {
        if (isMounted) {
          setItems([]);
          setError(loadError);
          setActiveSlide(0);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    loadHomeBanner();

    return () => {
      isMounted = false;
    };
  }, []);

  const slides = useMemo(() => (items.length > 1 ? items : DEFAULT_SLIDES), [items]);
  const visibleSlideIndex = activeSlide % slides.length;
  const currentSlide = slides[visibleSlideIndex] || slides[0];

  useEffect(() => {
    const firstSlideImage = getRenderedImageUrl(slides[0], brokenImages);

    if (!firstSlideImage) {
      return;
    }

    const preload = new Image();
    preload.src = firstSlideImage;
  }, [brokenImages, slides]);

  useEffect(() => {
    if (slides.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [slides.length]);

  if (loading) {
    return (
      <section className="hero-slider" aria-label="Акценти">
        <div className="hero-media">
          <img className="hero-image is-active" src={sliderImageOne} alt="" />
        </div>
      </section>
    );
  }

  return (
    <section className="hero-slider" aria-label="Акценти">
      <div className="hero-media">
        {slides.map((slide, index) => (
          <img
            className={`hero-image ${index === visibleSlideIndex ? "is-active" : ""}`}
            src={getRenderedImageUrl(slide, brokenImages)}
            loading={index === 0 ? "eager" : "lazy"}
            alt=""
            onError={() => setBrokenImages((current) => ({ ...current, [slide.id]: true }))}
            key={slide.id}
          />
        ))}
      </div>

      <div className="hero-slide-content">
        {currentSlide.eyebrow && <span>{currentSlide.eyebrow}</span>}
        <h1>{currentSlide.title}</h1>
        {currentSlide.subtitle && <p>{currentSlide.subtitle}</p>}
        {currentSlide.button_url && currentSlide.button_text ? (
          <a href={currentSlide.button_url} className="hero-slide-button">{currentSlide.button_text}</a>
        ) : null}
        {error ? <p>Временен проблем със зареждането на банерите.</p> : null}
      </div>

      <div className="hero-dots" aria-hidden="true">
        {slides.map((slide, index) => (
          <span className={index === visibleSlideIndex ? "is-active" : ""} key={slide.id} />
        ))}
      </div>
    </section>
  );
}
