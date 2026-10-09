/**
 * Phone Number Normalization and Validation Utilities
 * Project: NDC Alumni Network
 *
 * Normalizes Bangladeshi and international phone numbers to canonical E.164 (+8801XXXXXXXXX).
 * Mobile numbers serve as an alternative login identifier, NOT a verified identity.
 */

export interface PhoneNormalizationResult {
  formatted: string;
  digitsOnly: string;
  isValid: boolean;
  isBD: boolean;
  error?: string;
}

/**
 * Normalizes any Bangladeshi or international phone number to canonical E.164.
 *
 * Bangladeshi Mobile Operators (11 digits):
 *   013, 017 -> Grameenphone / Skitto
 *   014, 019 -> Banglalink
 *   015      -> Teletalk
 *   016, 018 -> Robi / Airtel
 *
 * Acceptable formats for BD:
 *   - 017XXXXXXXX     (11 digits) -> +88017XXXXXXXX
 *   - +88017XXXXXXXX  (14 chars)  -> +88017XXXXXXXX
 *   - 88017XXXXXXXX   (13 digits) -> +88017XXXXXXXX
 *   - 17XXXXXXXX      (10 digits) -> +88017XXXXXXXX
 *   - With hyphens/spaces (e.g. 017-XXXX-XXXX)
 */
export function normalizePhoneNumber(raw: string): PhoneNormalizationResult {
  if (!raw || typeof raw !== 'string') {
    return { formatted: '', digitsOnly: '', isValid: false, isBD: false, error: 'Mobile number is required.' };
  }

  const trimmed = raw.trim();
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (!digitsOnly) {
    return { formatted: '', digitsOnly: '', isValid: false, isBD: false, error: 'Mobile number must contain digits.' };
  }

  // Case 1: Standard 13-digit BD format starting with 8801
  if (digitsOnly.startsWith('8801') && digitsOnly.length === 13) {
    const operator = digitsOnly.charAt(4);
    if ('3456789'.includes(operator)) {
      return {
        formatted: `+${digitsOnly}`,
        digitsOnly,
        isValid: true,
        isBD: true,
      };
    }
    return {
      formatted: `+${digitsOnly}`,
      digitsOnly,
      isValid: false,
      isBD: true,
      error: 'Invalid Bangladesh mobile operator prefix. Must start with 013-019.',
    };
  }

  // Case 2: Standard 11-digit local BD format starting with 01
  if (digitsOnly.startsWith('01') && digitsOnly.length === 11) {
    const operator = digitsOnly.charAt(2);
    if ('3456789'.includes(operator)) {
      return {
        formatted: `+88${digitsOnly}`,
        digitsOnly: `88${digitsOnly}`,
        isValid: true,
        isBD: true,
      };
    }
    return {
      formatted: `+88${digitsOnly}`,
      digitsOnly: `88${digitsOnly}`,
      isValid: false,
      isBD: true,
      error: 'Invalid Bangladesh mobile operator prefix. Must start with 013-019.',
    };
  }

  // Case 3: 10-digit BD format starting with 1 (missing leading 0)
  if (digitsOnly.startsWith('1') && digitsOnly.length === 10) {
    const operator = digitsOnly.charAt(1);
    if ('3456789'.includes(operator)) {
      return {
        formatted: `+880${digitsOnly}`,
        digitsOnly: `880${digitsOnly}`,
        isValid: true,
        isBD: true,
      };
    }
  }

  // Case 4: International number starting with +
  if (trimmed.startsWith('+') && digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    return {
      formatted: `+${digitsOnly}`,
      digitsOnly,
      isValid: true,
      isBD: digitsOnly.startsWith('880'),
    };
  }

  // Case 5: International digits without + (7 to 15 digits)
  if (digitsOnly.length >= 7 && digitsOnly.length <= 15) {
    // If it looks like a mistyped BD number with wrong length:
    if (digitsOnly.startsWith('01') && digitsOnly.length !== 11) {
      return {
        formatted: trimmed,
        digitsOnly,
        isValid: false,
        isBD: true,
        error: `Bangladeshi mobile numbers must be exactly 11 digits (entered ${digitsOnly.length} digits).`,
      };
    }

    return {
      formatted: `+${digitsOnly}`,
      digitsOnly,
      isValid: true,
      isBD: digitsOnly.startsWith('880'),
    };
  }

  return {
    formatted: trimmed,
    digitsOnly,
    isValid: false,
    isBD: false,
    error: 'Invalid phone number format. Please check the digits.',
  };
}

/**
 * Formats a phone number to standard E.164. Returns fallback if unparseable.
 */
export function formatToE164Phone(raw: string): string {
  const res = normalizePhoneNumber(raw);
  return res.isValid ? res.formatted : raw.trim();
}

/**
 * Returns canonical search variants for matching in the database
 */
export function getPhoneSearchVariants(raw: string): string[] {
  const norm = normalizePhoneNumber(raw);
  const variants = new Set<string>();
  const trimmed = raw.trim();
  const digits = raw.replace(/\D/g, '');

  if (trimmed) variants.add(trimmed);
  if (norm.formatted) variants.add(norm.formatted);

  if (norm.isBD && norm.formatted.startsWith('+880')) {
    const local11 = '0' + norm.formatted.slice(4); // 017...
    const full13 = norm.formatted.slice(1);        // 88017...
    const local10 = norm.formatted.slice(4);       // 17...
    variants.add(local11);
    variants.add(full13);
    variants.add(local10);
  }

  if (digits) {
    variants.add(digits);
    if (!digits.startsWith('+')) variants.add(`+${digits}`);
  }

  return Array.from(variants);
}
