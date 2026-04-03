const EGYPTIAN_PHONE_REGEX = /^0(10|11|12|15)\d{7}$/;

export function isValidEgyptianPhone(phone: string): boolean {
  return EGYPTIAN_PHONE_REGEX.test(phone);
}

export const INVALID_PHONE_MSG =
  "Phone must start with 010, 011, 012, or 015 and be exactly 11 digits";
