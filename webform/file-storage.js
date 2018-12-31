/**
 * Simple file manager with cross-browser support. That uses the FileReader
 * to create previews. Can be replaced with a more advanced version that
 * obtains files from storage.
 *
 * The replacement should support the same public methods and return the same
 * types.
 */

if ( typeof exports === 'object' && typeof exports.nodeName !== 'string' && typeof define !== 'function' ) {
    var define = function( factory ) {
        factory( require, exports, module );
    };
}

//define( [ "wfapp/q", "jquery" ], function( Q, $ ) {
define( function( require, exports, module ) {
    "use strict";

    var Q = require('./q');
    var $ = require( 'jquery' );
    var utils = require ( '../src/js/utils');

    var FM_STORAGE_PREFIX = "fs::";

    var maxSize,
        currentQuota = null,
        currentQuotaUsed = null,
        currentDir,
        filesystemReady,
        fs,
        DEFAULTBYTESREQUESTED = 100 * 1024 * 1024;

    var supported = typeof FileReader !== 'undefined';

    // Check for support for file systems API (Chrome only)
    /*
     window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
     window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;
     fileStorageSupported = ( typeof window.requestFileSystem !== 'undefined' && typeof window.resolveLocalFileSystemURL !== 'undefined' && typeof navigator.webkitPersistentStorage !== 'undefined' );
     */

    /**
     * Initialize the file manager .
     * @return {[type]} promise boolean or rejection with Error
     */
    function init() {
        var deferred = Q.defer();

        // Initialise fileSystem storage if it is supported
        if (supported) {
            deferred.resolve(true);
        } else {
            deferred.reject(new Error('FileReader not supported.'));
        }

        return deferred.promise;
    }

    /**
     * Whether filemanager is supported in browser
     * @return {Boolean}
     */
    function isSupported() {
        return supported;
    }

    /**
     * Whether the filemanager is waiting for user permissions
     * @return {Boolean} [description]
     */
    function isWaitingForPermissions() {
        return false;
    }


    /**
     * Whether the file is too large too handle and should be rejected
     * @param  {[type]}  file the File
     * @return {Boolean}
     */
    function _isTooLarge(file) {
        return file && file.size > _getMaxSize();
    }

    /**
     * Returns the maximum size of a file
     * @return {Number}
     */
    function _getMaxSize() {
        if (!maxSize) {
            maxSize = $(document).data('maxSubmissionSize') || 100 * 1024 * 1024;
        }
        return maxSize;
    }

    /*
     * Functions for managing storage of media files
     */
    /**
     * Deletes all stored files
     */
    function deleteAllAttachments () {

        console.log("delete all local storage");

        for (var key in localStorage){
            if(key.startsWith(FM_STORAGE_PREFIX)) {
                var item = localStorage.getItem(key);
                if(item) {
                    console.log("Revoke URL: " + item);
                    window.URL.revokeObjectURL(item);
                }
                console.log("Delete item: " + key);
                localStorage.removeItem(key);
            }
        }
    };

    function getAllAttachments () {
        var files = [];
        for (var key in localStorage) {
            if (key.startsWith(FM_STORAGE_PREFIX)) {
                files.push(key);
            }
        }
        return files;
    }


    function getCurrentQuota() {
        return currentQuota;
    };

    function getCurrentQuotaUsed() {
        return currentQuotaUsed;
    };

    /**
     * generic error handler
     * @param  {(Error|FileError|string)=} e [description]
     */
    function errorHandler(e) {
        var msg = '';

        if (typeof e !== 'undefined') {
            switch (e.code) {
                case window.FileError.QUOTA_EXCEEDED_ERR:
                    msg = 'QUOTA_EXCEEDED_ERR';
                    break;
                case window.FileError.NOT_FOUND_ERR:
                    msg = 'NOT_FOUND_ERR';
                    break;
                case window.FileError.SECURITY_ERR:
                    msg = 'SECURITY_ERR';
                    break;
                case window.FileError.INVALID_MODIFICATION_ERR:
                    msg = 'INVALID_MODIFICATION_ERR';
                    break;
                case window.FileError.INVALID_STATE_ERR:
                    msg = 'INVALID_STATE_ERR';
                    break;
                default:
                    msg = 'Unknown Error';
                    break;
            }
        }
        console.log('Error occurred: ' + msg);
        //if ( typeof console.trace !== 'undefined' ) console.trace();
    };

    /**
     * Deletes a complete directory with all its contents
     * @param {string}                                  name        name of directory
     * @param {{success: Function, error: Function}}    callbacks   callback functions (error, and success)
     */
    function deleteDir(name) {

        if(typeof name !== "undefined") {
            console.log("delete directory: " + name);

            for (var key in localStorage) {
                if (key.startsWith(FM_STORAGE_PREFIX + "/" + name)) {

                    var item = localStorage.getItem(key);
                    if(item) {
                        console.log("Revoke URL: " + item);
                        window.URL.revokeObjectURL(item);
                    }
                    console.log("Delete item: " + key);
                    localStorage.removeItem(key);
                }
            }
        }
    };

    /**
     * Saves a file (synchronously) in the directory provided upon initialization
     * @param  {File}                       file      File object from input field
     * @param  {Object.<string, Function>}  callbacks callback functions (error, and success)
     */
    function saveFile(media, dirname) {

        console.log("save file: " + media.name + " : " + dirname);
        try {
            //localStorage.setItem(FM_STORAGE_PREFIX + dirname + "/" + media.name, media.dataUrl );
            var objectUrl = window.URL.createObjectURL(media);
            console.log("^^^^^^^^^^^ " + objectUrl);
            localStorage.setItem(FM_STORAGE_PREFIX + dirname + "/" + media.name, objectUrl);
        }
        catch(err) {
             alert("Error: " + err.message);
        }

    };

    /**
     * Obtains specified files from a specified directory (asynchronously)
     * @param {string}                              directoryName   directory to look in for files
     * @param {{newName: string, fileName: string}} file           object of file properties
     */
    function retrieveFile(dirname, file) {

        var deferred = Q.defer();
        var updatedFile = {
            fileName: file.fileName
        };

        var key = FM_STORAGE_PREFIX + "/" + dirname + "/" + file.fileName;
        var objectUrl = localStorage.getItem( key );
        var blob;

        var xhr = new XMLHttpRequest();
        xhr.open('GET', objectUrl, true);
        xhr.responseType = 'blob';
        xhr.onreadystatechange = function(e) {

            if (xhr.readyState !== 4) {
                return;
            }

            if (this.status == 200) {
                updatedFile.blob = this.response;
                updatedFile.size = this.response.size;
                deferred.resolve(updatedFile);
            } else {
                deferred.resolve(updatedFile);
            }
        };
        xhr.send(null);

        return deferred.promise;

    };


    /*
     * **********************************************
     * End Media Storage Functions
     * **********************************************
     */
    module.exports = {
        isSupported: isSupported,
        isWaitingForPermissions: isWaitingForPermissions,
        init: init,
        deleteAllAttachments: deleteAllAttachments,
        deleteDir: deleteDir,
        getCurrentQuota: getCurrentQuota,
        getCurrentQuotaUsed: getCurrentQuotaUsed,
        saveFile: saveFile,
        getAllAttachments: getAllAttachments,
        retrieveFile: retrieveFile
    };

} );
