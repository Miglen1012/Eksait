import { useEffect, useMemo, useState } from "react";
import { API_URL, apiRequest, getAuthToken, normalizeErrors } from "../api/client";
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

function formatPrice(value) {
  return new Intl.NumberFormat("bg-BG", {
    style: "currency",
    currency: "EUR",
  }).format(Number(value || 0));
}

function formatDate(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("bg-BG", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatTime(value) {
  if (!value) {
    return "";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("bg-BG", {
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

function getDeliveryDetails(order) {
  const city = order.shippingCity;
  const method = getShippingLabel(order.shippingMethod);

  if (order.shippingMethod === "office") {
    const office = order.officeName || order.officeAddress || (order.officeCode ? `Офис ${order.officeCode}` : "");

    return [method, office, city].filter(Boolean).join(", ");
  }

  const addressParts = [
    order.shippingAddress,
    order.shippingPostcode,
    city,
  ].filter(Boolean);

  return addressParts.length > 0 ? `${method}: ${addressParts.join(", ")}` : method;
}

function getStatusLabel(status) {
  const labels = {
    pending: "Очаква обработка",
    processing: "Обработва се",
    completed: "Завършена",
    cancelled: "Отказана",
    canceled: "Отказана",
    paid: "Платена",
    shipped: "Изпратена",
  };

  return labels[String(status).toLowerCase()] || status;
}

function getPaymentLabel(method) {
  const labels = {
    stripe: "Карта",
    cod: "Наложен платеж",
    bank_transfer: "Банков превод",
  };

  return labels[method] || method || "Не е посочен";
}

function getShippingLabel(method) {
  const labels = {
    address: "До адрес",
    office: "До офис",
  };

  return labels[method] || method || "Не е посочен";
}

export default function Orders() {
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
            <span className="cart-kicker">Профил</span>
            <h1>Влезте в профила си</h1>
            <p>Трябва да сте вписани, за да видите историята на поръчките си.</p>
            <a href="/login" className="cart-empty-link">Към вход</a>
          </div>
        </section>
      </main>
    );
  }

  return (
    <main className="cart-page">
      <section className="cart-shell">
        <header className="cart-header">
          <span className="cart-kicker">Профил</span>
          <h1>Моите поръчки</h1>
          <p>Преглед на направените поръчки и техния текущ статус.</p>
        </header>

        {messages.length > 0 && (
          <div className="cart-alert orders-alert">
            {messages.map((message) => <p key={message}>{message}</p>)}
          </div>
        )}

        {loading ? (
          <div className="cart-empty">
            <h2>Зареждане...</h2>
          </div>
        ) : orders.length === 0 ? (
          <div className="cart-empty">
            <h2>Все още няма поръчки</h2>
            <p>Когато направите поръчка, тя ще се появи тук.</p>
            <a href="/cart" className="cart-empty-link">Към количката</a>
          </div>
        ) : (
          <div className="orders-list">
            {orders.map((order) => (
              <article className="order-card" key={order.id}>
                <div className="order-card-header">
                  <div>
                    <span>Поръчка</span>
                    <h2>#{order.number}</h2>
                  </div>
                  <div className="order-card-side">
                    {formatDate(order.createdAt) && (
                      <p className="order-card-date">
                        <span>Дата и час</span>
                        {formatDate(order.createdAt)}{formatTime(order.createdAt) ? `, ${formatTime(order.createdAt)}` : ""}
                      </p>
                    )}
                    <strong>{order.statusLabel || getStatusLabel(order.status)}</strong>
                  </div>
                </div>

                <div className="order-card-meta">
                  <p><span>Плащане</span>{getPaymentLabel(order.paymentMethod)}</p>
                  <p className="order-delivery-detail"><span>Доставка</span>{getDeliveryDetails(order)}</p>
                  <p><span>Общо</span>{formatPrice(order.total)}</p>
                </div>

                {order.items.length > 0 && (
                  <div className="order-items">
                    {order.items.map((item, index) => {
                      const product = item.product || item;
                      const name = item.product_name || product.name || item.name || `Продукт #${item.product_id || product.id || index + 1}`;
                      const quantity = item.quantity || item.qty || 1;
                      const image = getOrderItemImage(item);

                      return (
                        <article className="order-item-row" key={`${order.id}-${item.id || item.product_id || index}`}>
                          <div className="order-item-thumb">
                            {image ? <img src={image} alt="" /> : <span>{name.charAt(0)}</span>}
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
