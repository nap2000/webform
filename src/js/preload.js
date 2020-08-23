/**
 * Preloader module (soon to be deprecated).
 *
 * @module preloader
 */

import events from '../../src/js/event';
export default {
    /**
     * Initializes preloader
     */
    init() {
        if ( !this.form ) {
            throw new Error( 'Preload module not correctly instantiated with form property.' );
        }

        //these initialize actual preload items
        this.form.view.html.querySelectorAll( 'input[data-preload], select[data-preload], textarea[data-preload]' ).forEach( preloadEl => {
            const props = this.form.input.getProps( preloadEl );
            const item = preloadEl.dataset && preloadEl.dataset.preload ? preloadEl.dataset.preload.toLowerCase() : undefined;
            const param = preloadEl.dataset && preloadEl.dataset.preloadParams ? preloadEl.dataset.preloadParams.toLowerCase() : undefined;

            if ( typeof this[ item ] !== 'undefined' ) {
                const dataNode = this.form.model.node( props.path, props.index );
                // If a preload item is placed inside a repeat with repeat-count 0, the node
                // doesn't exist and will never get a value (which is correct behavior)
                if ( dataNode.getElements().length ) {
                    const curVal = dataNode.getVal();
                    const newVal = this[ item ]( {
                        param,
                        curVal,
                        dataNode
                    } );

                    dataNode.setVal( newVal, props.xmlType );
                }
            } else {
                console.warn( `Preload "${item}" not supported. May or may not be a big deal.` );
            }
        } );
    },
    /**
     * @param {object} o - parameter object
     * @return {string} evaluated value or error message
     */
    'timestamp': function( o ) {
        let value;
        const that = this;
        // when is 'start' or 'end'
        if ( o.param === 'start' ) {
            return ( o.curVal.length > 0 ) ? o.curVal : this.form.model.evaluate( 'now()', 'string' );
        }
        if ( o.param === 'end' ) {
            //set event handler for each save event (needs to be triggered!)
            this.form.view.html.addEventListener( events.BeforeSave().type, () => {
                value = that.form.model.evaluate( 'now()', 'string' );
                o.dataNode.setVal( value, 'datetime' );
            } );

            //TODO: why populate this upon load?
            return this.form.model.evaluate( 'now()', 'string' );
        }

        return 'error - unknown timestamp parameter';
    },
    /**
     * @param {object} o - parameter object
     * @return {string} current value or evaluated value
     */
    'date': function( o ) {
        let today;
        let year;
        let month;
        let day;

        if ( o.curVal.length === 0 ) {
            today = new Date( this.form.model.evaluate( 'today()', 'string' ) );
            year = today.getFullYear().toString().pad( 4 );
            month = ( today.getMonth() + 1 ).toString().pad( 2 );
            day = today.getDate().toString().pad( 2 );

            return `${year}-${month}-${day}`;
        }

        return o.curVal;
    },
    /**
     * @param {object} o - parameter object
     * @return {string} current value or evaluated value
     */
    'property': function( o ) {
        let node;

        // 'deviceid', 'subscriberid', 'simserial', 'phonenumber'
        if ( o.curVal.length === 0 ) {
            node = this.form.model.node( `instance("__session")/session/context/${o.param}` );
            if ( node.getElements().length ) {
                return node.getVal();
            } else {
                return `no ${o.param} property in enketo`;
            }
        }

        return o.curVal;
    },
    /**
     * @param {object} o - parameter object
     * @return {string} current value or evaluated value
     */
    'context': function( o ) {
        // 'application', 'user'??
        if ( o.curVal.length === 0 ) {
            return ( o.param === 'application' ) ? 'enketo' : `${o.param} not supported in enketo`;
        }

        return o.curVal;
    },
    /**
     * @param {object} o - parameter object
     * @return {string} current value or error message
     */
    'patient': function( o ) {
        if ( o.curVal.length === 0 ) {
            return 'patient preload item not supported in enketo';
        }

        return o.curVal;
    },
    /**
     * @param {object} o - parameter object
     * @return {string} current value or error message
     */
    'user': function( o ) {
        if ( o.curVal.length === 0 ) {
            return 'user preload item not supported in enketo yet';
        }

        return o.curVal;
    },
    /**
     * @param {object} o - parameter object
     * @return {string} current value or evaluated value
     */
    'uid': function( o ) {
        if ( o.curVal.length === 0 ) {
            return this.form.model.evaluate( 'concat("uuid:", uuid())', 'string' );
        }

        return o.curVal;
    },
    'instance': function (o) {         // smap - Store instanceID in a global, this may be preset if form is laoded from the store
        if (!gLoadedInstanceID) {
            window.gLoadedInstanceID = ( o.curVal.length > 0 ) ? o.curVal : model.evaluate("concat('uuid:', uuid())", 'string');
        }
        //store the current instanceID as data on the form element so it can be easily accessed by e.g. widgets
        $form.data({
            instanceID: gLoadedInstanceID
        });
        return gLoadedInstanceID;
    }

};
