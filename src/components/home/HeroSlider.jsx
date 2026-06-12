import { useEffect, useMemo, useState } from "react";
import { fetchHomeBanners, getCachedHomeBanners } from "../../api/homeBanner";
import sliderImageOne from "../../assets/hero/slider.jpg";
import sliderImageTwo from "../../assets/hero/slider1.jpg";
import sliderImageThree from "../../assets/hero/slider-4.jpg";
import sliderImageFour from "../../assets/hero/метчик-1.jpg";
import sliderImageFive from "../../assets/hero/струг.jpg";
import { useLanguage } from "../../utils/language";

const AUTOPLAY_MS = 4000;
const fallbackHeroCopy = {
  bg: {
    aria: "Акценти",
    eyebrow: "EXCITE COMPANY",
    title: "Технически консумативи",
    subtitle: "Практични предложения за металообработка и монтаж.",
    button_text: "Разгледай продукти",
    error: "Временен проблем със зареждането на банерите.",
  },
  en: {
    aria: "Highlights",
    eyebrow: "EXCITE COMPANY",
    title: "Technical consumables",
    subtitle: "Practical solutions for metalworking and assembly.",
    button_text: "Browse products",
    error: "There is a temporary problem loading the banners.",
  },
  de: {
    aria: "Akzente",
    eyebrow: "EXCITE COMPANY",
    title: "Technische Verbrauchsmaterialien",
    subtitle: "Praktische Lösungen für Metallbearbeitung und Montage.",
    button_text: "Produkte ansehen",
    error: "Beim Laden der Banner ist vorübergehend ein Problem aufgetreten.",
  },
};
const fallbackHeroImages = [
  sliderImageOne,
  sliderImageTwo,
  sliderImageThree,
  sliderImageFour,
  sliderImageFive,
];

function getRenderedImageUrl(slide, brokenImages) {
  if (!slide) {
    return sliderImageOne;
  }

  if (brokenImages[slide.id]) {
    return sliderImageOne;
  }

  return slide.image_url || sliderImageOne;
}

function hasCyrillicText(value) {
  return /[\u0400-\u04ff]/.test(String(value || ""));
}

function getDisplaySlide(slide, heroCopy, language) {
  if (!slide) {
    return slide;
  }

  const slideText = [slide.title, slide.subtitle, slide.button_text].join(" ");
  const shouldUseFallbackText = language !== "bg" && hasCyrillicText(slideText);

  if (!shouldUseFallbackText) {
    return slide;
  }

  return {
    ...slide,
    eyebrow: heroCopy.eyebrow,
    title: heroCopy.title,
    subtitle: heroCopy.subtitle,
    button_text: heroCopy.button_text,
    button_url: slide.button_url || "/products",
  };
}

export default function HeroSlider() {
  const { language } = useLanguage();
  const heroCopy = fallbackHeroCopy[language] || fallbackHeroCopy.bg;
  const defaultSlides = useMemo(() => fallbackHeroImages.map((image_url, index) => ({
    eyebrow: heroCopy.eyebrow,
    title: heroCopy.title,
    subtitle: heroCopy.subtitle,
    button_text: heroCopy.button_text,
    button_url: "/products",
    id: `fallback-hero-${language}-${index}`,
    image_url,
    sort_order: index,
  })), [heroCopy, language]);
  const [items, setItems] = useState(() => getCachedHomeBanners(language) || defaultSlides);
  const [error, setError] = useState(null);
  const [activeSlide, setActiveSlide] = useState(0);
  const [brokenImages, setBrokenImages] = useState({});

  useEffect(() => {
    let isMounted = true;

    window.queueMicrotask(() => {
      if (isMounted) {
        setItems(getCachedHomeBanners(language) || defaultSlides);
        setActiveSlide(0);
        setBrokenImages({});
      }
    });

    async function loadHomeBanner() {
      setError(null);

      try {
        const normalized = await fetchHomeBanners({ language });

        if (isMounted) {
          setItems(normalized.length > 0 ? normalized : defaultSlides);
          setActiveSlide(0);
        }
      } catch (loadError) {
        if (isMounted) {
          setItems(defaultSlides);
          setError(loadError);
          setActiveSlide(0);
        }
      }
    }

    loadHomeBanner();

    return () => {
      isMounted = false;
    };
  }, [defaultSlides, language]);

  const slides = useMemo(() => (items.length > 0 ? items : defaultSlides), [defaultSlides, items]);
  const visibleSlideIndex = activeSlide % slides.length;
  const currentSlide = slides[visibleSlideIndex] || slides[0];
  const displaySlide = getDisplaySlide(currentSlide, heroCopy, language);

  useEffect(() => {
    const nextSlide = slides[(visibleSlideIndex + 1) % slides.length];
    const imageUrls = [
      getRenderedImageUrl(displaySlide, brokenImages),
      getRenderedImageUrl(nextSlide, brokenImages),
    ].filter(Boolean);

    imageUrls.forEach((imageUrl) => {
      const preload = new Image();
      preload.decoding = "async";
      preload.src = imageUrl;
    });
  }, [brokenImages, displaySlide, slides, visibleSlideIndex]);

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
    <section className="hero-slider" aria-label={heroCopy.aria}>
      <div className="hero-media">
        <img
          className="hero-image is-active"
          src={getRenderedImageUrl(displaySlide, brokenImages)}
          loading="eager"
          fetchPriority="high"
          decoding="async"
          alt=""
          onError={() => setBrokenImages((current) => (
            current[displaySlide.id] ? current : { ...current, [displaySlide.id]: true }
          ))}
          key={displaySlide.id}
        />
      </div>

      <div className="hero-slide-content">
        {displaySlide.eyebrow && <span>{displaySlide.eyebrow}</span>}
        <h1>{displaySlide.title}</h1>
        {displaySlide.subtitle && <p>{displaySlide.subtitle}</p>}
        {displaySlide.button_url && displaySlide.button_text ? (
          <a href={displaySlide.button_url} className="hero-slide-button">{displaySlide.button_text}</a>
        ) : null}
        {error ? <p>{heroCopy.error}</p> : null}
      </div>

      <div className="hero-dots" aria-hidden="true">
        {slides.map((slide, index) => (
          <span className={index === visibleSlideIndex ? "is-active" : ""} key={slide.id} />
        ))}
      </div>
    </section>
  );
}
