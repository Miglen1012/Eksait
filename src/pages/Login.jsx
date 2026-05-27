import { useEffect, useState } from "react";
import {
  apiRequest,
  getCartSessionId,
  getFieldErrors,
  getTokenFromResponse,
  handleApiErrorByStatus,
  setAuthToken,
} from "../api/client";
import PasswordField from "../components/auth/PasswordField";
import "../styles/auth.css";

const LOGIN_LOCK_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const [messages, setMessages] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [retryIn, setRetryIn] = useState(0);

  useEffect(() => {
    if (retryIn <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRetryIn((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [retryIn]);

  async function handleSubmit(event) {
    event.preventDefault();

    if (retryIn > 0) {
      return;
    }

    setSubmitting(true);
    setMessages([]);

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || ""),
      remember: Boolean(formData.get("remember")),
      session_id: getCartSessionId(),
    };

    const validationErrors = [];

    if (!payload.email) {
      validationErrors.push("Въведете имейл адрес.");
    } else if (!EMAIL_PATTERN.test(payload.email)) {
      validationErrors.push("Въведете валиден имейл адрес.");
    }

    if (!payload.password) {
      validationErrors.push("Въведете парола.");
    }

    if (validationErrors.length > 0) {
      setMessages(validationErrors);
      setSubmitting(false);
      return;
    }

    try {
      const data = await apiRequest("/api/login", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      const token = getTokenFromResponse(data);

      if (token) {
        setAuthToken(token, { remember: payload.remember });
      }

      await apiRequest("/api/me");
      window.location.href = "/cart";
    } catch (error) {
      handleApiErrorByStatus(error, {
        fallbackRetryAfterSeconds: LOGIN_LOCK_SECONDS,
        on401: () => {
          setMessages(["Невалидни данни."]);
        },
        on422: () => {
          const fieldErrors = getFieldErrors(error, ["email", "password"]);
          setMessages(fieldErrors.length > 0 ? fieldErrors : ["Моля, проверете въведените данни."]);
        },
        on429: (_, retryAfter) => {
          setRetryIn(retryAfter);
          setMessages([`Опитайте отново след ${retryAfter} сек.`]);
        },
        onDefault: () => {
          setMessages(["Възникна грешка. Моля, опитайте отново."]);
        },
      });
    } finally {
      setSubmitting(false);
    }
  }

  const isLoginDisabled = submitting || retryIn > 0;

  return (
    <main className="auth-page">
      <section className="auth-shell">
        <div className="auth-copy">
          <span className="auth-kicker">Профил</span>
          <h1>Вписване</h1>
          <p>Влезте в профила си, за да преглеждате поръчки, данни за доставка и клиентски настройки.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2>Вход в профила</h2>

          {messages.length > 0 && (
            <div className="auth-alert">
              {messages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          {retryIn > 0 && (
            <div className="auth-alert">
              <p>Опитай отново след {retryIn} сек.</p>
            </div>
          )}

          <label>
            Имейл
            <input type="email" name="email" autoComplete="email" />
          </label>

          <PasswordField label="Парола" name="password" autoComplete="current-password" />

          <div className="auth-row">
            <label className="auth-check">
              <input type="checkbox" name="remember" />
              Запомни ме
            </label>
            <a href="/forgot-password">Забравена парола?</a>
          </div>

          <button type="submit" disabled={isLoginDisabled}>
            {submitting ? "Вписване..." : "Вписване"}
          </button>

          <p className="auth-switch">
            Нямате профил? <a href="/register">Създайте регистрация</a>
          </p>
        </form>
      </section>
    </main>
  );
}
