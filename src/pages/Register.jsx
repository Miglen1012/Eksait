import { useState } from "react";
import {
  apiRequest,
  fetchCurrentUser,
  getAuthUserFromResponse,
  getCartSessionId,
  getFieldErrors,
  getTokenFromResponse,
  handleApiErrorByStatus,
  normalizeErrors,
  setAuthToken,
  storeAuthUser,
} from "../api/client";
import PasswordField from "../components/auth/PasswordField";
import { consumeAuthReturnPath, navigateToAppPath } from "../utils/authRedirect";
import { useLanguage } from "../utils/language";
import { isValidPhone, normalizePhone } from "../utils/validation";
import "../styles/auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
  const { t } = useLanguage();
  const phoneError = t("validation.phone");
  const [messages, setMessages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setSubmitting(true);
    setMessages([]);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "").trim();
    const phone = normalizePhone(formData.get("phone"));
    const password = String(formData.get("password") || "");
    const passwordConfirmation = String(formData.get("password_confirmation") || "");
    const validationErrors = [];
    const nextFieldErrors = {};

    if (!name) {
      validationErrors.push(t("form.nameRequired"));
      nextFieldErrors.name = t("form.nameRequired");
    }

    if (!email) {
      validationErrors.push(t("form.emailRequired"));
      nextFieldErrors.email = t("form.emailRequired");
    } else if (!EMAIL_PATTERN.test(email)) {
      validationErrors.push(t("form.emailInvalid"));
      nextFieldErrors.email = t("form.emailInvalid");
    }

    if (!isValidPhone(phone, { required: true })) {
      validationErrors.push(phoneError);
      nextFieldErrors.phone = phoneError;
    }

    if (!password) {
      validationErrors.push(t("form.passwordRequired"));
      nextFieldErrors.password = t("form.passwordRequired");
    }

    if (!passwordConfirmation) {
      validationErrors.push(t("form.passwordConfirmRequired"));
      nextFieldErrors.password_confirmation = t("form.passwordConfirmRequired");
    }

    if (password && passwordConfirmation && password !== passwordConfirmation) {
      validationErrors.push(t("form.passwordMismatch"));
      nextFieldErrors.password_confirmation = t("form.passwordMismatch");
    }

    if (validationErrors.length > 0) {
      setMessages(validationErrors);
      setFieldErrors(nextFieldErrors);
      setSubmitting(false);
      return;
    }

    const payload = {
      name,
      email,
      phone,
      password,
      password_confirmation: passwordConfirmation,
      session_id: getCartSessionId(),
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

      const user = getAuthUserFromResponse(data);

      if (user) {
        storeAuthUser(user);
      } else {
        fetchCurrentUser().catch(() => null);
      }

      window.dispatchEvent(new Event("auth:changed"));
      window.dispatchEvent(new Event("cart:changed"));
      navigateToAppPath(consumeAuthReturnPath("/"));
    } catch (error) {
      handleApiErrorByStatus(error, {
        on422: () => {
          const fieldErrors = getFieldErrors(error, ["name", "email", "phone", "password", "password_confirmation"]);
          const nextErrors = {
            name: error?.errors?.name?.[0] || "",
            email: error?.errors?.email?.[0] || "",
            phone: error?.errors?.phone?.[0] || "",
            password: error?.errors?.password?.[0] || "",
            password_confirmation: error?.errors?.password_confirmation?.[0] || "",
          };

          setFieldErrors(nextErrors);
          setMessages(fieldErrors.length > 0 ? [] : [t("form.checkInput")]);
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
          <span className="auth-kicker">{t("auth.newAccount")}</span>
          <h1>{t("auth.register")}</h1>
          <p>{t("auth.registerLead")}</p>
        </div>

        <form className="auth-form" onSubmit={handleSubmit} noValidate>
          <h2>{t("auth.createProfile")}</h2>

          <label>
            {t("auth.name")}
            <input
              type="text"
              name="name"
              autoComplete="name"
              aria-invalid={fieldErrors.name ? "true" : undefined}
              aria-describedby={fieldErrors.name ? "register-name-error" : undefined}
              onChange={() => {
                if (fieldErrors.name) {
                  setFieldErrors((current) => ({ ...current, name: "" }));
                }
              }}
            />
            {fieldErrors.name && <span className="auth-field-error" id="register-name-error">{fieldErrors.name}</span>}
          </label>

          <label>
            {t("auth.email")}
            <input
              type="email"
              name="email"
              autoComplete="email"
              aria-invalid={fieldErrors.email ? "true" : undefined}
              aria-describedby={fieldErrors.email ? "register-email-error" : undefined}
              onChange={() => {
                if (fieldErrors.email) {
                  setFieldErrors((current) => ({ ...current, email: "" }));
                }
              }}
            />
            {fieldErrors.email && <span className="auth-field-error" id="register-email-error">{fieldErrors.email}</span>}
          </label>

          <label>
            {t("form.phone")}
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              maxLength="10"
              title={phoneError}
              aria-invalid={fieldErrors.phone ? "true" : undefined}
              aria-describedby={fieldErrors.phone ? "register-phone-error" : undefined}
              onChange={() => {
                if (fieldErrors.phone) {
                  setFieldErrors((current) => ({ ...current, phone: "" }));
                }
              }}
            />
            {fieldErrors.phone && <span className="auth-field-error" id="register-phone-error">{fieldErrors.phone}</span>}
          </label>

          <PasswordField
            label={t("auth.password")}
            name="password"
            autoComplete="new-password"
            error={fieldErrors.password}
            onChange={() => {
              if (fieldErrors.password) {
                setFieldErrors((current) => ({ ...current, password: "" }));
              }
            }}
          />

          <PasswordField
            label={t("auth.passwordConfirm")}
            name="password_confirmation"
            autoComplete="new-password"
            error={fieldErrors.password_confirmation}
            onChange={() => {
              if (fieldErrors.password_confirmation) {
                setFieldErrors((current) => ({ ...current, password_confirmation: "" }));
              }
            }}
          />

          {messages.length > 0 && (
            <div className="auth-alert">
              {messages.map((message) => (
                <p key={message}>{message}</p>
              ))}
            </div>
          )}

          <button type="submit" disabled={submitting}>
            {submitting ? t("auth.registering") : t("auth.register")}
          </button>

          <p className="auth-switch">
            {t("auth.accountExists")} <a href="/login">{t("auth.login")}</a>
          </p>
        </form>
      </section>
    </main>
  );
}
