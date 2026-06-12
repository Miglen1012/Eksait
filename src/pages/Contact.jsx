import { useEffect, useState } from "react";
import { apiRequest, getAuthToken, getFieldErrors, handleApiErrorByStatus, normalizeErrors } from "../api/client";
import { useLanguage } from "../utils/language";
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

const contactCopy = {
  bg: {
    success: "Съобщението беше изпратено успешно.",
    genericError: "Възникна грешка при изпращане. Моля, опитайте отново.",
    invalidData: "Моля, проверете въведените данни.",
    retryShort: "Опитай след малко.",
    retryAfter: "Опитай отново след {seconds} сек.",
    introKicker: "Свържете се с нас",
    introTitle: "Изпратете ни съобщение",
    introText:
      "Попълнете формата и ще се свържем с вас при първа възможност. Можете да ни намерите и на посочените телефон, имейл и адрес.",
    name: "Име",
    namePlaceholder: "Вашето име",
    email: "Имейл",
    phone: "Телефонен номер",
    phonePlaceholder: "08********",
    message: "Съобщение",
    messagePlaceholder: "Напишете вашето съобщение...",
    submitting: "Изпращане...",
    submit: "Изпрати",
    infoAria: "Контактна информация",
    contacts: "Контакти",
    cityLabel: "Град",
    city: "гр. Стара Загора",
    addressLabel: "Адрес",
    address: "ул. Войвода Стойчо Черногоров №47",
    phoneLabel: "Телефон",
    emailLabel: "Имейл",
    mapAria: "Карта с адрес",
    location: "Локация",
    mapTitle: "Карта",
    iframeTitle: "Карта до Ексайт Къмпани ООД",
    validation: {
      name: "Въведете име.",
      emailRequired: "Въведете имейл адрес.",
      emailInvalid: "Въведете валиден имейл адрес.",
      phoneRequired: "Въведете телефонен номер.",
      phoneInvalid: "Моля, въведете телефонен номер с 10 цифри.",
      message: "Въведете съобщение.",
      messageLength: "Съобщението може да е до {max} символа.",
    },
  },
  en: {
    success: "Your message was sent successfully.",
    genericError: "There was a problem sending the message. Please try again.",
    invalidData: "Please check the entered information.",
    retryShort: "Try again in a moment.",
    retryAfter: "Try again in {seconds} sec.",
    introKicker: "Contact us",
    introTitle: "Send us a message",
    introText:
      "Fill in the form and we will contact you as soon as possible. You can also reach us by phone, email or at the address below.",
    name: "Name",
    namePlaceholder: "Your name",
    email: "Email",
    phone: "Phone number",
    phonePlaceholder: "08********",
    message: "Message",
    messagePlaceholder: "Write your message...",
    submitting: "Sending...",
    submit: "Send",
    infoAria: "Contact information",
    contacts: "Contacts",
    cityLabel: "City",
    city: "Stara Zagora",
    addressLabel: "Address",
    address: "47 Voyvoda Stoycho Chernogorov St.",
    phoneLabel: "Phone",
    emailLabel: "Email",
    mapAria: "Address map",
    location: "Location",
    mapTitle: "Map",
    iframeTitle: "Map to Excite Company Ltd.",
    validation: {
      name: "Enter a name.",
      emailRequired: "Enter an email address.",
      emailInvalid: "Enter a valid email address.",
      phoneRequired: "Enter a phone number.",
      phoneInvalid: "Please enter a 10-digit phone number.",
      message: "Enter a message.",
      messageLength: "The message can be up to {max} characters.",
    },
  },
  de: {
    success: "Ihre Nachricht wurde erfolgreich gesendet.",
    genericError: "Beim Senden der Nachricht ist ein Problem aufgetreten. Bitte versuchen Sie es erneut.",
    invalidData: "Bitte prüfen Sie die eingegebenen Daten.",
    retryShort: "Versuchen Sie es gleich erneut.",
    retryAfter: "Versuchen Sie es in {seconds} Sek. erneut.",
    introKicker: "Kontakt",
    introTitle: "Senden Sie uns eine Nachricht",
    introText:
      "Füllen Sie das Formular aus und wir melden uns so schnell wie möglich. Sie erreichen uns auch telefonisch, per E-Mail oder unter der angegebenen Adresse.",
    name: "Name",
    namePlaceholder: "Ihr Name",
    email: "E-Mail",
    phone: "Telefonnummer",
    phonePlaceholder: "08********",
    message: "Nachricht",
    messagePlaceholder: "Schreiben Sie Ihre Nachricht...",
    submitting: "Wird gesendet...",
    submit: "Senden",
    infoAria: "Kontaktinformationen",
    contacts: "Kontakt",
    cityLabel: "Stadt",
    city: "Stara Zagora",
    addressLabel: "Adresse",
    address: "47 Voyvoda Stoycho Chernogorov Str.",
    phoneLabel: "Telefon",
    emailLabel: "E-Mail",
    mapAria: "Karte mit Adresse",
    location: "Standort",
    mapTitle: "Karte",
    iframeTitle: "Karte zu Excite Company Ltd.",
    validation: {
      name: "Geben Sie einen Namen ein.",
      emailRequired: "Geben Sie eine E-Mail-Adresse ein.",
      emailInvalid: "Geben Sie eine gültige E-Mail-Adresse ein.",
      phoneRequired: "Geben Sie eine Telefonnummer ein.",
      phoneInvalid: "Bitte geben Sie eine Telefonnummer mit 10 Ziffern ein.",
      message: "Geben Sie eine Nachricht ein.",
      messageLength: "Die Nachricht darf bis zu {max} Zeichen lang sein.",
    },
  },
};

