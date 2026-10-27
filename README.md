# throughput-rewrite

Converts Apache mod_rewrite `RewriteRule` directive strings into a structured object of flags and substitution patterns.

## Usage

```js
import { parseRewriteRule, parseFlags, validateFlags } from 'throughput-rewrite';

const rule = parseRewriteRule('RewriteRule ^/old/(.*)$ /new/$1 [R=301,L]');
console.log(rule);
// {
//   pattern: '^/old/(.*)$',
//   substitution: '/new/$1',
//   flags: { R: '301', L: '' },
//   raw: 'RewriteRule ^/old/(.*)$ /new/$1 [R=301,L]'
// }

console.log(validateFlags(rule.flags));
// []
```

`parseFlags(flagsRaw)` can be used standalone on the contents of the bracket.
`validateFlags(flagsObj)` returns an array of flag names not recognised by Apache mod_rewrite.

## Why

Inspecting and rewriting mod_rewrite rules programmatically is error-prone when the rules sit in plain config files. This library gives you a parsed view of each `RewriteRule` so you can audit, migrate, or transform them without string-splicing by hand.

The trade-off: this parser does not evaluate the regex pattern or resolve the substitution against a real request. It is a structural translator, not a rewrite engine. If you need to know what a given URL maps to under a rule set, run the rules in Apache — do not rely on this library for request resolution.

## Edge cases

- The directive keyword (`RewriteRule`) is optional in the input. If present it is stripped; if absent the input is treated as the rule body.
- Flag values are preserved verbatim as strings. `R=301` produces `{ R: '301' }`, and a valueless flag like `L` produces `{ L: '' }`.
- A `-` (dash) substitution is passed through unchanged. It means "do not rewrite" in Apache and is significant.
- Unknown flags are not rejected by `parseRewriteRule`. Use `validateFlags` to detect them.
