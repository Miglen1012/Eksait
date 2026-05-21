import { useState } from "react";
import { apiRequest, getFieldErrors, getTokenFromResponse, handleApiErrorByStatus, normalizeErrors, setAuthToken } from "../api/client";
import PasswordField from "../components/auth/PasswordField";
import { PHONE_ERROR, isValidPhone, normalizePhone } from "../utils/validation";
import "../styles/auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const [messages, setMessages] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessages([]);

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = normalizePhone(formData.get("phone"));
    const password = String(formData.get("password") || "");
    const passwordConfirmation = String(formData.get("password_confirmation") || "");
    const validationErrors = [];

    if (!name) {
      validationErrors.push("Въведете име.");
    }

    if (!email) {
      validationErrors.push("Въведете имейл адрес.");
    } else if (!EMAIL_PATTERN.test(email)) {
      validationErrors.push("Въведете валиден имейл адрес.");
    }

    if (!isValidPhone(phone, { required: true })) {
      validationErrors.push(PHONE_ERROR);
    }

    if (!password) {
      validationErrors.push("Въведете парола.");
    }

    if (!passwordConfirmation) {
      validationErrors.push("Повторете паролата.");
    }

    if (password && passwordConfirmation && password !== passwordConfirmation) {
      validationErrors.push("Паролите не съвпадат.");
    }

    if (validationErrors.length > 0) {
      setMessages(validationErrors);
      setSubmitting(false);
      return;
    }

    const payload = {
      name,
      email,
      phone,
      password,
      password_confirmation: passwordConfirmation,
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

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
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
            <input type="text" name="name" autoComplete="name" />
          </label>

          <label>
            Имейл
            <input type="email" name="email" autoComplete="email" />
          </label>

          <label>
            Телефон
            <input type="tel" name="phone" autoComplete="tel" maxLength="10" title={PHONE_ERROR} />
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
