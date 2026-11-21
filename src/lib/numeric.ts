/*
 * Number parsing for `numeric` questions. Accepts what a programmer would type:
 * decimals, negatives, fractions (3/8), scientific notation (1.5e9), hexadecimal (0x1F),
 * binary (0b1011) and octal (0o17), with optional _ or ' digit separators and spaces.
 */

export function parseNumber(input: string | number, base?: 2 | 16): number {
  if (typeof input === 'number') return input;
  let s = input.trim().replace(/[_'\s]/g, '').replace(/−/g, '-');
  // Thousands separators: "16,777,217" is one number.
  if (/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(s)) s = s.replace(/,/g, '');
  if (!s) return NaN;
  let sign = 1;
  if (s[0] === '-' || s[0] === '+') {
    if (s[0] === '-') sign = -1;
    s = s.slice(1);
  }
  // When the question asks for hex or binary, bare digits ("7fffe038", "1011") are read in that base.
  if (base === 16 && /^[0-9a-f]+$/i.test(s)) return sign * parseInt(s, 16);
  if (base === 2 && /^[01]+$/.test(s)) return sign * parseInt(s, 2);
  let m: RegExpMatchArray | null;
  if ((m = /^0x([0-9a-f]+)$/i.exec(s))) return sign * parseInt(m[1], 16);
  if ((m = /^0b([01]+)$/i.exec(s))) return sign * parseInt(m[1], 2);
  if ((m = /^0o([0-7]+)$/i.exec(s))) return sign * parseInt(m[1], 8);
  if ((m = /^(\d+(?:\.\d*)?|\.\d+)\/(\d+(?:\.\d*)?|\.\d+)$/.exec(s))) {
    const d = Number(m[2]);
    return d === 0 ? NaN : (sign * Number(m[1])) / d;
  }
  if (/^(\d+(?:\.\d*)?|\.\d+)(e[-+]?\d+)?$/i.test(s)) return sign * Number(s);
  return NaN;
}

/** True when `typed` equals any accepted value within the tolerance. */
export function numberMatches(typed: string, accepted: (number | string)[], tolerance = 0, base?: 2 | 16): boolean {
  // With a base, bare digits may be meant in that base or in decimal: accept either reading.
  const readings = [parseNumber(typed, base), parseNumber(typed)].filter(Number.isFinite);
  if (readings.length === 0) return false;
  return accepted.some((a) => {
    const t = parseNumber(a);
    if (!Number.isFinite(t)) return false;
    // Integers must match exactly (unless a tolerance is given); non-integers allow float noise.
    const tol = tolerance > 0 ? tolerance : Number.isInteger(t) ? 0 : 1e-9 * Math.max(1, Math.abs(t));
    return readings.some((v) => Math.abs(v - t) <= tol);
  });
}
