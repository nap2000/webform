    /*
     * File storage of attachments
     * Use IndexedDB and fall back to local storage
     */
    "use strict";

    let dbStore = {
        get available() {
            return available;
        }
    };

    dbStore.logCounter = 0;
    let available = typeof window.indexedDB !== 'undefined';

    /*
     * Variables for indexedDB Storage
     */
    let webformDbVersion;
    if(window.idbConfig) {                                  // set in idbconfig.js in the smapServer module
        webformDbVersion = window.idbConfig.version;        // Share value with webforms page
    } else {
        webformDbVersion = 15;
    }
    let databaseName = "webform";

    // Store attached media
    let mediaStoreName = "media";

    // Store logs of events
    let logStoreName = 'logs';

    // Store last saved records
    let lastSavedStoreName = 'lastSavedRecords';

    let recordStoreName = 'records';
    let assignmentIdx = 'assignment';
    let assignmentIdxPath = 'assignment.assignment_id';

    /*
     * Variables for fall back local storage
     */
    var FM_STORAGE_PREFIX = "fs::";

    /**
     * Return true if indexedDB is supported
     * No need to check for support of local storage this is checked by "store"
     * @return {Boolean}
     */
    dbStore.isSupported = function() {
        return new Promise((resolve) => {
            if (available) {
                open().then(() => {
                    resolve(true);
                }).catch( (error) => {
                    console.log(error);
                    resolve(false);
                });
            } else {
                resolve(false);
            }
        });
    };

    /**
     * Initialize indexdDb
     * @return {[type]} promise boolean or rejection with Error
     */
    let open = function() {
        return new Promise((resolve, reject) => {

            if(typeof dbStore[databaseName] !== 'undefined') {
                resolve(dbStore[databaseName]);
                return;
            }

            if(typeof window.indexedDB !== 'undefined') {
                let request = window.indexedDB.open(databaseName, webformDbVersion);

                request.onerror = function (e) {
                    console.log('Error', e.target.error.message);
                    //alert('Error', e.target.error.message);
                    reject(e);
                };

                request.onblocked = function (e) {
                    console.log('Error', e.target.error.message);
                    alert('Error', e.target.error.message);
                    reject(e);
                };

                request.onsuccess = function (e) {
                    let openDb = e.target.result;

                    openDb.onerror = function (e) {
                        // Generic error handler for all errors targeted at this database's
                        // requests!
                        console.error("Database error: " + e.target.error.message);
                    };

                    dbStore[databaseName] = openDb;
                    resolve(openDb);
                };

                request.onupgradeneeded = function(e) {
                    let upgradeDb = e.target.result;

                    if (!upgradeDb.objectStoreNames.contains(mediaStoreName)) {
                        upgradeDb.createObjectStore(mediaStoreName);
                    }

                    if (!upgradeDb.objectStoreNames.contains(recordStoreName)) {
                        let recordStore = upgradeDb.createObjectStore(recordStoreName, {
                            keyPath: 'id',
                            autoIncrement: true
                        });
                        recordStore.createIndex(assignmentIdx, assignmentIdxPath, {unique: false});
                    }

                    if (!upgradeDb.objectStoreNames.contains(logStoreName)) {
                        upgradeDb.createObjectStore(logStoreName);
                    }

                    if (!upgradeDb.objectStoreNames.contains(lastSavedStoreName)) {
                        upgradeDb.createObjectStore(lastSavedStoreName, {
                            keyPath: '_surveyId',
                            autoIncrement: false,
                        });
                    }

                    resolve(upgradeDb);
                };

            } else {
                reject("indexeddb not supported");
            }

        });
    };


    /*
     * Delete all media with the specified prefix
     * An explicit boolean "all" is added in case the function is called accidnetially with an undefined directory
     */
    dbStore.delete = function(dirname, all) {


        if (typeof dirname !== "undefined" || all) {

            if (dirname) {
                console.log("delete directory: " + dirname);
            } else {
                console.log("delete all attachments");
            }

            var prefix = FM_STORAGE_PREFIX + "/" + dirname;

            // indexeddb first
            open().then(function (db) {
                var objectStore = db.transaction([mediaStoreName], "readwrite").objectStore(mediaStoreName);
                objectStore.openCursor().onsuccess = function (e) {
                    var cursor = e.target.result;
                    if (cursor) {
                        if (all || cursor.key.startsWith(prefix)) {     // Don't need to check the key if all is set as everything in the data store is a media URL
                            if (cursor.value) {
                                window.URL.revokeObjectURL(cursor.value);
                            }
                            var request = objectStore.delete(cursor.key);
                            request.onsuccess = function (e) {
                                console.log("Delete: " + cursor.key);
                            };
                            cursor.continue();
                        }
                    }
                };
                //db.close();
            });

            // Delete any entries in localstorage
            for (var key in localStorage) {
                if ((all && key.startsWith(FM_STORAGE_PREFIX)) || key.startsWith()) {

                    var item = localStorage.getItem(key);
                    if (item) {
                        window.URL.revokeObjectURL(item);
                    }
                    console.log("Delete item: " + key);
                    localStorage.removeItem(key);
                }
            }
        }

    };

    /*
     * Save an attachment to idb
     */
    dbStore.saveFile = function(media, dirname) {

        open().then(function (db) {
            console.log("save file: " + media.name + " : " + dirname);

            var transaction = db.transaction([mediaStoreName], "readwrite");
            transaction.onerror = function (e) {
                alert("Error: failed to open transaction to save file " + media.name);
            };

            var objectStore = transaction.objectStore(mediaStoreName);
            var request = objectStore.put(media.dataUrl, FM_STORAGE_PREFIX + "/" + dirname + "/" + media.name);
        });

    };

    /*
     * Save a last saved record
     */
    dbStore.setLastSavedRecord = function(record) {

        return new Promise((resolve, reject) => {
            open().then( function( db ) {
                console.log( "Set last saved record" );

                let transaction = db.transaction( [ lastSavedStoreName ], "readwrite" );
                let request = transaction.objectStore( lastSavedStoreName ).put( record );
                request.onerror = function( e ) {
                    reject(e);
                };
                request.onsuccess = function (e) {
                    resolve();
                };

            } );
        });
    };

    /*
     * Get a last saved record
     */
    dbStore.getLastSavedRecord = function(id) {

        return new Promise((resolve, reject) => {
            open().then( function( db ) {
                console.log( "Get last saved record: " + id );

                let transaction = db.transaction( [ lastSavedStoreName ], "readonly" );
                transaction.onerror = function( e ) {
                    alert( "Error: failed to open transaction to write get last saved record " + name );
                    reject(e);
                };

                let objectStore = transaction.objectStore( lastSavedStoreName );
                let request = objectStore.get( id );

                request.onerror = function (e) {
                    reject("Error getting last record");
                };

                request.onsuccess = function (e) {
                    resolve(request.result);
                };

            } );
        });
    };

    /*
    * Remove a last saved record
    */
    dbStore.removeLastSavedRecord = function(id) {

        return new Promise((resolve, reject) => {
            open().then( function( db ) {
                console.log( "Delete last saved record: " + id );

                let transaction = db.transaction( [ lastSavedStoreName ], "readwrite" );
                transaction.onerror = function( e ) {
                    alert( "Error: failed to open transaction to delete saved record " + name );
                    reject(e);
                };

                let objectStore = transaction.objectStore( lastSavedStoreName );
                objectStore.delete(id);
                resolve();
            } );
        });
    };

    /*
     * Write a log entry to the database
     */
    dbStore.writeLog = function(action, name, status, instanceid) {

        let oneday = 1000 * 3600 * 24;

        open().then(function (db) {
            console.log("write log entry: " + name + " : " + status);

            let transaction = db.transaction([logStoreName], "readwrite");
            transaction.onerror = function (e) {
                alert("Error: failed to open transaction to write log entry " + name);
            };

            // Ensure date is unique as it is used as a unique key
            let date = new Date();
            date.setMilliseconds(date.getMilliseconds() + dbStore.logCounter);
            if(dbStore.logCounter > 100) {
                dbStore.logCounter = 0;
            } else {
                dbStore.logCounter++;
            }

            let logItem = {
                date: date,
                action: action,
                name: name,
                status: status,
                instanceid: instanceid
            }
            var objectStore = transaction.objectStore(logStoreName);
            objectStore.add(logItem, date);

            // Delete records older than 100 days
            let today = new Date();
            let archiveDate = new Date(today.getTime() - (100 * oneday));
            objectStore.delete(IDBKeyRange.upperBound(archiveDate));
        });

    };

    /*
     * Get a file from idb or local storage
     */
    dbStore.getFile = function(name, dirname) {

        return new Promise((resolve, reject) => {

            var key = FM_STORAGE_PREFIX + "/" + dirname + "/" + name;

            console.log("get file: " + key);

            /*
             * Try indxeddb first
             */
            getFileFromIdb(key).then(function (file) {

                if (file) {
                    resolve(file);

                } else {
                     // Fallback to local storage for backward compatability
                    try {
                        resolve(localStorage.getItem(key));
                    } catch (err) {
                        reject("Error: " + err.message);
                    }
                }

            }).catch(function (reason) {
                reject(reason);
            });
        });

    };

    /*
     * Obtains blob for specified file
     */
    dbStore.retrieveFile = function(dirname, file) {

        return new Promise((resolve, reject) => {

	        var updatedFile = {
		        fileName: file.fileName
	        };

	        dbStore.getFile(file.fileName, dirname).then(function(objectUrl){
	            updatedFile.blob = dbStore.dataURLtoBlob(objectUrl);
	            updatedFile.size = updatedFile.blob.size;
	            resolve(updatedFile);
	        });


        });

    };

    // From: http://stackoverflow.com/questions/6850276/how-to-convert-dataurl-to-file-object-in-javascript
    dbStore.dataURLtoBlob = function(dataurl) {
        if(dataurl) {
            var arr = dataurl.split(',');
            var mime;
            var bstr;
            var n;
            var u8arr;

            if(arr.length > 1) {
                mime = arr[0].match(/:(.*?);/)[1];
                bstr = atob(arr[1]);
                n = bstr.length;
                u8arr = new Uint8Array(n);
                while (n--) {
                    u8arr[n] = bstr.charCodeAt(n);
                }
                return new Blob([u8arr], {type: mime});
            } else {
                return new Blob();
            }
        } else {
            return new Blob();
        }
    }

    /*
     * Local functions
     * May be called from a location that has not intialised dbStore (ie fileManager)
     */
    function getFileFromIdb(key) {
        return new Promise((resolve, reject) => {
            open().then((db) => {
                var transaction = db.transaction([mediaStoreName], "readonly");
                var objectStore = transaction.objectStore(mediaStoreName);
                var request = objectStore.get(key);

                request.onerror = function (e) {
                    reject("Error getting file");
                };

                request.onsuccess = function (e) {
                    resolve(request.result);
                };
            });

        });
    }

    /*
     * Functions to interoperate with mywork
     */
    dbStore.setRecord = function(record, id) {
        return new Promise((resolve, reject) => {
            console.log("set record: ");
            open().then((db) => {
                var transaction = db.transaction([recordStoreName], "readwrite");
                transaction.onerror = function (event) {
                    alert("Error: failed to add record ");
                };

                var objectStore = transaction.objectStore(recordStoreName);

                var request = objectStore.put(record, id);

                request.onsuccess = function (e) {
                    resolve();
                };
                request.onerror = function (e) {
                    console.log('Error', e.target.error.name);
                    reject();
                };
                //db.close();
            });
        });
    };


    export default dbStore;



