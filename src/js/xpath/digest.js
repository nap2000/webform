// Vendored from openrosa-xpath-evaluator v2.0.13 (Apache-2.0).
// Original: https://github.com/enketo/openrosa-xpath-evaluator
// Modified for Smap — see Start smap / End smap markers for changes.

/**
 * XForms 1.1 digest() function.
 * @see https://www.w3.org/TR/xforms/#fn-digest
 */
const { asString } = require('./utils/xpath-cast'); // smap
const { md5, sha1 } = require('@noble/hashes/legacy.js');
const { sha256, sha384, sha512 } = require('@noble/hashes/sha2.js');

const ALGOS = { md5, sha1, sha256, sha384, sha512 };

module.exports = (message, algo, encoding) => {
    // start smap
    message = asString(message);
    algo = asString(algo).toLowerCase();
    // end smap

    encoding = (encoding && encoding.v && encoding.v.toLowerCase()) || 'base64';
    if(!algo || !/^(md5|sha-1|sha-256|sha-384|sha-512)$/.test(algo)) {
        throw new Error('Invalid algo.');
    }
    if(!/^(base64|hex)$/.test(encoding)) {
        throw new Error('Invalid encoding.');
    }

    const hashFn = ALGOS[algo.replace('-', '')];
    const bytes = hashFn(new TextEncoder().encode(message));

    if(encoding === 'hex') {
        return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return btoa(String.fromCharCode(...bytes));
};
