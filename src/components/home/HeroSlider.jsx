import { useEffect, useMemo, useState } from "react";
import { fetchHomeBanners, getCachedHomeBanners } from "../../api/homeBanner";
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
  const [items, setItems] = useState(() => getCachedHomeBanners() || DEFAULT_SLIDES);
  const [error, setError] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    let isMounted = true;

    async function loadHomeBanner() {
      setError(null);

      try {
        const normalized = await fetchHomeBanners();

        if (isMounted) {
          setItems(normalized.length > 0 ? normalized : DEFAULT_SLIDES);
          setActiveSlide(0);
        }
      } catch (loadError) {
        if (isMounted) {
          setItems(DEFAULT_SLIDES);
          setError(loadError);
          setActiveSlide(0);
        }
      }
    }

    loadHomeBanner();

    return () => {
      isMounted = false;
    };
  }, []);

  const slides = useMemo(() => (items.length > 0 ? items : DEFAULT_SLIDES), [items]);
  const visibleSlideIndex = activeSlide % slides.length;
  const currentSlide = slides[visibleSlideIndex] || slides[0];

  useEffect(() => {
    const nextSlide = slides[(visibleSlideIndex + 1) % slides.length];
    const imageUrls = [
      getRenderedImageUrl(currentSlide, brokenImages),
      getRenderedImageUrl(nextSlide, brokenImages),
    ].filter(Boolean);

    imageUrls.forEach((imageUrl) => {
      const preload = new Image();
      preload.decoding = "async";
      preload.src = imageUrl;
    });
  }, [brokenImages, currentSlide, slides, visibleSlideIndex]);

  useEffect(() => {
    if (slides.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % slides.length);
    }, AUTOPLAY_MS);

    return () => window.clearInterval(timer);
  }, [slides.length]);
  return (
    <section className="hero-slider" aria-label="Акценти">
      <div className="hero-media">
        <img
          className="hero-image is-active"
          src={getRenderedImageUrl(currentSlide, brokenImages)}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          alt=""
          onError={() => setBrokenImages((current) => (
            current[currentSlide.id] ? current : { ...current, [currentSlide.id]: true }
          ))}
          key={currentSlide.id}
        />
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
