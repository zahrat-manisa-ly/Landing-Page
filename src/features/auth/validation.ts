export type CustomerIdentifier = { email: string } | { phone_number: string };

export function customerIdentifier(value: string): CustomerIdentifier | null {
  const input = value.trim();
  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input)) return { email: input };
  if (/^\+?[1-9]\d{7,14}$/.test(input)) return { phone_number: input };
  return null;
}

export function validPassword(value: string): boolean {
  return value.length >= 8 && value.length <= 256;
}

export function validOtp(value: string): boolean {
  return /^[A-Za-z0-9]{4,10}$/.test(value.trim());
}
