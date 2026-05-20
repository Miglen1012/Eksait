export const PHONE_ERROR = "Телефонът трябва да започва с 0 и да е точно 10 цифри.";
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
