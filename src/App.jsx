import { lazy, Suspense, useEffect, useRef, useState } from "react";
import "./App.css";
import Header from "./components/layout/Header";
import Footer from "./components/layout/Footer";
import ScrollToTopButton from "./components/layout/ScrollToTopButton";
import CartDrawer from "./components/layout/CartDrawer";
import { isAuthRoute, storeAuthReturnPath } from "./utils/authRedirect";

const AboutUs = lazy(() => import("./pages/AboutUs"));
const Terms = lazy(() => import("./pages/Terms"));
const HomePage = lazy(() => import("./pages/HomePage"));
const Contact = lazy(() => import("./pages/Contact"));
const Cart = lazy(() => import("./pages/Cart"));
const CheckoutResult = lazy(() => import("./pages/CheckoutResult"));
const Login = lazy(() => import("./pages/Login"));
const Register = lazy(() => import("./pages/Register"));
const ForgotPassword = lazy(() => import("./pages/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const Orders = lazy(() => import("./pages/Orders"));
const CategoryPage = lazy(() => import("./pages/CategoryPage"));
const ProductShow = lazy(() => import("./pages/ProductShow"));
const SearchResults = lazy(() => import("./pages/SearchResults"));
const Equipment = lazy(() => import("./pages/Equipment"));

function getCurrentPage(path) {
  if (path === "/about") {
    return <AboutUs />;
  }

  if (path === "/equipment") {
    return <Equipment />;
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

  if (path === "/forgot-password") {
    return <ForgotPassword />;
  }

  if (path === "/reset-password" || path.startsWith("/reset-password/")) {
    return <ResetPassword />;
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
  const pathRef = useRef(window.location.pathname);
  const latestScrollYRef = useRef(window.scrollY);

  function persistCurrentEntryScroll() {
    const currentState = window.history.state || {};
    window.history.replaceState(
      {
        ...currentState,
        __appScrollState: true,
        scrollY: latestScrollYRef.current,
      },
      "",
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
  }

  function restoreScrollPosition(targetY) {
    const safeY = Number.isFinite(targetY) ? Math.max(0, targetY) : 0;
    window.scrollTo(0, safeY);
    window.requestAnimationFrame(() => window.scrollTo(0, safeY));
    latestScrollYRef.current = safeY;
  }

  function updatePath(nextPath) {
    pathRef.current = nextPath;
    setPath(nextPath);
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

    function handleScroll() {
      latestScrollYRef.current = window.scrollY;
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

      if (isAuthRoute(url.pathname)) {
        storeAuthReturnPath(`${window.location.pathname}${window.location.search}${window.location.hash}`);
      }

      event.preventDefault();
      persistCurrentEntryScroll();
      window.history.pushState({ __appScrollState: true, scrollY: 0 }, "", `${url.pathname}${url.search}${url.hash}`);
      updatePath(url.pathname);
      restoreScrollPosition(0);
      window.dispatchEvent(new Event("app:navigate"));
    }

    function handlePopState(event) {
      updatePath(window.location.pathname);
      restoreScrollPosition(event.state?.scrollY ?? 0);
    }

    function handleAppNavigate() {
      const currentState = window.history.state || {};
      const nextPath = window.location.pathname;
      const pathChanged = pathRef.current !== nextPath;

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

      if (pathChanged) {
        updatePath(nextPath);
        restoreScrollPosition(0);
      }
    }

    document.addEventListener("click", handleInternalLinkClick);
    window.addEventListener("scroll", handleScroll, { passive: true });
    window.addEventListener("popstate", handlePopState);
    window.addEventListener("app:navigate", handleAppNavigate);
    window.addEventListener("pagehide", persistCurrentEntryScroll);

    return () => {
      document.removeEventListener("click", handleInternalLinkClick);
      window.removeEventListener("scroll", handleScroll);
      window.removeEventListener("popstate", handlePopState);
      window.removeEventListener("app:navigate", handleAppNavigate);
      window.removeEventListener("pagehide", persistCurrentEntryScroll);
    };
  }, []);

  return (
    <div className="site-shell">
      <Header />
      <Suspense fallback={<main className="page-loading" aria-busy="true" />}>
        {getCurrentPage(path)}
      </Suspense>
      <Footer />
      <ScrollToTopButton />
      <CartDrawer />
    </div>
  );
}
