export const normalizePhoneNumber = (value) => String(value || '').trim();

export const isValidPhoneNumber = (value) => {
  const phone = normalizePhoneNumber(value);
  const digits = phone.replace(/\D/g, '');
  return /^[+]?[-\d\s().]+$/.test(phone) && digits.length >= 8 && digits.length <= 15;
};
