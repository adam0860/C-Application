/*
 * Number parsing for `numeric` questions. Accepts what a programmer would type:
 * decimals, negatives, fractions (3/8), scientific notation (1.5e9), hexadecimal (0x1F),
 * binary (0b1011) and octal (0o17), with optional _ or ' digit separators and spaces.
 */

export function parseNumber(input: string | number): number {
  if (typeof input === 'number') return input;
  let s = input.trim().replace(/[_'\s]/g, '').replace(/−/g, '-');
  if (!s) return NaN;
  let sign = 1;
  if (s[0] === '-' || s[0] === '+') {
    if (s[0] === '-') sign = -1;
    s = s.slice(1);
  }
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
export function numberMatches(typed: string, accepted: (number | string)[], tolerance = 0): boolean {
  const v = parseNumber(typed);
  if (!Number.isFinite(v)) return false;
  return accepted.some((a) => {
    const t = parseNumber(a);
    if (!Number.isFinite(t)) return false;
    const tol = Math.max(tolerance, 1e-9 * Math.max(1, Math.abs(t)));
    return Math.abs(v - t) <= tol;
  });
}
