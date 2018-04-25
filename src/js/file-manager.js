'use strict';
/**
 * Simple file manager with cross-browser support. That uses the FileReader
 * to create previews. Can be replaced with a more advanced version that
 * obtains files from storage.
 *
 * The replacement should support the same public methods and return the same
 * types.
 */

var Promise = require( 'lie' );
var $ = require( 'jquery' );
var utils = require( './utils' );
var fileManager = {};
var t = require( 'enketo/translator' ).t;

var supported = typeof FileReader !== 'undefined',
    notSupportedAdvisoryMsg = '';

/**
 * Initialize the file manager .
 * @return {[type]} promise boolean or rejection with Error
 */
fileManager.init = function() {
    if ( supported ) {
        return Promise.resolve( true );
    } else {
        return Promise.reject( new Error( 'FileReader not supported.' ) );
    }
}

/**
 * Whether filemanager is supported in browser
 * @return {Boolean}
 */
fileManager.isSupported = function() {
    return supported;
}

/**
 * Whether the filemanager is waiting for user permissions
 * @return {Boolean} [description]
 */
fileManager.isWaitingForPermissions = function() {
    return false;
}

/**
 * Obtains a URL that can be used to show a preview of the file when used
 * as a src attribute.
 *
 * It is meant for media previews and media downloads.
 *
 * @param  {?string|Object} subject File or filename in local storage
 * @return {[type]}         promise url string or rejection with Error
 */
fileManager.getFileUrl = function( subject ) {
    return new Promise( function( resolve, reject ) {
        var error, reader;
        if ( !subject ) {
            resolve( null );
        } else if ( typeof subject === 'string' ) {
            // start smap
            var dirname = window.gLoadedInstanceID;
            var file = {
                fileName: subject
            }
            store.retrieveFile(dirname, file);   // Attempt to get a saved file first
            if (file.dataUrl) {
                resolve(file.dataUrl);
            } else {
                resolve(location.origin + "/" + subject);		// URL must be from the server
            }
            // end smap
        } else if ( typeof subject === 'object' ) {
            if ( fileManager.isTooLarge( subject ) ) {
                error = new Error( t( 'filepicker.toolargeerror', { maxSize: fileManager.getMaxSizeReadable() } ) );
                reject( error );
            } else {
                reader = new FileReader();
                reader.onload = function( e ) {
                    resolve( e.target.result );
                };
                reader.onerror = function( e ) {
                    reject( error );
                };
                reader.readAsDataURL( subject );
            }
        } else {
            reject( new Error( 'Unknown error occurred' ) );
        }
    } );
};

/**
 * Similar to getFileURL, except that this one is guaranteed to return an objectURL
 *
 * It is meant for loading images into a canvas.
 *
 * @param  {?string|Object} subject File or filename in local storage
 * @return {[type]}         promise url string or rejection with Error
 */
fileManager.getObjectUrl = function( subject ) {
    return fileManager.getFileUrl( subject )
        .then( function( url ) {
            if ( /https?:\/\//.test( url ) ) {
                return fileManager.urlToBlob( url ).then( URL.createObjectURL );
            }
            return url;
        } );
};

fileManager.urlToBlob = function( url ) {
    var xhr = new XMLHttpRequest();

    return new Promise( function( resolve ) {
        xhr.open( 'GET', url );
        xhr.responseType = 'blob';
        xhr.onload = function() {
            resolve( xhr.response );
        };
        xhr.send();
    } );
};

/**
 * Obtain files currently stored in file input elements of open record
 * @return {[File]} array of files
 */
fileManager.getCurrentFiles = function() {
    var files = [];

    // Get any files inside file input elements or text input elements for drawings.
    $( 'form.or' ).find( 'input[type="file"]:not(.ignore), input[type="text"][data-drawing="true"]' ).each( function() {
        var newFilename;
        var file;
        var canvas = null;
        var $media = $( this );                                             // smap
        var $preview = $media.parent().find(".file-preview").find("img");   // smap
            if ( this.type === 'file' ) {
                file = this.files[0];
            } else if ( this.value ) {
                canvas = $(this).closest('.question')[0].querySelector('.draw-widget canvas');
                if (canvas) {
                    // TODO: In the future, we could simply do canvas.toBlob() insteadU
                    file = utils.dataUriToBlobSync(canvas.toDataURL());
                    file.name = this.value;
                }
            }

            if ( file && file.name ) {
                // Correct file names by adding a unique-ish postfix
                // First create a clone, because the name property is immutable
                // TODO: in the future, when browser support increase we can invoke
                // the File constructor to do this.
                newFilename = utils.getFilename( file, this.dataset.filenamePostfix );
                file = new Blob( [ file ], {
                    type: file.type
                } );

                file.name = newFilename;
                file.dataUrl = $preview.attr("src");                         // smap

                files.push( file );
            }
        } );
        return files;
};

/**
 * Placeholder function to check if file size is acceptable.
 *
 * @param  {Blob}  file [description]
 * @return {Boolean}      [description]
 */
fileManager.isTooLarge = function( /*file*/) {
    return false;
};

/**
 * Replace with function that determines max size published in OpenRosa server response header.
 */
fileManager.getMaxSizeReadable = function() {
    return 5 + 'MB';
};

module.exports = fileManager;
