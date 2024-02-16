// translator from https://github.com/kobotoolbox/enketo-express
'use strict';

import settings from'./settings';
import i18next from 'i18next' ;
import XHR from 'i18next-xhr-backend' ;

import LanguageDetector from'i18next-browser-languagedetector' ;
var init;
var t;
var localize;
var htmlParagraphsPostProcessor;
var initialize;

// Smap moved to top
t = function( key, options ) {
	return i18next.t( key, options );
};

// The postProcessor assumes that array values with line breaks should be divided into HTML paragraphs.
htmlParagraphsPostProcessor = {
    type: 'postProcessor',
    name: 'htmlParagraphsPostProcessor',
    process: function( value ) {
        var paragraphs = value.split( '\n' );
        return ( paragraphs.length > 1 ) ? '<p>' + paragraphs.join( '</p><p>' ) + '</p>' : value;
    }
};

/**
 * Initializes translator and resolves **when translations have been loaded**.
 *
 * @param  {=*?} something can be anything
 * @return {Promise}       promise resolving the original something argument
 */
init = function( something ) {
    return initialize
        .then( function() {
            return something;
        } );
};
t.init = init;      // smap add to t

initialize = new Promise( function( resolve, reject ) {
    i18next
        .use( XHR )
        .use( LanguageDetector )
        .use( htmlParagraphsPostProcessor )
        .init( {
            whitelist: settings.languagesSupported,
            fallbackLng: 'en',
            joinArrays: '\n',
            backend: {
                //loadPath: settings.basePath + '/locales/__lng__/translation-combined.json',
                loadPath: '/build/locales/__lng__/translation.json',
            },
            load: 'languageOnly',
            lowerCaseLng: true,
            detection: {
                order: [ 'querystring', 'navigator' ],
                lookupQuerystring: 'lang',
                caches: false
            },
            interpolation: {
                prefix: '__',
                suffix: '__'
            },
            postProcess: [ 'htmlParagraphsPostProcessor' ]
        }, function( error ) {
            if ( error ) {
                reject( error );
            } else {
                resolve();
            }
        } );
} );

/**
 * Localizes the descendents of an element based on the data-i18n attribute.
 * Performance-optimized in Chrome (used bench6 form).
 *
 * @param  {Element} Element [description]
 */
localize = function( element ) {
    var i;
    var cache = {};
    var list = element.querySelectorAll( '[data-i18n]' );

    for ( i = 0; i < list.length; i++ ) {
        var el = list[ i ];
        var key = el.dataset.i18n;
        if ( key ) {
            if ( !cache[ key ] ) {
                cache[ key ] = t( key );
            }
            el.textContent = cache[ key ];
        }
    }
};

export { t };

/*
module.exports = {
    init: init,
    t: t,
    localize: localize
};
*/

/**
 * add keys from XSL stylesheets manually
 *
 * t('constraint.invalid');
 * t('constraint.required');
 * t('form.required');
 *
 * // The following 3 are temporary:
 * t('drawwidget.drawing');
 * t('drawwidget.signature');
 * t('drawwidget.annotation');
 */
