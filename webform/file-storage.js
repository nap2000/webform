    /*
     *  File storage of attachments
     * Use IndexedDB and fall back to local storage
     */
    "use strict";

    var fileStore = {};

    var maxSize,
        currentQuota = null,
        currentQuotaUsed = null,
        currentDir,
        filesystemReady,
        fs;

    /*
     * Variables for indexedDB Storage
     */
    let webformDbVersion = 3;
    let databaseName = "webform";
    let mediaStoreName = "media";
    var db;                     // indexedDb
    var mediaStore;
    var idbSupported = typeof window.indexedDB !== 'undefined';

    /*
     * Variables for fall back local storage
     */
    var FM_STORAGE_PREFIX = "fs::";

    /**
     * Return true if indexedDB is supported
     * No need to check for support of local storage this is checked by "store"
     * @return {Boolean}
     */
    fileStore.isSupported = function() {
        return idbSupported;
    };

    /**
     * Initialize indexdDb
     * @return {[type]} promise boolean or rejection with Error
     */
    fileStore.init = function() {
        return new Promise((resolve, reject) => {

            if(idbSupported) {
                var request = window.indexedDB.open(databaseName, webformDbVersion);

                request.onerror = function (event) {
                    reject();
                };

                request.onsuccess = function (event) {
                    db = event.target.result;

                    db.onerror = function (event) {
                        // Generic error handler for all errors targeted at this database's
                        // requests!
                        console.error("Database error: " + event.target.errorCode);
                    };

                    resolve();
                };

                request.onupgradeneeded = function(event) {
                    var db = event.target.result;

                    mediaStore = db.createObjectStore("media");
                };

            } else {
                resolve();
            }

        });
    };


    /*
     * Delete all media with the specified prefix
     * Assumes db has been initialised
     * An explicit boolean "all" is added in case the function is called accidnetially with an undefined directory
     */
    fileStore.delete = function(dirname, all) {

        if(typeof dirname !== "undefined" || all) {

            if(dirname) {
                console.log("delete directory: " + dirname);
            } else {
                console.log("delete all attachments");
            }

            var prefix = FM_STORAGE_PREFIX + "/" + dirname;

            // indexeddb first
            var objectStore = db.transaction([mediaStoreName], "readwrite").objectStore(mediaStoreName);
            objectStore.openCursor().onsuccess = function(event) {
                var cursor = event.target.result;
                if (cursor) {
                    if (all || cursor.key.startsWith(prefix)) {     // Don't need to check the key if all is set as everything in the data store is a media URL
                        if(cursor.value) {
                            window.URL.revokeObjectURL(cursor.value);
                        }
                        var request = objectStore.delete(cursor.key);
                        request.onsuccess = function (event) {
                            console.log("Delete: " + cursor.key);
                        };
                        cursor.continue();
                    }
                }
            };

            // Delete any entries in localstorage
            for (var key in localStorage) {
                if ((all && key.startsWith(FM_STORAGE_PREFIX)) || key.startsWith()) {

                    var item = localStorage.getItem(key);
                    if(item) {
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
    fileStore.saveFile = function(media, dirname) {

        console.log("save file: " + media.name + " : " + dirname);

        var transaction = db.transaction([mediaStoreName], "readwrite");
        transaction.onerror = function(event) {
            // Don't forget to handle errors!
            alert("Error: failed to save " + media.name);
        };

        var objectStore = transaction.objectStore(mediaStoreName);
        var request = objectStore.put(media.dataUrl, FM_STORAGE_PREFIX + "/" + dirname + "/" + media.name);

    };

    /*
     * Get a file from idb or local storage
     */
    fileStore.getFile = function(name, dirname) {

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
    fileStore.retrieveFile = function(dirname, file) {

        return new Promise((resolve, reject) => {

	        var updatedFile = {
		        fileName: file.fileName
	        };

	        fileStore.getFile(file.fileName, dirname).then(function(objectUrl){
	            updatedFile.blob = fileStore.dataURLtoBlob(objectUrl);
	            updatedFile.size = updatedFile.blob.size;
	            resolve(updatedFile);
	        });


        });

    };

    // From: http://stackoverflow.com/questions/6850276/how-to-convert-dataurl-to-file-object-in-javascript
    fileStore.dataURLtoBlob = function(dataurl) {
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
    }

    /*
     * Local functions
     * May be called from a location that has not intialised fileStore (ie fileManager)
     */
    function getFileFromIdb(key) {
        return new Promise((resolve, reject) => {
            if (!db) {
                fileStore.init().then(function () {
                    resolve(completeGetFileRequest(key));
                });
            } else {
                resolve(completeGetFileRequest(key));
            }
        });
    }

    function completeGetFileRequest(key) {
        return new Promise((resolve, reject) => {
            var transaction = db.transaction([mediaStoreName], "readonly");
            var objectStore = transaction.objectStore(mediaStoreName);
            var request = objectStore.get(key);

            request.onerror = function(event) {
                reject("Error getting file");
            };

            request.onsuccess = function (event) {
                resolve(request.result);
            };
        });
    }


    export default fileStore;



