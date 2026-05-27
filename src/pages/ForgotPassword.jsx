import { useEffect, useState } from "react";
import { apiRequest, handleApiErrorByStatus, normalizeErrors } from "../api/client";
import "../styles/auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_RETRY_FALLBACK_SECONDS = 60;
const RESET_REQUEST_SUCCESS_MESSAGE = "Ако има профил с този имейл, ще изпратим линк за смяна на паролата.";

function getFirstFieldError(error, field) {
  return error?.errors?.[field]?.[0] || "";
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [messages, setMessages] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
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

    const nextEmail = email.trim();
    const nextFieldErrors = {};

    setMessages([]);
    setSuccessMessage("");
    setFieldErrors({});
    setSubmitting(true);

    if (!nextEmail) {
      nextFieldErrors.email = "Въведете имейл адрес.";
    } else if (!EMAIL_PATTERN.test(nextEmail)) {
      nextFieldErrors.email = "Въведете валиден имейл адрес.";
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setSubmitting(false);
      return;
    }

    try {
      await apiRequest("/api/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email: nextEmail }),
      });

      setSuccessMessage(RESET_REQUEST_SUCCESS_MESSAGE);
    } catch (error) {
      handleApiErrorByStatus(error, {
        fallbackRetryAfterSeconds: RESET_RETRY_FALLBACK_SECONDS,
        on422: () => {
          const emailError = getFirstFieldError(error, "email");

          if (emailError) {
            setFieldErrors({ email: emailError });
          } else {
            setMessages(["Моля, проверете въведения имейл адрес."]);
          }
        },
        on429: (_, retryAfter) => {
          setRetryIn(retryAfter);
          setMessages([`Опитайте отново след ${retryAfter} сек.`]);
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
          <span className="auth-kicker">Профил</span>
          <h1>Забравена парола</h1>
          <p>Въведете имейла към профила си и ще получите линк за задаване на нова парола.</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2>Възстановяване на достъп</h2>

          {successMessage && (
            <div className="auth-alert is-success">
              <p>{successMessage}</p>
            </div>
          )}

          {messages.length > 0 && (
            <div className="auth-alert">
              {messages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          <label>
            Имейл
            <input
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(event) => {
                setEmail(event.target.value);
                setFieldErrors((current) => ({ ...current, email: "" }));
              }}
              aria-invalid={fieldErrors.email ? "true" : undefined}
              aria-describedby={fieldErrors.email ? "forgot-email-error" : undefined}
            />
            {fieldErrors.email && <span className="auth-field-error" id="forgot-email-error">{fieldErrors.email}</span>}
          </label>

          <button type="submit" disabled={submitting || retryIn > 0}>
            {submitting ? "Изпращане..." : retryIn > 0 ? `Изчакайте ${retryIn} сек.` : "Изпрати линк"}
          </button>

          <p className="auth-switch">
            Спомнихте си паролата? <a href="/login">Вписване</a>
          </p>
        </form>
      </section>
    </main>
  );
}