function interpolate(text, values = {}) {
  return String(text || "").replace(/\{([a-zA-Z0-9_]+)\}/g, (match, key) => (
    Object.prototype.hasOwnProperty.call(values, key) ? String(values[key]) : match
  ));
}

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
  const { language } = useLanguage();
  const copy = contactCopy[language] || contactCopy.bg;
  const [messages, setMessages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [retryIn, setRetryIn] = useState(0);
  const [isAuthenticatedContact, setIsAuthenticatedContact] = useState(false);
  const [formValues, setFormValues] = useState(INITIAL_FORM);

  useEffect(() => {
    setMessages([]);
    setFieldErrors({});
    setSuccessMessage("");
  }, [language]);

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
      setMessages([copy.genericError]);
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
      validationErrors.name = copy.validation.name;
    }

    if (!isAuthenticatedContact && !payload.email) {
      validationErrors.email = copy.validation.emailRequired;
    } else if (payload.email && !EMAIL_PATTERN.test(payload.email)) {
      validationErrors.email = copy.validation.emailInvalid;
    }

    if (!isAuthenticatedContact && !payload.phone) {
      validationErrors.phone = copy.validation.phoneRequired;
    } else if (payload.phone && !PHONE_PATTERN.test(payload.phone)) {
      validationErrors.phone = copy.validation.phoneInvalid;
    }

    if (!payload.message) {
      validationErrors.message = copy.validation.message;
    } else if (payload.message.length > CONTACT_MESSAGE_MAX_LENGTH) {
      validationErrors.message = interpolate(copy.validation.messageLength, { max: CONTACT_MESSAGE_MAX_LENGTH });
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
      setSuccessMessage(copy.success);
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
          setMessages(Object.keys(nextFieldErrors).length > 0 ? [] : fieldErrorMessages.length > 0 ? fieldErrorMessages : [copy.invalidData]);
        },
        on429: (_, retryAfter) => {
          setRetryIn(retryAfter);
          setMessages([copy.retryShort]);
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
          <span className="contact-kicker">{copy.introKicker}</span>
          <h1>{copy.introTitle}</h1>
          <p>{copy.introText}</p>
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
                <p>{interpolate(copy.retryAfter, { seconds: retryIn })}</p>
              </div>
            )}

            <div className="form-field">
              <label htmlFor="name">{copy.name}</label>
              <input
                type="text"
                id="name"
                name="name"
                value={formValues.name}
                placeholder={copy.namePlaceholder}
                disabled={isAuthenticatedContact}
                onChange={(event) => updateField("name", event.target.value)}
                aria-invalid={fieldErrors.name ? "true" : undefined}
                aria-describedby={fieldErrors.name ? "name-error" : undefined}
              />
              {fieldErrors.name && <p className="field-error" id="name-error">{fieldErrors.name}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="email">{copy.email}</label>
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
              <label htmlFor="phone">{copy.phone}</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={formValues.phone}
                placeholder={copy.phonePlaceholder}
                disabled={isAuthenticatedContact}
                onChange={(event) => updateField("phone", event.target.value)}
                aria-invalid={fieldErrors.phone ? "true" : undefined}
                aria-describedby={fieldErrors.phone ? "phone-error" : undefined}
              />
              {fieldErrors.phone && <p className="field-error" id="phone-error">{fieldErrors.phone}</p>}
            </div>

            <div className="form-field">
              <label htmlFor="message">{copy.message}</label>
              <textarea
                id="message"
                name="message"
                value={formValues.message}
                placeholder={copy.messagePlaceholder}
                maxLength={CONTACT_MESSAGE_MAX_LENGTH}
                onChange={(event) => updateField("message", event.target.value)}
                aria-invalid={fieldErrors.message ? "true" : undefined}
                aria-describedby={fieldErrors.message ? "message-error" : undefined}
              ></textarea>
              {fieldErrors.message && <p className="field-error" id="message-error">{fieldErrors.message}</p>}
            </div>

            <button type="submit" disabled={submitting || retryIn > 0}>
              {submitting ? copy.submitting : copy.submit}
            </button>
          </form>

          <aside className="contact-info" aria-label={copy.infoAria}>
            <h2>{copy.contacts}</h2>
            <p><strong>{copy.cityLabel}:</strong> {copy.city}</p>
            <p><strong>{copy.addressLabel}:</strong> {copy.address}</p>
            <p><strong>{copy.phoneLabel}:</strong> +359 988 335 555</p>
            <p><strong>{copy.emailLabel}:</strong> office@eksait.com</p>
          </aside>
        </div>

        <section className="contact-map" aria-label={copy.mapAria}>
          <div className="contact-map-header">
            <span className="contact-kicker">{copy.location}</span>
            <h2>{copy.mapTitle}</h2>
          </div>

          <div className="map-frame">
            <iframe
              title={copy.iframeTitle}
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
