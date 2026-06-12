import { useEffect, useState } from "react";
import { apiRequest, handleApiErrorByStatus, normalizeErrors } from "../api/client";
import { useLanguage } from "../utils/language";
import "../styles/auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const RESET_RETRY_FALLBACK_SECONDS = 60;

function getFirstFieldError(error, field) {
  return error?.errors?.[field]?.[0] || "";
}

export default function ForgotPassword() {
  const { t } = useLanguage();
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
      nextFieldErrors.email = t("form.emailRequired");
    } else if (!EMAIL_PATTERN.test(nextEmail)) {
      nextFieldErrors.email = t("form.emailInvalid");
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

      setSuccessMessage(t("reset.requestSuccess"));
    } catch (error) {
      handleApiErrorByStatus(error, {
        fallbackRetryAfterSeconds: RESET_RETRY_FALLBACK_SECONDS,
        on422: () => {
          const emailError = getFirstFieldError(error, "email");

          if (emailError) {
            setFieldErrors({ email: emailError });
          } else {
            setMessages([t("form.checkEmail")]);
          }
        },
        on429: (_, retryAfter) => {
          setRetryIn(retryAfter);
          setMessages([t("auth.loginRetryFormal", { seconds: retryAfter })]);
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
          <span className="auth-kicker">{t("auth.forgotKicker")}</span>
          <h1>{t("auth.forgotPassword")}</h1>
          <p>{t("auth.forgotLead")}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2>{t("auth.recoverAccess")}</h2>

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
            {t("auth.email")}
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
            {submitting ? t("auth.sending") : retryIn > 0 ? t("auth.waitSeconds", { seconds: retryIn }) : t("auth.sendLink")}
          </button>

          <p className="auth-switch">
            {t("auth.rememberedPassword")} <a href="/login">{t("auth.login")}</a>
          </p>
        </form>
      </section>
    </main>
  );
}
