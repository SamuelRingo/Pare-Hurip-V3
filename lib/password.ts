const PASSWORD_RULES: { test: (value: string) => boolean; label: string }[] = [
  { test: (value) => value.length >= 8, label: "minimal 8 karakter" },
  { test: (value) => /[a-z]/.test(value), label: "huruf kecil" },
  { test: (value) => /[A-Z]/.test(value), label: "huruf kapital" },
  { test: (value) => /\d/.test(value), label: "angka" },
  { test: (value) => /[^A-Za-z0-9]/.test(value), label: "karakter khusus" },
];

export function isStrongPassword(value: string) {
  return PASSWORD_RULES.every((rule) => rule.test(value));
}

export function getPasswordFeedback(value: string): { strong: boolean; message: string } | null {
  if (!value) return null;

  const unmet = PASSWORD_RULES.filter((rule) => !rule.test(value));

  if (unmet.length === 0) {
    return { strong: true, message: "Password kuat." };
  }

  const message =
    unmet.length === 1
      ? `Password belum kuat — butuh ${unmet[0].label}.`
      : `Password belum kuat — butuh: ${unmet.map((rule) => rule.label).join(", ")}.`;

  return { strong: false, message };
}
