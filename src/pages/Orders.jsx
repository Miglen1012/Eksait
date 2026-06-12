import { useEffect, useMemo, useState } from "react";
import { API_URL, apiRequest, getAuthToken, normalizeErrors } from "../api/client";
import { useLanguage } from "../utils/language";
import "../styles/cart.css";

function getRawOrders(data) {
  return (
    data?.orders ||
    data?.data?.orders ||
    data?.data ||
    data ||
    []
  );
}

function normalizeOrders(data) {
  const rawOrders = getRawOrders(data);
  const orders = Array.isArray(rawOrders) ? rawOrders : Object.values(rawOrders || {});

  return orders.map((order) => {
    const items = order.items || order.order_items || order.products || [];
    const total = order.total || order.total_amount || order.grand_total || order.amount || 0;

    return {
      id: order.id || order.order_id || order.number || order.order_number,
      number: order.order_number || order.number || order.id || order.order_id,
      status: order.status || order.order_status || "pending",
      statusLabel: order.status_label || order.statusLabel || "",
      total,
      createdAt: order.created_at || order.createdAt || order.date || null,
      paymentMethod: order.payment_method || order.paymentMethod || "",
      shippingMethod: order.shipping_method || order.shippingMethod || "",
      shippingCity: order.shipping_city || order.shippingCity || order.city || "",
      shippingPostcode: order.shipping_postcode || order.shippingPostcode || order.postcode || "",
      shippingAddress: order.shipping_address || order.shippingAddress || order.address || "",
      officeCode: order.econt_office_code || order.office_code || order.officeCode || "",
      officeName: order.econt_office_name || order.office_name || order.officeName || "",
      officeAddress: order.econt_office_address || order.office_address || order.officeAddress || "",
      items: Array.isArray(items) ? items : Object.values(items || {}),
    };
  });
}

const localeByLanguage = {
  bg: "bg-BG",
  en: "en-US",
  de: "de-DE",
};

