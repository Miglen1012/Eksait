import { useState } from "react";
import { apiRequest, getCartSessionId, getFieldErrors, getTokenFromResponse, handleApiErrorByStatus, normalizeErrors, setAuthToken } from "../api/client";
import PasswordField from "../components/auth/PasswordField";
import { consumeAuthReturnPath } from "../utils/authRedirect";
import { PHONE_ERROR, isValidPhone, normalizePhone } from "../utils/validation";
import "../styles/auth.css";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Register() {
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
      validationErrors.push("Въведете име.");
      nextFieldErrors.name = "Въведете име.";
    }

    if (!email) {
      validationErrors.push("Въведете имейл адрес.");
      nextFieldErrors.email = "Въведете имейл адрес.";
    } else if (!EMAIL_PATTERN.test(email)) {
      validationErrors.push("Въведете валиден имейл адрес.");
      nextFieldErrors.email = "Въведете валиден имейл адрес.";
    }

    if (!isValidPhone(phone, { required: true })) {
      validationErrors.push(PHONE_ERROR);
      nextFieldErrors.phone = PHONE_ERROR;
    }

    if (!password) {
      validationErrors.push("Въведете парола.");
      nextFieldErrors.password = "Въведете парола.";
    }

    if (!passwordConfirmation) {
      validationErrors.push("Повторете паролата.");
      nextFieldErrors.password_confirmation = "Повторете паролата.";
    }

    if (password && passwordConfirmation && password !== passwordConfirmation) {
      validationErrors.push("Паролите не съвпадат.");
      nextFieldErrors.password_confirmation = "Паролите не съвпадат.";
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

      window.location.href = consumeAuthReturnPath("/");
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
          setMessages(fieldErrors.length > 0 ? [] : ["Моля, проверете въведените данни."]);
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

          <label>
            Име
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
            Имейл
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
            Телефон
            <input
              type="tel"
              name="phone"
              autoComplete="tel"
              maxLength="10"
              title={PHONE_ERROR}
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
            label="Парола"
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
            label="Повторете паролата"
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
