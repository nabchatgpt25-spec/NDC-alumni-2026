// =============================================================================
// ACADEMIC STREAM & GROUP MAPPING UTILITY
// Project: Notre Dame College Alumni Network 2026
// =============================================================================

export interface NormalizedAcademicStreamGroup {
  academicStream: 'Science' | 'Humanities' | 'Business Studies';
  academicGroup: string | null;
}

export const SCIENCE_GROUPS = Array.from({ length: 17 }, (_, i) =>
  String(i + 1).padStart(2, '0')
); // ['01', '02', ..., '17']

export const HUMANITIES_GROUPS = ['G', 'H', 'L', 'W'] as const;

export const BUSINESS_STUDIES_GROUPS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'] as const;

/**
 * Normalizes frontend selection values (e.g., "Science 01", "Humanities G", "Business Studies A")
 * into database-compatible (academic_stream, academic_group) pairs.
 */
export function normalizeAcademicStreamAndGroup(
  rawInput?: string | null
): NormalizedAcademicStreamGroup {
  if (!rawInput || !rawInput.trim()) {
    return {
      academicStream: 'Science',
      academicGroup: null,
    };
  }

  const clean = rawInput.trim();

  // 1. Explicit "Science <num>"
  if (/^science/i.test(clean)) {
    const match = clean.match(/^science\s*(\d{1,2})/i);
    if (match) {
      const code = String(parseInt(match[1], 10)).padStart(2, '0');
      return {
        academicStream: 'Science',
        academicGroup: code,
      };
    }
    return {
      academicStream: 'Science',
      academicGroup: null,
    };
  }

  // 2. Explicit "Humanities <code>"
  if (/^humanities/i.test(clean)) {
    const match = clean.match(/^humanities\s*([ghlw])/i);
    if (match) {
      return {
        academicStream: 'Humanities',
        academicGroup: match[1].toUpperCase(),
      };
    }
    return {
      academicStream: 'Humanities',
      academicGroup: 'G',
    };
  }

  // 3. Explicit "Business Studies <code>" or "Commerce <code>"
  if (/^(business(\s*studies)?|commerce)/i.test(clean)) {
    const match = clean.match(/^(?:business(?:\s*studies)?|commerce)\s*([a-h])/i);
    if (match) {
      return {
        academicStream: 'Business Studies',
        academicGroup: match[1].toUpperCase(),
      };
    }
    return {
      academicStream: 'Business Studies',
      academicGroup: 'A',
    };
  }

  // 4. Standalone group code patterns
  // 4a. Standalone 2-digit or 1-digit number -> Science
  if (/^\d{1,2}$/.test(clean)) {
    const code = String(parseInt(clean, 10)).padStart(2, '0');
    return {
      academicStream: 'Science',
      academicGroup: code,
    };
  }

  // 4b. Standalone G, H, L, W -> Humanities
  if (/^[GHLW]$/i.test(clean)) {
    return {
      academicStream: 'Humanities',
      academicGroup: clean.toUpperCase(),
    };
  }

  // 4c. Standalone A, B, C, D, E, F (or G, H) -> Business Studies
  if (/^[A-F]$/i.test(clean)) {
    return {
      academicStream: 'Business Studies',
      academicGroup: clean.toUpperCase(),
    };
  }

  return {
    academicStream: 'Science',
    academicGroup: null,
  };
}
