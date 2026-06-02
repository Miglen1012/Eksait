import "../styles/cart.css";

export default function CheckoutResult({ type }) {
  const params = new URLSearchParams(window.location.search);
  const orderId = params.get("order_id");
  const isSuccess = type === "success";

  return (
    <main className="cart-page cart-page--result">
      <section className="cart-shell">
        <div className="cart-result">
          <span className="cart-kicker">{isSuccess ? "Поръчката е приета" : "Плащането е прекъснато"}</span>
          <h1>{isSuccess ? "Благодарим за поръчката" : "Поръчката не е завършена"}</h1>
          <p>
            {isSuccess
              ? "Ще обработим заявката и ще се свържем с вас при нужда от допълнителна информация."
              : "Можете да се върнете към количката и да опитате отново."}
          </p>

          {orderId && <p className="cart-order-id">Номер на поръчка: {orderId}</p>}

          <a href={isSuccess ? "/" : "/cart"} className="cart-empty-link">
            {isSuccess ? "Към началото" : "Обратно към количката"}
          </a>
        </div>
      </section>
    </main>
  );
}
