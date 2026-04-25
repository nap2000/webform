# Smap Webform

A fork of [Enketo Core](https://github.com/enketo/enketo-core) integrated with the [Smap](https://www.smap.com.au) survey platform. Renders ODK XForms (XML) into interactive HTML forms in the browser, with Smap-specific extensions for offline draft storage, media attachment batching, barcode scanning, and submission to OpenRosa-compatible servers.

## Purpose

Smap Webform is the client-side form engine used by the Smap platform. Unlike vanilla Enketo, forms are not transformed by a local transformer — the Smap server generates the HTML form directly from its own survey definition and injects it into the page as a `surveyData` global. The webform bundle handles all subsequent user interaction: field evaluation, validation, draft management, and submission.

## Architecture

```
app.js                        Entry point — waits for surveyData global, starts controller
webform/
  controller-webform.js       Main controller: form lifecycle, draft recovery, myWork integration
  submit.js                   OpenRosa submission: multipart POST, 10MB batch splitting
  store.js                    LocalStorage wrapper for draft records
  dbstore.js                  IndexedDB for media attachments and logs
  gui.js                      Dialog and UI components
  last-saved.js               Auto-save recovery
src/js/
  form.js                     Enketo Form class (orchestrates evaluation cascade)
  form-model.js               XML model/instance management
  calculate.js, relevant.js,
  required.js, repeat.js ...  Form logic modules
  xpath/                      Vendored openrosa-xpath-evaluator (Apache-2.0)
                              Smap customisations marked // Start smap / // End smap
src/widget/                   36 widget implementations (date, geo, file, barcode, etc.)
build/
  js/
    enketo-bundle.js          Development bundle (unminified)
    bundle.min.js             Production bundle
    zxing-bundle.js           Barcode scanner — loaded on demand only
  css/                        Themes: theme-smap.css, theme-grid.css, webform.css
locales/                      i18next translation files (25 languages)
```

**Form evaluation cascade** (runs on every field change):
calculations → repeat counts → relevance → outputs → itemsets → required → readonly → validation

**Key design decisions:**
- CSS is edited directly in `build/css/` — Sass sources have been removed
- `openrosa-xpath-evaluator` and `leaflet-draw` are vendored in `src/js/` to preserve Smap customisations across npm updates
- The barcode scanner (`@zxing/library`) is split into a separate bundle and loaded on demand to keep the main bundle small

## Development Setup

**Requirements:** Node 24, npm 10+

```sh
git clone https://github.com/nap2000/enketo-core.git webform
cd webform
npm install
```

**Commands:**

```sh
npm run compile        # bundle JS via rollup → build/js/enketo-bundle.js
npm run minify         # minify → build/js/bundle.min.js + build/js/zxing-bundle.min.js
npm start              # static dev server on port 8005 (serves build/)
npm test               # lint + headless Chrome tests (384/393 pass; 9 are pre-existing locale failures)
npm run test:headless  # karma headless only
npm run test:browsers  # Chrome, Firefox, Safari
npm run lint           # ESLint check
npm run lint:fix       # ESLint autofix
```

**Deploy to smapServer** (requires `~/git/prop-smapserver` checked out):

```sh
./dep.sh           # build + minify + copy to prop-smapserver WebContent
./dep.sh develop   # build only (no minify) + copy unminified bundle
```

The smapServer's own `dep.sh` calls `webform/deploy.sh` as part of its full deployment pipeline.

## Integration with smapServer

The webform bundle is served by smapServer. The server:
1. Renders the survey definition into an HTML form and XML model
2. Injects a `surveyData` global with the form HTML, model XML, and submission metadata
3. Loads `webform-bundle.min.js` which picks up `surveyData` and initialises the form

`config.js` contains per-deployment settings (map tile sources, validation behaviour, barcode bundle path). The `package.json` `browser` field maps `enketo/*` module aliases used throughout the source.

## Running Tests

```sh
npm run test:headless     # runs 393 specs in Chrome headless
```

Specs live in `test/spec/`. Tests use Jasmine + Karma + rollup preprocessor. Timezone is forced to `America/Phoenix` for deterministic datetime behaviour — avoid timezone assumptions in new specs.

To run a single test: add `fit` or `fdescribe` to the spec, run `npm run test:headless`, then revert before committing.

## Code Style

ESLint enforced (`.eslintrc.json`). Key rules: 4-space indent, single quotes, semicolons, space in parens `( value )`, JSDoc required for new functions/classes. Run `npm run lint:fix` to auto-correct most issues.

## Acknowledgements

Forked from [enketo/enketo-core](https://github.com/enketo/enketo-core) (Apache-2.0).
Barcode scanning via [@zxing/library](https://github.com/zxing-js/library) (MIT).
Maps via [Leaflet](https://leafletjs.com) + [leaflet-draw](https://github.com/Leaflet/Leaflet.draw) (MIT).
XPath extensions via [openrosa-xpath-evaluator](https://github.com/enketo/openrosa-xpath-evaluator) (Apache-2.0).
