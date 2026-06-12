import { translate } from "./language";

export function getPhoneError(language) {
  return translate("validation.phone", language);
}

export const PHONE_ERROR = getPhoneError();
export const PHONE_PATTERN = "0[0-9]{9}";

export function normalizePhone(value) {
  return String(value || "").replace(/\s+/g, "");
}

export function isValidPhone(value, { required = false } = {}) {
  const phone = normalizePhone(value);

  if (!phone) {
    return !required;
  }

  return /^0\d{9}$/.test(phone);
}
