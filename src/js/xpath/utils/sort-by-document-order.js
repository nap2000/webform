// Vendored from openrosa-xpath-evaluator v2.0.13 (Apache-2.0).
// Original: https://github.com/enketo/openrosa-xpath-evaluator
// Modified for Smap — see Start smap / End smap markers for changes.

module.exports = function(ir) {
  if(ir.ordrd) return;
  ir.v.sort(byDocumentOrder);
};

function byDocumentOrder(a, b) {
  var compare = a.compareDocumentPosition(b);
  if(compare & Node.DOCUMENT_POSITION_PRECEDING) {
    return 1;
  }
  if(compare & Node.DOCUMENT_POSITION_FOLLOWING) {
    return -1;
  }
  return 0;
}
