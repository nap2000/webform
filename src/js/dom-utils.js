/**
 * @module dom-utils
 */

/**
 * Gets siblings that match selector and self _in DOM order_.
 *
 * @static
 * @param {Node} element - Target element.
 * @param {string} selector - A CSS selector.
 * @return {Array<Node>} Array of sibling nodes plus target element.
 */
function getSiblingElementsAndSelf( element, selector ) {
    return _getSiblingElements( element, selector, [ element ] );
}

/**
 * Gets siblings that match selector _in DOM order_.
 *
 * @static
 * @param {Node} element - Target element.
 * @param {string} selector - A CSS selector.
 * @return {Array<Node>} Array of sibling nodes.
 */
function getSiblingElements( element, selector ) {
    return _getSiblingElements( element, selector );
}

/**
 * Gets siblings that match selector _in DOM order_.
 *
 * @param {Node} element - Target element.
 * @param {string} [selector] - A CSS selector.
 * @param {Array<Node>} [startArray] - Array of nodes to start with.
 * @return {Array<Node>} Array of sibling nodes.
 */
function _getSiblingElements( element, selector = '*', startArray = [] ) {
    const siblings = startArray;
    let prev = element.previousElementSibling;
    let next = element.nextElementSibling;

    while ( prev ) {
        if ( prev.matches( selector ) ) {
            siblings.unshift( prev );
        }
        prev = prev.previousElementSibling;
    }

    while ( next ) {
        if ( next.matches( selector ) ) {
            siblings.push( next );
        }
        next = next.nextElementSibling;
    }
    return siblings;
}

/**
 * Gets ancestors that match selector _in DOM order_.
 *
 * @static
 * @param {Node} element - Target element.
 * @param {string} [selector] - A CSS selector.
 * @return {Array<Node>} Array of ancestors.
 */
function getAncestors( element, selector = '*' ) {
    const ancestors = [];
    let parent = element.parentElement;

    while ( parent ) {
        if ( parent.matches( selector ) ) {
            // document order
            ancestors.unshift( parent );
        }
        parent = parent.parentElement;
    }

    return ancestors;
}

/**
 * Gets closest ancestor that match selector until the end selector.
 *
 * @static
 * @param {Node} element - Target element.
 * @param {string} filterSelector - A CSS selector.
 * @param {string} endSelector - A CSS selector.
 * @return {Node} Closest ancestor.
 */
function closestAncestorUntil( element, filterSelector, endSelector ) {
    let parent = element.parentElement;
    let found = null;

    while ( parent && !found ) {
        if ( parent.matches( filterSelector ) ) {
            found = parent;
        }
        parent = endSelector && parent.matches( endSelector ) ? null : parent.parentElement;
    }

    return found;
}

/**
 * Removes all children elements.
 *
 * @static
 * @param {Node} element - Target element.
 * @return {undefined}
 */
function empty( element ) {
    [ ...element.children ].forEach( el => el.remove() );
}

/**
 * Adapted from https://stackoverflow.com/a/46522991/3071529
 *
 * A storage solution aimed at replacing jQuerys data function.
 * Implementation Note: Elements are stored in a (WeakMap)[https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/WeakMap].
 * This makes sure the data is garbage collected when the node is removed.
 *
 * @namespace
 */
const elementDataStore = {
    /**
     * @type WeakMap
     */
    _storage: new WeakMap(),
    /**
     * Adds object to element storage. Ensures that element storage exist.
     *
     * @param {Node} element - Target element.
     * @param {string} key - Name of the stored data.
     * @param {object} obj - Stored data.
     */
    put: function( element, key, obj ) {
        if ( !this._storage.has( element ) ) {
            this._storage.set( element, new Map() );
        }
        this._storage.get( element ).set( key, obj );
    },
    /**
     * Return object from element storage.
     *
     * @param {Node} element - Target element.
     * @param {string} key - Name of the stored data.
     * @return {object} Stored data object.
     */
    get: function( element, key ) {
        const item = this._storage.get( element );
        return item ? item.get( key ) : item;
    },
    /**
     * Checkes whether element has given storage item.
     *
     * @param {Node} element - Target element.
     * @param {string} key - Name of the stored data.
     * @return {boolean}
     */
    has: function( element, key ) {
        const item = this._storage.get( element );
        return item && item.has( key );
    },
    /**
     * Removes item from element storage. Removes element storage if empty.
     *
     * @param {Node} element - Target element.
     * @param {string} key - Name of the stored data.
     * @return {object} Removed data object.
     */
    remove: function( element, key ) {
        var ret = this._storage.get( element ).delete( key );
        if ( !this._storage.get( key ).size === 0 ) {
            this._storage.delete( element );
        }
        return ret;
    }
};

export {
    /**
     * @static
     * @see {@link module:dom-utils~elementDataStore|elementDataStore}
     */
    elementDataStore,
    getSiblingElementsAndSelf,
    getSiblingElements,
    getAncestors,
    closestAncestorUntil,
    empty,
};
