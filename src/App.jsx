import { useEffect, useRef, useState } from "react";
import "./App.css";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import ScrollToTopButton from "./components/layout/ScrollToTopButton";
import CartDrawer from "./components/layout/CartDrawer";
import AboutUs from "./pages/AboutUs";
import Terms from "./pages/Terms";
import HomePage from "./pages/HomePage";
import Contact from "./pages/Contact";
import Cart from "./pages/Cart";
import CheckoutResult from "./pages/CheckoutResult";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Orders from "./pages/Orders";
import CategoryPage from "./pages/CategoryPage";
import ProductShow from "./pages/ProductShow";
import SearchResults from "./pages/SearchResults";

function getCurrentPage(path) {
  if (path === "/about") {
    return <AboutUs />;
  }

  if (path === "/terms" || path === "/terms-and-conditions") {
    return <Terms />;
  }

  if (path === "/contact") {
    return <Contact />;
  }

  if (path === "/cart" || path === "/checkout") {
    return <Cart />;
  }

  if (path === "/login") {
    return <Login />;
  }

  if (path === "/register") {
    return <Register />;
  }

  if (path === "/orders") {
    return <Orders />;
  }

  if (path === "/search") {
    return <SearchResults />;
  }

  if (path === "/category" || path === "/categories" || path === "/products") {
    return <CategoryPage slug="" />;
  }

  if (path.startsWith("/category/")) {
    return <CategoryPage slug={path.replace("/category/", "")} />;
  }

  if (path.startsWith("/products/")) {
    return <ProductShow productKey={path.replace("/products/", "")} />;
  }

  if (path === "/checkout/success") {
    return <CheckoutResult type="success" />;
  }

  if (path === "/checkout/cancel") {
    return <CheckoutResult type="cancel" />;
  }

  return <HomePage />;
}

export default function App() {
  const [path, setPath] = useState(window.location.pathname);
  const scrollFrameRef = useRef(0);

  function persistCurrentEntryScroll() {
    const currentState = window.history.state || {};
    window.history.replaceState(
      {
        ...currentState,
        __appScrollState: true,
        scrollY: window.scrollY,
      },
      "",
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  }

  function restoreScrollPosition(targetY) {
    const safeY = Number.isFinite(targetY) ? Math.max(0, targetY) : 0;
    window.scrollTo(0, safeY);
    window.requestAnimationFrame(() => window.scrollTo(0, safeY));
    window.setTimeout(() => window.scrollTo(0, safeY), 120);
    window.setTimeout(() => window.scrollTo(0, safeY), 320);
  }

  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }

    const initialState = window.history.state || {};
    if (!initialState.__appScrollState) {
      window.history.replaceState(
        {
          ...initialState,
          __appScrollState: true,
          scrollY: window.scrollY,
        },
        "",
        `${window.location.pathname}${window.location.search}${window.location.hash}`,
      );
    }

    function handleNavigation() {
      setPath(window.location.pathname);
    }

    function handleScroll() {
      if (scrollFrameRef.current) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }

      scrollFrameRef.current = window.requestAnimationFrame(() => {
        persistCurrentEntryScroll();
        scrollFrameRef.current = 0;
      });
    }

    function handleInternalLinkClick(event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      const link = event.target.closest("a[href]");

      if (!link || link.target || link.hasAttribute("download")) {
        return;
      }

      const url = new URL(link.href, window.location.origin);

      if (url.origin !== window.location.origin || !url.pathname.startsWith("/")) {
        return;
      }

      event.preventDefault();
      persistCurrentEntryScroll();
      window.history.pushState({ __appScrollState: true, scrollY: 0 }, "", `${url.pathname}${url.search}${url.hash}`);
      handleNavigation();
      restoreScrollPosition(0);
      window.dispatchEvent(new Event("app:navigate"));
    }

    function handlePopState(event) {
      setPath(window.location.pathname);
      restoreScrollPosition(event.state?.scrollY ?? 0);
    }

    function handleAppNavigate() {
      const currentState = window.history.state || {};

      if (!currentState.__appScrollState) {
        window.history.replaceState(
          {
            ...currentState,
            __appScrollState: true,
            scrollY: 0,
          },
          "",
          `${window.location.pathname}${window.location.search}${window.location.hash}`,
        );
      }

      setPath(window.location.pathname);
      restoreScrollPosition(0);
    }

    document.addEventListener("click", handleInternalLinkClick);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("app:navigate", handleAppNavigate);

    return () => {
      if (scrollFrameRef.current) {
        window.cancelAnimationFrame(scrollFrameRef.current);
      }

      document.removeEventListener("click", handleInternalLinkClick);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("app:navigate", handleAppNavigate);
    };
  }, []);

  return (
    <div className="site-shell">
      <Header />
      {getCurrentPage(path)}
      <Footer />
      <ScrollToTopButton />
      <CartDrawer />
    </div>
  );
}
