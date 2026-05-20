import { useState } from "react";
import { apiRequest, getFieldErrors, getTokenFromResponse, handleApiErrorByStatus, normalizeErrors, setAuthToken } from "../api/client";
import PasswordField from "../components/auth/PasswordField";
import { PHONE_ERROR, PHONE_PATTERN, isValidPhone, normalizePhone } from "../utils/validation";
import "../styles/auth.css";

export default function Register() {
  const [messages, setMessages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessages([]);

    const formData = new FormData(event.currentTarget);
    const phone = normalizePhone(formData.get("phone"));

    if (!isValidPhone(phone)) {
      setMessages([PHONE_ERROR]);
      setSubmitting(false);
      return;
    }

    const payload = {
      name: formData.get("name"),
      email: formData.get("email"),
      phone,
      password: formData.get("password"),
      password_confirmation: formData.get("password_confirmation"),
    };

    try {
      const data = await apiRequest("/api/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const token = getTokenFromResponse(data);

      if (token) {
        setAuthToken(token);
      }

      window.location.href = "/cart";
    } catch (error) {
      handleApiErrorByStatus(error, {
        on422: () => {
          const fieldErrors = getFieldErrors(error, ["name", "email", "phone", "password", "password_confirmation"]);
          setMessages(fieldErrors.length > 0 ? fieldErrors : ["Моля, проверете въведените данни."]);
        },
        onDefault: () => {
          setMessages(normalizeErrors(error));
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-copy">
          <span className="auth-kicker">Нов профил</span>
          <h1>Регистрация</h1>
          <p>
            Създайте клиентски профил, за да поръчвате по-бързо и да пазите
            основните си данни за бъдещи заявки.
          </p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <h2>Създаване на профил</h2>

          {messages.length > 0 && (
            <div className="auth-alert">
              {messages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          <label>
            Име
            <input type="text" name="name" autoComplete="name" required />
          </label>

          <label>
            Имейл
            <input type="email" name="email" autoComplete="email" required />
          </label>

          <label>
            Телефон
            <input type="tel" name="phone" autoComplete="tel" maxLength="10" pattern={PHONE_PATTERN} title={PHONE_ERROR} />
          </label>

          <PasswordField label="Парола" name="password" autoComplete="new-password" />

          <PasswordField label="Повторете паролата" name="password_confirmation" autoComplete="new-password" />

          <button type="submit" disabled={submitting}>
            {submitting ? "Регистрация..." : "Регистрация"}
          </button>

          <p className="auth-switch">
            Вече имате профил? <a href="/login">Вписване</a>
          </p>
        </form>
      </section>
    </main>
  );
}
