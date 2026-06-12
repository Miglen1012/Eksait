import { useEffect, useState } from "react";
import {
  apiRequest,
  fetchCurrentUser,
  getAuthUserFromResponse,
  getCartSessionId,
  getTokenFromResponse,
  handleApiErrorByStatus,
  normalizeErrors,
  setAuthToken,
  storeAuthUser,
} from "../api/client";
import PasswordField from "../components/auth/PasswordField";
import { consumeAuthReturnPath, navigateToAppPath } from "../utils/authRedirect";
import { useLanguage } from "../utils/language";
import "../styles/auth.css";

const LOGIN_LOCK_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login() {
  const { t } = useLanguage();
  const [messages, setMessages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
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
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const payload = {
      email: String(formData.get("email") || "").trim(),
      password: String(formData.get("password") || ""),
      remember: Boolean(formData.get("remember")),
      session_id: getCartSessionId(),
    };

    const validationErrors = [];
    const nextFieldErrors = {};
    const emailRequired = t("form.emailRequired");
    const emailInvalid = t("form.emailInvalid");
    const passwordRequired = t("form.passwordRequired");

    if (!payload.email) {
      validationErrors.push(emailRequired);
      nextFieldErrors.email = emailRequired;
    } else if (!EMAIL_PATTERN.test(payload.email)) {
      validationErrors.push(emailInvalid);
      nextFieldErrors.email = emailInvalid;
    }

    if (!payload.password) {
      validationErrors.push(passwordRequired);
      nextFieldErrors.password = passwordRequired;
    }

    if (validationErrors.length > 0) {
      setMessages(validationErrors);
      setFieldErrors(nextFieldErrors);
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

      const user = getAuthUserFromResponse(data);

      if (user) {
        storeAuthUser(user, { remember: payload.remember });
      } else {
        fetchCurrentUser().catch(() => null);
      }

      window.dispatchEvent(new Event("auth:changed"));
      window.dispatchEvent(new Event("cart:changed"));
      navigateToAppPath(consumeAuthReturnPath("/"));
    } catch (error) {
      handleApiErrorByStatus(error, {
        fallbackRetryAfterSeconds: LOGIN_LOCK_SECONDS,
        on401: () => {
          setFieldErrors({});
          setMessages(normalizeErrors(error));
        },
        on422: () => {
          setFieldErrors({});
          setMessages(normalizeErrors(error));
        },
        on429: (_, retryAfter) => {
          setRetryIn(retryAfter);
          setMessages([t("auth.loginRetryFormal", { seconds: retryAfter })]);
        },
        onDefault: () => {
          setMessages([t("error.default")]);
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
          <span className="auth-kicker">{t("auth.profile")}</span>
          <h1>{t("auth.login")}</h1>
          <p>{t("auth.loginLead")}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2>{t("auth.loginFormTitle")}</h2>

          {messages.length > 0 && (
            <div className="auth-alert">
              {messages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          {retryIn > 0 && (
            <div className="auth-alert">
              <p>{t("auth.loginRetry", { seconds: retryIn })}</p>
            </div>
          )}

          <label>
            {t("auth.email")}
            <input
              type="email"
              name="email"
              autoComplete="email"
              aria-invalid={fieldErrors.email ? "true" : undefined}
              aria-describedby={fieldErrors.email ? "login-email-error" : undefined}
              onChange={() => {
                if (fieldErrors.email) {
                  setFieldErrors((current) => ({ ...current, email: "" }));
                }
              }}
            />
            {fieldErrors.email && <span className="auth-field-error" id="login-email-error">{fieldErrors.email}</span>}
          </label>

          <PasswordField
            label={t("auth.password")}
            name="password"
            autoComplete="current-password"
            error={fieldErrors.password}
            onChange={() => {
              if (fieldErrors.password) {
                setFieldErrors((current) => ({ ...current, password: "" }));
              }
            }}
          />

          <div className="auth-row">
            <label className="auth-check">
              <input type="checkbox" name="remember" />
              {t("auth.rememberMe")}
            </label>
            <a href="/forgot-password">{t("auth.forgotQuestion")}</a>
          </div>

          <button type="submit" disabled={isLoginDisabled}>
            {submitting ? `${t("auth.login")}...` : t("auth.login")}
          </button>

          <p className="auth-switch">
            {t("auth.noAccount")} <a href="/register">{t("auth.createAccount")}</a>
          </p>
        </form>
      </section>
    </main>
  );
}
