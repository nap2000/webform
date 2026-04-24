# AGENTS

Purpose: quick rules for agents in this repo.

Repo: webform (enketo-core fork).
Branch: main.

## Setup
Node: 24 (volta in package.json).
Install deps: `npm install`.

## Build
Compile JS: `npm run compile` (rollup → `build/js/enketo-bundle.js`).
Minify: `npm run minify` (terser → `build/js/bundle.min.js`).
Deploy: `./dep.sh` (minified) or `./dep.sh develop` (unminified).
Docs: `npm run build-docs`.

## Dev server
Start: `npm start` (http-server on port 8005, serves `build/`).

## Lint
Lint check: `npm run lint`.
Lint fix: `npm run lint:fix` or `npm run beautify`.

## Tests
All tests: `npm test` (lint + headless karma).
Headless only: `npm run test:headless`.
All browsers: `npm run test:browsers`.
Coverage output: `test-coverage/`.

## Single test workflow
Use Jasmine focus: add `fit` or `fdescribe` in a spec, run `npm run test:headless`.
Revert focus before final commit.
Spec location: `test/spec/*.spec.js`.

## Code style (ESLint + EditorConfig)
Indent: 4 spaces; no tabs.
Line endings: LF.
Final newline required.
Trim trailing whitespace.
Quotes: single.
Semicolons: required.
Space before function paren: none (`function foo()` not `function foo ()`).
Space in parens: required (`( value )`).
Array bracket spacing: `[ a, b ]`.
Object curly spacing: `{ a: 1 }`.
Space around operators: required.
Blank line before `return` (warn).
No implied eval.
Console: warn; allow `console.error`, `console.deprecate`, `console.warn`.

## JS modules/imports
ES modules allowed; parser sourceType module.
CommonJS also used in build/test files (vendored xpath/ and karma config).
Keep import order: standard libs, external deps, local modules.
One import per module; no wildcard unless needed.

## Types and docs
JSDoc required for new functions/classes.
JSDoc rules enabled: param/return names/types/checks.
Prefer explicit return docs.

## Naming
Use lowerCamel for vars/functions.
Use UpperCamel for classes.
Use UPPER_SNAKE for constants.
Keep filenames lower/kebab when existing.

## Error handling
Prefer early returns and explicit errors.
Use `throw new Error( message )` for sync failures.
Avoid silent catch; log or rethrow.

## Tests style
Jasmine specs in `test/spec/`.
Use `describe`/`it`; keep deterministic, no random.
TZ forced to America/Phoenix in karma; avoid time zone assumptions.

## CSS
CSS: edit `build/css/` directly. No Sass — sources were removed.
Themes: `theme-smap.css`, `theme-grid.css`, `webform.css` (and `.print` variants).
Consider touch vs non-touch, page modes, RTL, print, repeats, sizes.

## Assets/build outputs
Build outputs: `build/js`, `build/css`.
Do not commit generated docs except release.

## Common files
Entry: `src/js/form.js`.
Config shim: `config.js` mapped in package.json browser field.
Karma config: `test/karma.conf.js`.
ESLint configs: `.eslintrc.json`, `test/.eslintrc.json`.
XPath (vendored): `src/js/xpath/` — do not update from npm.

## Quick command list
`npm install`
`npm run compile`
`npm run minify`
`npm start`
`npm test`
`npm run test:headless`
`npm run test:browsers`
`npm run lint`
`npm run lint:fix`
`npm run build-docs`

## File locations
JS core: `src/js/`.
Widgets: `src/widget/`.
Tests: `test/spec/`, `test/helpers/`.
CSS: `build/css/`.
Build: `build/`.

## Do not do
Do not run destructive git commands.
Do not commit auto-gen docs unless release.
Do not leave focused tests in specs.
Do not run `npm update` (vendored xpath customisations in `src/js/xpath/`).

## When adding code
Follow ESLint; run `npm run lint`.
Add/adjust tests when behaviour changes.
Update changelog only if asked.

## Notes
Repo is enketo-core fork; follow upstream patterns.
Keep changes small, minimal churn.
