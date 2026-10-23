const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function isValidEmail(value: string) {
  return EMAIL_REGEX.test(value);
}

export function getEmailFeedback(value: string): { valid: boolean; message: string } | null {
  if (!value) return null;

  return isValidEmail(value)
    ? { valid: true, message: "Format email valid." }
    : { valid: false, message: "Format email belum valid." };
}
