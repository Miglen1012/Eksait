import { useLanguage } from "../utils/language";
import "../styles/cart.css";

export default function CheckoutResult({ type }) {
  const { t } = useLanguage();
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order_id");
  const isSuccess = type === "success";

  return (
    <main className="cart-page cart-page--result">
      <section className="cart-shell">
        <div className="cart-result">
          <span className="cart-kicker">{isSuccess ? t("cart.orderAccepted") : t("cart.paymentCancelled")}</span>
          <h1>{isSuccess ? t("cart.successTitle") : t("cart.orderNotCompleted")}</h1>
          <p>
            {isSuccess
              ? t("cart.successBody")
              : t("cart.tryAgainBody")}
          </p>

          {orderId && <p className="cart-order-id">{t("cart.orderId", { orderId })}</p>}

          <a href={isSuccess ? "/" : "/cart"} className="cart-empty-link">
            {isSuccess ? t("cart.home") : t("cart.backToCart")}
          </a>
        </div>
      </section>
    </main>
  );
}
