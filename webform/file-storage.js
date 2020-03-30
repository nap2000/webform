    /*
     *  File storage of attachments
     * Use IndexedDB and fall back to local storage
     */
    "use strict";

    var fileStore = {};

    /*
     * Variables for indexedDB Storage
     */
    let webformDbVersion = 1;
    var db;                     // indexedDb

    /*
     * Variables for fall back local storage
     */
    var FM_STORAGE_PREFIX = "fs::";

    var maxSize,
        currentQuota = null,
        currentQuotaUsed = null,
        currentDir,
        filesystemReady,
        fs;

    //var supported = typeof window.indexedDB !== 'undefined';
    var supported = false;  // test - remove

    /**
     * Whether filemanager is supported in browser
     * @return {Boolean}
     */
    fileStore.isSupported = function() {
        return supported;
    }

    /**
     * Initialize the file manager .
     * @return {[type]} promise boolean or rejection with Error
     */
    fileStore.init = function() {
        return new Promise((resolve, reject) => {

            var request = window.indexedDB.open("webform",  webformDbVersion);

            request.onerror = function(event) {
                reject();
            };

            request.onsuccess = function(event) {
                db = event.target.result;

                db.onerror = function(event) {
                    // Generic error handler for all errors targeted at this database's
                    // requests!
                    console.error("Database error: " + event.target.errorCode);
                };

                resolve();
            };

        });
    }

    /**
     * Whether the filemanager is waiting for user permissions
     * @return {Boolean} [description]
     */
    fileStore.isWaitingForPermissions = function() {
        return false;
    }


    fileStore.deleteAllAttachments = function() {

        console.log("delete all local storage");

        for (var key in localStorage){
            if(key.startsWith(FM_STORAGE_PREFIX)) {
                var item = localStorage.getItem(key);
                if(item) {
                    window.URL.revokeObjectURL(item);
                }
                localStorage.removeItem(key);
            }
        }
    };

    fileStore.getAllAttachments = function () {
        var files = [];
        for (var key in localStorage) {
            if (key.startsWith(FM_STORAGE_PREFIX)) {
                files.push(key);
            }
        }
        return files;
    }


    fileStore.getCurrentQuota = function() {
        return currentQuota;
    };

    fileStore.getCurrentQuotaUsed = function() {
        return currentQuotaUsed;
    };


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


    fileStore.saveFile = function(media, dirname) {

        console.log("save file: " + media.name + " : " + dirname);
        try {
            localStorage.setItem(FM_STORAGE_PREFIX + dirname + "/" + media.name, media.dataUrl);
        } catch(err) {
        	// alert("Error: " + err.message);  // disable error message as it should work if the user does an immediate send
        }

    };

    fileStore.getFile = function(name, dirname) {

	    console.log("get file: " + FM_STORAGE_PREFIX + dirname + "/" + name);
	    try {
		    return localStorage.getItem(FM_STORAGE_PREFIX + dirname + "/" + name);
	    } catch(err) {
		    alert("Error: " + err.message);
	    }

    };

    /**
     * Obtains specified files from a specified directory (asynchronously)
     * @param {string}                              directoryName   directory to look in for files
     * @param {{newName: string, fileName: string}} file           object of file properties
     * TODO DELETE!!!!!
     */
    fileStore.retrieveFile = function(dirname, file) {

        return new Promise((resolve, reject) => {

	        var updatedFile = {
		        fileName: file.fileName
	        };

	        var key = FM_STORAGE_PREFIX + "/" + dirname + "/" + file.fileName;
	        var objectUrl = localStorage.getItem(key);
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

    };

    export default fileStore;



