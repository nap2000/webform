// Vendored from openrosa-xpath-evaluator v2.0.13 (Apache-2.0).
// Original: https://github.com/enketo/openrosa-xpath-evaluator
// Modified for Smap — see Start smap / End smap markers for changes.

/**
 * Internal representations of XPathResults
 */
module.exports = {
  boolean: v => ({ t:'bool', v }),
  number:  v => ({ t:'num',  v }),
  string:  v => ({ t:'str',  v }),
  date:    v => ({ t:'date', v }),
};
