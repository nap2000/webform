// Vendored from openrosa-xpath-evaluator v2.0.13 (Apache-2.0).
// Original: https://github.com/enketo/openrosa-xpath-evaluator
// Modified for Smap — see Start smap / End smap markers for changes.

function _random13chars() {
  return Math.random().toString(16).substring(2);
}

function randomToken(length) {
  var loops = Math.ceil(length / 13);
  return new Array(loops)
    .fill(_random13chars)
    .reduce((string, func) => {
      return string + func();
    }, '').substring(0, length);
}

module.exports = {
  randomToken
};
