const VALID_FLAGS = ['R', 'F', 'G', 'L', 'N', 'C', 'T', 'NS', 'NC', 'QSA', 'NE', 'PT', 'S', 'E', 'H', 'P'];

/**
 * Splits a string on a delimiter but respects backslash escaping.
 * Only used when the raw directive needs to be separated from flags.
 */
function splitUnescaped(str, delimiter) {
  const parts = [];
  let current = '';
  let i = 0;
  while (i < str.length) {
    const ch = str[i];
    if (ch === '\\' && i + 1 < str.length) {
      current += ch + str[i + 1];
      i += 2;
      continue;
    }
    if (ch === delimiter) {
      parts.push(current);
      current = '';
      i++;
      continue;
    }
    current += ch;
    i++;
  }
  parts.push(current);
  return parts;
}

/**
 * Parses a mod_rewrite RewriteRule directive string into a structured object.
 *
 * Apache mod_rewrite RewriteRule syntax:
 *   RewriteRule Pattern Substitution [flags]
 *
 * The Pattern and Substitution are separated by whitespace. Flags are optional
 * and enclosed in square brackets, comma-separated. The directive keyword
 * (RewriteRule, case-insensitive) is optional in the input — if present it is
 * stripped; if absent the input is treated as the rule body directly.
 *
 * Why allow the keyword to be optional: many config-management contexts store
 * just the rule portion (Pattern Substitution [flags]) without the directive
 * prefix, and a single parser should accept both forms.
 */
export function parseRewriteRule(input) {
  if (typeof input !== 'string') {
    throw new TypeError('Input must be a string');
  }

  let trimmed = input.trim();
  if (trimmed === '') {
    throw new Error('Input cannot be empty');
  }

  // Strip the directive keyword if present. Case-insensitive, as Apache config
  // directives are case-insensitive in practice.
  const kwMatch = trimmed.match(/^RewriteRule\s*/i);
  if (kwMatch) {
    trimmed = trimmed.slice(kwMatch[0].length);
  }
  if (trimmed === '') {
    throw new Error('Directive has no rule body');
  }

  const parts = trimmed.trim().split(/\s+/);
  if (parts.length < 2) {
    throw new Error('RewriteRule requires at least a pattern and a substitution');
  }

  const pattern = parts[0];

  // The remainder may contain the substitution followed by [flags].
  // We reconstruct the rest and find the first unescaped '[' at a token boundary.
  let remainder = parts.slice(1).join(' ');

  let substitution = remainder;
  let flagsRaw = '';

  const flagBracket = remainder.search(/\[/);
  if (flagBracket !== -1) {
    const closing = remainder.lastIndexOf(']');
    if (closing === -1 || closing < flagBracket) {
      throw new Error('Unclosed flag bracket');
    }
    substitution = remainder.slice(0, flagBracket).trim();
    flagsRaw = remainder.slice(flagBracket + 1, closing);
  }

  if (substitution === '') {
    throw new Error('Substitution cannot be empty');
  }

  const flags = parseFlags(flagsRaw);

  return {
    pattern,
    substitution,
    flags,
    raw: input,
  };
}

/**
 * Parses the comma-separated flag list from inside the brackets.
 *
 * Each flag may carry an argument after '='. The value is preserved as-is.
 * Returns a Map of flag name to raw string value (empty string if no value).
 *
 * Flags that carry per-flag meaning in the output are returned with their value
 * untouched so the caller can interpret R=302 vs R=301 without ambiguity.
 */
export function parseFlags(flagsRaw) {
  const flags = {};
  if (typeof flagsRaw !== 'string' || flagsRaw.trim() === '') {
    return flags;
  }
  const items = flagsRaw.split(',');
  for (const item of items) {
    const trimmed = item.trim();
    if (trimmed === '') {
      continue;
    }
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx === -1) {
      flags[trimmed] = '';
    } else {
      const name = trimmed.slice(0, eqIdx);
      const value = trimmed.slice(eqIdx + 1);
      flags[name] = value;
    }
  }
  return flags;
}

/**
 * Validates parsed flags against the set of flags Apache mod_rewrite understands.
 * Returns an array of unknown flag names (empty array if all are valid).
 *
 * This is deliberately conservative: Apache has version-specific flags, but this
 * library checks against the common stable set documented in the Apache 2.4
 * manual. Callers can choose to reject unknown flags or warn.
 */
export function validateFlags(flagsObj) {
  const unknown = [];
  for (const name of Object.keys(flagsObj)) {
    if (!VALID_FLAGS.includes(name)) {
      unknown.push(name);
    }
  }
  return unknown;
}
