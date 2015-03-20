/**
 * Simple file manager with cross-browser support. That uses the FileReader
 * to create previews. Can be replaced with a more advanced version that
 * obtains files from storage.
 *
 * The replacement should support the same public methods and return the same
 * types.
 */

define( [ "q", "jquery" ], function( Q, $ ) {
    "use strict";

    var maxSize,
        supported = typeof FileReader !== 'undefined',
        notSupportedAdvisoryMsg = '',
        fileStorageSupported = false,
        currentQuotaUsed = null,
        filesystemReady,
        getFilesystem,
        fs,
        DEFAULTBYTESREQUESTED = 100 * 1024 * 1024;
    
    // Check for support for file systems API (Chrome only)
    window.requestFileSystem = window.requestFileSystem || window.webkitRequestFileSystem;
    window.resolveLocalFileSystemURL = window.resolveLocalFileSystemURL || window.webkitResolveLocalFileSystemURL;
    fileStorageSupported = ( typeof window.requestFileSystem !== 'undefined' && typeof window.resolveLocalFileSystemURL !== 'undefined' && typeof navigator.webkitPersistentStorage !== 'undefined' );


    /**
     * Initialize the file manager .
     * @return {[type]} promise boolean or rejection with Error
     */
    function init() {
        var deferred = Q.defer();

        // Initialise fileSystem storage if it is supported
        if ( fileStorageSupported ) {
            setCurrentQuotaUsed();
            filesystemReady = getFilesystem();
        }
        
        if ( supported ) {
            deferred.resolve( true );
        } else {
            deferred.reject( new Error( 'FileReader not supported.' ) );
        }

        return deferred.promise;
    }

    /**
     * Whether filemanager is supported in browser
     * @return {Boolean}
     */
    function isFileReaderSupported() {
        return supported;
    }
    
    function isFileStorageSupported() {
        return fileStorageSupported;
    }

    /**
     * Whether the filemanager is waiting for user permissions
     * @return {Boolean} [description]
     */
    function isWaitingForPermissions() {
        return false;
    }

    /**
     * Obtains a url that can be used to show a preview of the file when used
     * as a src attribute.
     *
     * @param  {?string|Object} subject File or filename
     * @return {[type]}         promise url string or rejection with Error
     */
    function getFileUrl( subject ) {
        var error, reader,
            deferred = Q.defer();

        if ( !subject ) {
            deferred.resolve( null );
        } else if ( typeof subject === 'string' ) {
        	deferred.resolve( location.origin + "/" + subject );		// Smap show existing URL
        } else if ( typeof subject === 'object' ) {
            if ( _isTooLarge( subject ) ) {
                error = new Error( 'File too large (max ' +
                    ( Math.round( ( _getMaxSize() * 100 ) / ( 1024 * 1024 ) ) / 100 ) +
                    ' Mb)' );
                deferred.reject( error );
            } else {
                reader = new FileReader();
                reader.onload = function( e ) {
                    deferred.resolve( e.target.result );
                };
                reader.onerror = function( e ) {
                    deferred.reject( error );
                };
                reader.readAsDataURL( subject );
            }
        } else {
            deferred.reject( new Error( 'Unknown error occurred' ) );
        }
        return deferred.promise;
    }

    /**
     * Obtain files currently stored in file input elements of open record
     * @return {[File]} array of files
     */
    function getCurrentFiles() {
        var file,
            files = [];

        // first get any files inside file input elements
        $( 'form.or input[type="file"]' ).each( function() {
            file = this.files[ 0 ];
            if ( file ) {
                files.push( file );
            }
        } );
        return files;
    }

    /**
     * Whether the file is too large too handle and should be rejected
     * @param  {[type]}  file the File
     * @return {Boolean}
     */
    function _isTooLarge( file ) {
        return file && file.size > _getMaxSize();
    }

    /**
     * Returns the maximum size of a file
     * @return {Number}
     */
    function _getMaxSize() {
        if ( !maxSize ) {
            maxSize = $( document ).data( 'maxSubmissionSize' ) || 5 * 1024 * 1024;
        }
        return maxSize;
    }

    /*
     * Functions for managing storage of media files
     */
    /**
     * Deletes all files stored (for a subsubdomain)
     * @param {Function=} callbackComplete  function to call when complete
     */
    deleteAll = function( callbackComplete ) {
        callbackComplete = callbackComplete || function() {};

        var process = {
            entryFound: function( entry ) {
                if ( entry.isDirectory ) {
                    entry.removeRecursively(
                        function() {
                            setCurrentQuotaUsed();
                            console.log( 'Directory: ' + entry.name + ' deleted' );
                        },
                        errorHandler
                    );
                } else {
                    entry.remove( function() {
                            setCurrentQuotaUsed();
                            console.log( 'File: ' + entry.name + ' deleted' );
                        },
                        errorHandler
                    );
                }
            },
            complete: callbackComplete
        };

        filesystemReady.done( function() {
            _traverseAll( process );
        } );
    };
    
    /**
     * traverses all folders and files in root
     * @param  {{entryFound: Function, complete}} process [description]
     */
    _traverseAll = function( process ) {
        var entry, type,
            dirReader = fs.root.createReader();

        // Call the reader.readEntries() until no more results are returned.
        var readEntries = function() {
            dirReader.readEntries( function( results ) {
                if ( !results.length ) {
                    process.complete();
                } else {
                    for ( var i = 0; i < results.length; i++ ) {
                        entry = results[ i ];
                        process.entryFound( entry );
                    }
                    readEntries();
                }
            }, errorHandler );
        };
        readEntries();
    };
    
    /**
     * Requests the amount of storage used (asynchronously) and sets variable (EXPERIMENTAL/UNSTABLE API)
     */
    setCurrentQuotaUsed = function() {
        if ( typeof navigator.webkitPersistentStorage.queryUsageAndQuota !== 'undefined' ) {
            navigator.webkitPersistentStorage.queryUsageAndQuota(
                function( quotaUsed ) {
                    currentQuotaUsed = quotaUsed;
                },
                errorHandler
            );
        } 
    };
    
    getCurrentQuota = function() {
        return currentQuota;
    };

    getCurrentQuotaUsed = function() {
        return currentQuotaUsed;
    };
    
    /**
     * generic error handler
     * @param  {(Error|FileError|string)=} e [description]
     */
    errorHandler = function( e ) {
        var msg = '';

        if ( typeof e !== 'undefined' ) {
            switch ( e.code ) {
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
        console.log( 'Error occurred: ' + msg );
        if ( typeof console.trace !== 'undefined' ) console.trace();
    };
    
    /**
     * Returns jquery promise object that will be resolved when the user has approved the use of the filesystem
     * @return {*} jquery promise object
     */
    getFilesystem = function() {
       var deferred = $.Deferred();

        if ( !fs ) {
            requestQuota(
                DEFAULTBYTESREQUESTED, {
                    success: function( grantedBytes ) {
                        requestFileSystem(
                        	PERSISTENT,
                            grantedBytes,
                            function( fsys ) {
                                    fs = fsys;
                                    deferred.resolve();
                            },
                            function( e ) {
                                    errorHandler( e );
                            }
                        );
                    },
                    error: errorHandler
                }
            );
        } else {
            deferred.resolve();
        }
        return deferred.promise();
    };
    
    /**
     * Requests PERSISTENT file storage (may prompt user) asynchronously
     * @param  {number}                     bytesRequested the storage size in bytes that is requested
     * @param  {Object.<string, Function>}  callbacks      callback functions (error, and success)
     */
    requestQuota = function( bytesRequested, callbacks ) {
        console.log( 'requesting persistent filesystem quota' );
        $( document ).trigger( 'quotarequest', bytesRequested ); //just to facilitate testing
        navigator.webkitPersistentStorage.requestQuota(
        	bytesRequested,
            callbacks.success,
            callbacks.error
        );
    };
    
    /**
     * Deletes a complete directory with all its contents
     * @param {string}                                  name        name of directory
     * @param {{success: Function, error: Function}}    callbacks   callback functions (error, and success)
     */
    deleteDir = function( name, callbacks ) {

        callbacks = callbacks || {
            success: function() {},
            error: function() {}
        };

        console.log( 'going to delete filesystem directory: ' + name );

        filesystemReady.done( function() {
            console.log( 'fs is ready, going for it!' );
            fs.root.getDirectory( name, {},
                function( dirEntry ) {
                    dirEntry.removeRecursively(
                        function() {
                            setCurrentQuotaUsed();
                            callbacks.success();
                        },
                        function( e ) {
                            errorHandler( e );
                            callbacks.error();
                        }
                    );
                },
                errorHandler
            );
        } );
    };
    /*
     * **********************************************
     * End Media Storage Functions
     * **********************************************
     */
    
    return {
        isFileReaderSupported: isFileReaderSupported,
        isFileStorageSupported: isFileStorageSupported,
        notSupportedAdvisoryMsg: notSupportedAdvisoryMsg,
        isWaitingForPermissions: isWaitingForPermissions,
        init: init,
        getFileUrl: getFileUrl,
        getCurrentFiles: getCurrentFiles,
        deleteAll: deleteAll,
        deleteDir: deleteDir,
        getCurrentQuota: getCurrentQuota,
        getCurrentQuotaUsed: getCurrentQuotaUsed
    };
} );