function formatPrice(value, language) {
  return new Intl.NumberFormat(localeByLanguage[language] || localeByLanguage.bg, {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatDate(value, language) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(localeByLanguage[language] || localeByLanguage.bg, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(value, language) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(localeByLanguage[language] || localeByLanguage.bg, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function normalizeImageUrl(value) {
  if (!value) {
    return "";
  }

  const image = String(value);

  if (/^https?:\/\//i.test(image) || image.startsWith("data:")) {
    return image;
  }

  if (image.startsWith("/")) {
    return `${API_URL}${image}`;
  }

  return `${API_URL}/storage/${image.replace(/^storage\//, "")}`;
}

function getOrderItemImage(item) {
  const product = item.product || {};
  const images = Array.isArray(product.images) ? product.images : [];
  const primaryImage = images.find((image) => image.is_primary) || images[0];

  return normalizeImageUrl(
    item.product_image_url ||
    item.product_image ||
    item.image ||
    item.image_url ||
    item.image_path ||
    item.thumbnail ||
    product.image ||
    product.image_url ||
    product.image_path ||
    product.thumbnail ||
    primaryImage?.url ||
    primaryImage?.image_path ||
    "",
  );
}

function getDeliveryDetails(order, t) {
  const city = order.shippingCity;
  const method = getShippingLabel(order.shippingMethod, t);

  if (order.shippingMethod === "office") {
    const office = order.officeName || order.officeAddress || (order.officeCode ? `${t("cart.office")} ${order.officeCode}` : "");

    return [method, office, city].filter(Boolean).join(", ");
  }

  const addressParts = [
    order.shippingAddress,
    order.shippingPostcode,
    city,
  ].filter(Boolean);

  return addressParts.length > 0 ? `${method}: ${addressParts.join(", ")}` : method;
}

function getStatusLabel(status, t) {
  const labels = {
    pending: t("status.pending"),
    processing: t("status.processing"),
    completed: t("status.completed"),
    cancelled: t("status.cancelled"),
    canceled: t("status.cancelled"),
    paid: t("status.paid"),
    shipped: t("status.shipped"),
  };

  return labels[String(status).toLowerCase()] || status;
}

function getPaymentLabel(method, t) {
  const labels = {
    stripe: t("cart.cardPayment"),
    cod: t("cart.cod"),
    bank_transfer: t("cart.bankTransfer"),
  };

  return labels[method] || method || t("common.notSpecified");
}

function getShippingLabel(method, t) {
  const labels = {
    address: t("cart.deliveryAddress"),
    office: t("cart.deliveryOffice"),
  };

  return labels[method] || method || t("common.notSpecified");
}

export default function Orders() {
  const { language, t } = useLanguage();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(Boolean(getAuthToken()));
  const [messages, setMessages] = useState([]);
  const isLoggedIn = useMemo(() => Boolean(getAuthToken()), []);

  useEffect(() => {
    let isCancelled = false;

    async function loadOrders() {
      if (!isLoggedIn) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setMessages([]);

      try {
        const data = await apiRequest("/api/orders");

        if (!isCancelled) {
          setOrders(normalizeOrders(data));
        }
      } catch (error) {
        if (!isCancelled) {
          setMessages(normalizeErrors(error));
        }
      } finally {
        if (!isCancelled) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      isCancelled = true;
    };
  }, [isLoggedIn]);

  if (!isLoggedIn) {
    return (
      <main className="cart-page">
        <section className="cart-shell">
          <div className="cart-result">
            <span className="cart-kicker">{t("orders.profile")}</span>
            <h1>{t("orders.loginTitle")}</h1>
            <p>{t("orders.loginBody")}</p>
            <a href="/login" className="cart-empty-link">{t("orders.goLogin")}</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <section className="cart-shell">
        <header className="cart-header">
          <span className="cart-kicker">{t("orders.profile")}</span>
          <h1>{t("orders.title")}</h1>
          <p>{t("orders.subtitle")}</p>
        </header>

        {messages.length > 0 && (
          <div className="cart-alert orders-alert">
            {messages.map((message) => <p key={message}>{message}</p>)}
          </div>
        )}

        {loading ? (
          <div className="cart-empty">
            <h2>{t("common.loading")}</h2>
          </div>
        ) : orders.length === 0 ? (
          <div className="cart-empty">
            <h2>{t("orders.emptyTitle")}</h2>
            <p>{t("orders.emptyBody")}</p>
            <a href="/cart" className="cart-empty-link">{t("orders.goCart")}</a>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-card-header">
                  <div>
                    <span>{t("orders.order")}</span>
                    <h2>#{order.number}</h2>
                  </div>
                  <div className="order-card-side">
                    {formatDate(order.createdAt, language) && (
                      <p className="order-card-date">
                        <span>{t("orders.dateTime")}</span>
                        {formatDate(order.createdAt, language)}{formatTime(order.createdAt, language) ? `, ${formatTime(order.createdAt, language)}` : ""}
                      </p>
                    )}
                    <strong>{order.statusLabel || getStatusLabel(order.status, t)}</strong>
                  </div>
                </div>

                <div className="order-card-meta">
                  <p><span>{t("orders.payment")}</span>{getPaymentLabel(order.paymentMethod, t)}</p>
                  <p className="order-delivery-detail"><span>{t("cart.delivery")}</span>{getDeliveryDetails(order, t)}</p>
                  <p><span>{t("cart.total")}</span>{formatPrice(order.total, language)}</p>
                </div>

                {order.items.length > 0 && (
                  <div className="order-items">
                    {order.items.map((item, index) => {
                      const product = item.product || item;
                      const name = item.product_name || product.name || item.name || `${t("common.product")} #${item.product_id || product.id || index + 1}`;
                      const quantity = item.quantity || item.qty || 1;
                      const image = getOrderItemImage(item);

                      return (
                        <article className="order-item-row" key={`${order.id}-${item.id || item.product_id || index}`}>
                          <div className="order-item-thumb">
                            {image ? <img src={image} alt="" loading="lazy" decoding="async" /> : <span>{name.charAt(0)}</span>}
                          </div>
                          <span>{name}</span>
                          <strong>x{quantity}</strong>
                        </article>
                      );
                    })}
                  </div>
                )}
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}
