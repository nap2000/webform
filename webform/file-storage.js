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
     * TODO
     */
    fileStore.deleteAllAttachments = function() {

        console.log("delete all local storage");

        if(idbSupported) {
            //  TODO Empty indexdb database

        }

        // For backward compatability local storage will be emptied even of idb is supported
        // Empty backup local storage
        for (var key in localStorage) {
            if (key.startsWith(FM_STORAGE_PREFIX)) {
                var item = localStorage.getItem(key);
                if (item) {
                    window.URL.revokeObjectURL(item);
                }
                localStorage.removeItem(key);
            }
        }
    };

    /*
     *
     */
    fileStore.getAllAttachments = function () {
        var files = [];
        for (var key in localStorage) {
            if (key.startsWith(FM_STORAGE_PREFIX)) {
                files.push(key);
            }
        }
        return files;
    }


    /*
     * TODO
     */
    fileStore.getCurrentQuota = function() {
        return currentQuota;
    };

    /*
     * TODO
     */
    fileStore.getCurrentQuotaUsed = function() {
        return currentQuotaUsed;
    };


    /*
     * TODO
     */
    fileStore.deleteDir = function(name) {

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
        var request = objectStore.put(media.dataUrl, FM_STORAGE_PREFIX + dirname + "/" + media.name);

    };

    /*
     * Get a file rom idb or local storage
     */
    fileStore.getFile = function(name, dirname) {

        return new Promise((resolve, reject) => {
            var key = FM_STORAGE_PREFIX + dirname + "/" + name;

            console.log("get file: " + key);

            /*
             * Try idb first
             */
            getFileFromIdb(key).then(function (file) {

                if (file) {
                    resolve(file);

                } else {

                    /*
                     * Fallback to local storage for backward compatability
                     */
                    try {
                        resolve(localStorage.getItem(FM_STORAGE_PREFIX + dirname + "/" + name));
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

	        var key = FM_STORAGE_PREFIX + "/" + dirname + "/" + file.fileName;

	        fileStore.getFile(file.fileName, dirname).then(function(objectUrl){
                var blob;

                var xhr = new XMLHttpRequest();
                xhr.open('GET', objectUrl, true);
                xhr.responseType = 'blob';
                xhr.onreadystatechange = function (e) {

                    if (xhr.readyState !== 4) {
                        return;
                    }

                    if (this.status == 200) {
                        updatedFile.blob = this.response;
                        updatedFile.size = this.response.size;
                        resolve(updatedFile);
                    } else {
                        resolve(updatedFile);
                    }
                };
                xhr.send(null);
	        });


        });

    };

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



