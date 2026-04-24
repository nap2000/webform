# AGENTS

Purpose: quick rules for agents in this repo.

Repo: webform (enketo-core fork).
Branch: main is production2 per README.

No Cursor/Copilot rules found in `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`.

## Setup
Node: 12.22.1 (volta in package.json).
npm: 6.x required; npm 7 not ok (tutorials/20-development.md).
Python: 2.7 required for some tooling (README).
Install deps: `npm install`.
Grunt CLI: `npm install -g grunt-cli`.

## Build
Default build: `grunt` or `npx grunt`.
Compile JS: `grunt compile` (rollup).
CSS: edit `build/css/` directly — Sass sources removed, CSS is the source of truth.
Minify: `grunt minify`.
Docs: `npm run build-docs`.
Docs remove: `npm run remove-docs`.

## Dev server
Start dev: `npm start` (grunt develop).
Server port: 8005.
Base paths: `test/forms`, `test/temp`, `build` (Gruntfile).
Load XForm via `?xform=` or local `/test/forms`.

## Lint
Lint check: `grunt eslint:check`.
Lint fix: `grunt eslint:fix` or `npm run beautify`.
Lint also runs in `grunt test`.

## Tests
All tests: `npm test` (grunt test).
Headless only: `grunt karma:headless`.
All browsers: `npm run test-browsers` or `grunt karma:browsers`.
Coverage output: `test-coverage/`.
Coverage badge writes `README.md` during tests; avoid committing unless release.

## Single test workflow
Preferred: use Jasmine focus.
Use `fit` or `fdescribe` in a spec, run `grunt karma:headless`.
Remember to revert focus before final commit.
Spec location: `test/spec/*.spec.js`.

## Release notes
Docs rebuilt per release only.
Publish flow: `npm run publish-please` (runs tests, lint fix, docs).
Use `npx publish-please --dry-run` to check.

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
CommonJS also used in build/test files.
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

## CSS/Sass
CSS: edit `build/css/` directly. No Sass — sources were removed.
Themes: `plain`, `grid`, `formhub` (see tutorials).
Consider touch vs non-touch, page modes, RTL, print, repeats, sizes.

## Assets/build outputs
Build outputs: `build/js`, `build/css`.
Do not commit generated docs except release.

## Common files
Entry: `src/js/form.js`.
Config shim: `config.js` mapped in package.json browser field.
Karma config: `test/karma.conf.js`.
ESLint configs: `.eslintrc.json`, `test/.eslintrc.json`.

## Agent tips
Use `npx grunt` if global grunt missing.
Node 12 only; newer npm can break installs.
If tests fail on coverage badge, avoid committing README changes.

## Quick command list
`npm install`
`npm start`
`grunt`
`grunt compile`
`grunt css`
`grunt test`
`grunt karma:headless`
`grunt karma:browsers`
`grunt eslint:check`
`grunt eslint:fix`
`npm run build-docs`
`npm run publish-please`

## File locations
JS core: `src/js/`.
Widgets: `src/widget/`.
Tests: `test/spec/`, `test/mock/`, `test/forms/`.
CSS: `build/css/`.
Build: `build/`.

## Do not do
Do not run destructive git commands.
Do not commit auto-gen docs unless release.
Do not leave focused tests in specs.

## When adding code
Follow ESLint; run `grunt eslint:check`.
Add/adjust tests when behavior changes.
Update changelog only if asked.

## Notes
Repo is enketo-core fork; follow upstream patterns.
Keep changes small, minimal churn.
