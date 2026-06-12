import { useState } from "react";
import { apiRequest, handleApiErrorByStatus, normalizeErrors } from "../api/client";
import PasswordField from "../components/auth/PasswordField";
import { useLanguage } from "../utils/language";
import "../styles/auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

function getResetTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const queryToken = params.get("token") || "";

  if (queryToken) {
    return queryToken;
  }

  if (!window.location.pathname.startsWith("/reset-password/")) {
    return "";
  }

  try {
    return decodeURIComponent(window.location.pathname.replace("/reset-password/", ""));
  } catch {
    return "";
  }
}

function getInitialEmailFromUrl() {
  return new URLSearchParams(window.location.search).get("email") || "";
}

function getFirstFieldError(error, field) {
  return error?.errors?.[field]?.[0] || "";
}

export default function ResetPassword() {
  const { t } = useLanguage();
  const [token] = useState(getResetTokenFromUrl);
  const [email, setEmail] = useState(getInitialEmailFromUrl);
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [messages, setMessages] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  function updateField(name, value) {
    if (name === "email") {
      setEmail(value);
    }

    if (name === "password") {
      setPassword(value);
    }

    if (name === "password_confirmation") {
      setPasswordConfirmation(value);
    }

    setFieldErrors((current) => ({ ...current, [name]: "" }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    const payload = {
      token,
      email: email.trim(),
      password,
      password_confirmation: passwordConfirmation,
    };
    const nextFieldErrors = {};
    const nextMessages = [];

    setMessages([]);
    setSuccessMessage("");
    setFieldErrors({});
    setSubmitting(true);

    if (!payload.token) {
      nextMessages.push(t("reset.invalidToken"));
    }

    if (!payload.email) {
      nextFieldErrors.email = t("form.emailRequired");
    } else if (!EMAIL_PATTERN.test(payload.email)) {
      nextFieldErrors.email = t("form.emailInvalid");
    }

    if (!payload.password) {
      nextFieldErrors.password = t("form.passwordNewRequired");
    } else if (payload.password.length < MIN_PASSWORD_LENGTH) {
      nextFieldErrors.password = t("form.passwordMin", { min: MIN_PASSWORD_LENGTH });
    }

    if (!payload.password_confirmation) {
      nextFieldErrors.password_confirmation = t("form.passwordResetConfirmRequired");
    } else if (payload.password && payload.password !== payload.password_confirmation) {
      nextFieldErrors.password_confirmation = t("form.passwordMismatch");
    }

    if (Object.keys(nextFieldErrors).length > 0 || nextMessages.length > 0) {
      setFieldErrors(nextFieldErrors);
      setMessages(nextMessages);
      setSubmitting(false);
      return;
    }

    try {
      await apiRequest("/api/reset-password", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      setPassword("");
      setPasswordConfirmation("");
      setSuccessMessage(t("reset.success"));
    } catch (error) {
      handleApiErrorByStatus(error, {
        on422: () => {
          const nextErrors = ["email", "password", "password_confirmation", "token"].reduce((errors, field) => {
            const fieldError = getFirstFieldError(error, field);

            if (fieldError) {
              errors[field] = fieldError;
            }

            return errors;
          }, {});

          setFieldErrors(nextErrors);
          setMessages(Object.keys(nextErrors).length > 0 ? [] : [t("form.checkReset")]);
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
          <span className="auth-kicker">{t("auth.profile")}</span>
          <h1>{t("auth.newPassword")}</h1>
          <p>{t("auth.newPasswordLead")}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2>{t("auth.resetPassword")}</h2>

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
              onChange={(event) => updateField("email", event.target.value)}
              aria-invalid={fieldErrors.email ? "true" : undefined}
              aria-describedby={fieldErrors.email ? "reset-email-error" : undefined}
            />
            {fieldErrors.email && <span className="auth-field-error" id="reset-email-error">{fieldErrors.email}</span>}
          </label>

          <PasswordField
            label={t("auth.passwordNew")}
            name="password"
            autoComplete="new-password"
            value={password}
            onChange={(event) => updateField("password", event.target.value)}
            error={fieldErrors.password}
          />

          <PasswordField
            label={t("auth.passwordConfirmNew")}
            name="password_confirmation"
            autoComplete="new-password"
            value={passwordConfirmation}
            onChange={(event) => updateField("password_confirmation", event.target.value)}
            error={fieldErrors.password_confirmation}
          />

          {fieldErrors.token && <p className="auth-field-error">{fieldErrors.token}</p>}

          <button type="submit" disabled={submitting || Boolean(successMessage)}>
            {submitting ? t("auth.saving") : t("auth.saveNewPassword")}
          </button>

          <p className="auth-switch">
            {t("auth.accessRestored")} <a href="/login">{t("auth.backToLogin")}</a>
          </p>
        </form>
      </section>
    </main>
  );
}
