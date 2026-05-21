import { useEffect, useState } from "react";
import { apiRequest, getAuthToken, getFieldErrors, handleApiErrorByStatus, normalizeErrors } from "../api/client";
import "../styles/contact.css";

const CONTACT_MESSAGE_MAX_LENGTH = 2000;
const CONTACT_RETRY_FALLBACK_SECONDS = 60;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^[0-9]{10}$/;
const INITIAL_FORM = {
  name: "",
  email: "",
  phone: "",
  message: "",
};

function getUserFromResponse(data) {
  return data?.user || data?.data || data || null;
}

function getUserContactFields(user) {
  return {
    name: user?.name || user?.full_name || "",
    email: user?.email || "",
    phone: user?.phone || user?.phone_number || user?.telephone || "",
  };
}

export default function Contact() {
  const [messages, setMessages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retryIn, setRetryIn] = useState(0);
  const [isAuthenticatedContact, setIsAuthenticatedContact] = useState(false);
  const [formValues, setFormValues] = useState(INITIAL_FORM);

  useEffect(() => {
    if (retryIn <= 0) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setRetryIn((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [retryIn]);

  useEffect(() => {
    if (!successMessage) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setSuccessMessage("");
    }, 4000);

    return () => window.clearTimeout(timer);
  }, [successMessage]);

  useEffect(() => {
    let isMounted = true;

    async function hydrateContactIdentity() {
      if (!getAuthToken()) {
        if (isMounted) {
          setIsAuthenticatedContact(false);
        }
        return;
      }

      try {
        const data = await apiRequest("/api/me");
        const user = getUserFromResponse(data);
        const nextFields = getUserContactFields(user);

        if (isMounted) {
          setIsAuthenticatedContact(true);
          setFormValues((current) => ({
            ...current,
            name: nextFields.name,
            email: nextFields.email,
            phone: nextFields.phone,
          }));
        }
      } catch {
        if (isMounted) {
          setIsAuthenticatedContact(false);
        }
      }
    }

    hydrateContactIdentity();

    return () => {
      isMounted = false;
    };
  }, []);

  function updateField(name, value) {
    setFormValues((current) => ({
      ...current,
      [name]: value,
    }));
    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const nextErrors = { ...current };
      delete nextErrors[name];
      return nextErrors;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    const formElement = event.currentTarget;

    if (retryIn > 0) {
      return;
    }

    setMessages([]);
    setFieldErrors({});
    setSuccessMessage("");
    setSubmitting(true);

    if (!formElement || typeof formElement.reset !== "function") {
      setMessages(["Възникна грешка при изпращане. Моля, опитайте отново."]);
      setSubmitting(false);
      return;
    }

    const payload = {
      name: String(formValues.name || "").trim(),
      email: String(formValues.email || "").trim(),
      phone: String(formValues.phone || "").trim(),
      message: String(formValues.message || "").trim(),
    };
    const validationErrors = {};

    if (!isAuthenticatedContact && !payload.name) {
      validationErrors.name = "Въведете име.";
    }

    if (!isAuthenticatedContact && !payload.email) {
      validationErrors.email = "Въведете имейл адрес.";
    } else if (payload.email && !EMAIL_PATTERN.test(payload.email)) {
      validationErrors.email = "Въведете валиден имейл адрес.";
    }

    if (!isAuthenticatedContact && !payload.phone) {
      validationErrors.phone = "Въведете телефонен номер.";
    } else if (payload.phone && !PHONE_PATTERN.test(payload.phone)) {
      validationErrors.phone = "Моля, въведете телефонен номер с 10 цифри.";
    }

    if (!payload.message) {
      validationErrors.message = "Въведете съобщение.";
    } else if (payload.message.length > CONTACT_MESSAGE_MAX_LENGTH) {
      validationErrors.message = `Съобщението може да е до ${CONTACT_MESSAGE_MAX_LENGTH} символа.`;
    }

    if (Object.keys(validationErrors).length > 0) {
      setFieldErrors(validationErrors);
      setSubmitting(false);
      return;
    }

    try {
      await apiRequest("/api/contact", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (isAuthenticatedContact) {
        setFormValues((current) => ({
          ...current,
          message: "",
        }));
      } else {
        formElement.reset();
        setFormValues(INITIAL_FORM);
      }

      setFieldErrors({});
      setSuccessMessage("Съобщението беше изпратено успешно.");
    } catch (error) {
      handleApiErrorByStatus(error, {
        fallbackRetryAfterSeconds: CONTACT_RETRY_FALLBACK_SECONDS,
        on422: () => {
          const nextFieldErrors = ["name", "email", "phone", "message"].reduce((errors, field) => {
            const [fieldError] = error.errors?.[field] || [];

            if (fieldError) {
              errors[field] = fieldError;
            }

            return errors;
          }, {});
          const fieldErrorMessages = getFieldErrors(error, ["name", "email", "phone", "message"]);

          setFieldErrors(nextFieldErrors);
          setMessages(Object.keys(nextFieldErrors).length > 0 ? [] : fieldErrorMessages.length > 0 ? fieldErrorMessages : ["Моля, проверете въведените данни."]);
        },
        on429: (_, retryAfter) => {
          setRetryIn(retryAfter);
          setMessages(["Опитай след малко."]);
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
    <main className="contact-page">
      {successMessage && (
        <div className="page-toast" role="status" aria-live="polite">
          {successMessage}
        </div>
      )}
      <section className="contact-shell">
        <div className="contact-intro">
          <span className="contact-kicker">Свържете се с нас</span>
          <h1>Изпратете ни съобщение</h1>
          <p>
            Попълнете формата и ще се свържем с вас при първа възможност.
            Можете да ни намерите и на посочените телефон, имейл и адрес.
          </p>
        </div>

        <div className="contact-content">
          <form className="contact-form" onSubmit={handleSubmit} noValidate>
            {messages.length > 0 && (
              <div className="contact-alert">
                {messages.map((message) => (
                  <p key={message}>{message}</p>
                ))}
              </div>
            )}

            {retryIn > 0 && (
              <div className="contact-alert">
                <p>Опитай отново след {retryIn} сек.</p>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="name">Име</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formValues.name}
                placeholder="Вашето име"
                disabled={isAuthenticatedContact}
                onChange={(event) => updateField("name", event.target.value)}
                aria-invalid={fieldErrors.name ? "true" : undefined}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
              />
              {fieldErrors.name && <p className="field-error" id="name-error">{fieldErrors.name}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="email">Имейл</label>
              <input
                type="email"
                id="email"
                name="email"
                value={formValues.email}
                placeholder="example@email.com"
                disabled={isAuthenticatedContact}
                onChange={(event) => updateField("email", event.target.value)}
                aria-invalid={fieldErrors.email ? "true" : undefined}
                aria-describedby={fieldErrors.email ? "email-error" : undefined}
              />
              {fieldErrors.email && <p className="field-error" id="email-error">{fieldErrors.email}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="phone">Телефонен номер</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formValues.phone}
                placeholder="08********"
                disabled={isAuthenticatedContact}
                onChange={(event) => updateField("phone", event.target.value)}
                aria-invalid={fieldErrors.phone ? "true" : undefined}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
              />
              {fieldErrors.phone && <p className="field-error" id="phone-error">{fieldErrors.phone}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="message">Съобщение</label>
              <textarea
                id="message"
                name="message"
                value={formValues.message}
                placeholder="Напишете вашето съобщение..."
                maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                onChange={(event) => updateField("message", event.target.value)}
                aria-invalid={fieldErrors.message ? "true" : undefined}
                aria-describedby={fieldErrors.message ? "message-error" : undefined}
              ></textarea>
              {fieldErrors.message && <p className="field-error" id="message-error">{fieldErrors.message}</p>}
            </div>

            <button type="submit" disabled={submitting || retryIn > 0}>
              {submitting ? "Изпращане..." : "Изпрати"}
            </button>
          </form>

          <aside className="contact-info" aria-label="Контактна информация">
            <h2>Контакти</h2>
            <p><strong>Град:</strong> гр. Стара Загора</p>
            <p><strong>Адрес:</strong> ул. Войвода Стойчо Черногоров №47</p>
            <p><strong>Телефон:</strong> +359 988 335 555</p>
            <p><strong>Имейл:</strong> office@eksait.com</p>
          </aside>
        </div>

        <section className="contact-map" aria-label="Карта с адрес">
          <div className="contact-map-header">
            <span className="contact-kicker">Локация</span>
            <h2>Карта</h2>
          </div>

          <div className="map-frame">
            <iframe
              title="Карта до Ексайт Къмпани ООД"
              src="https://www.google.com/maps/embed?pb=!1m14!1m8!1m3!1d184.1028474702297!2d25.633917!3d42.413992!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x40a869c4a13f6fb7%3A0xea32aa58614c3891!2z0JXQutGB0LDQudGCINCa0YrQvNC_0LDQvdC4INCe0J7QlA!5e0!3m2!1sbg!2sbg!4v1778661930433!5m2!1sbg!2sbg"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
            ></iframe>
          </div>
        </section>
      </section>
    </main>
  );
}

