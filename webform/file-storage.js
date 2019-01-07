
    "use strict";

    var FM_STORAGE_PREFIX = "fs::";

    var maxSize,
        currentQuota = null,
        currentQuotaUsed = null,
        currentDir,
        filesystemReady,
        fs,
        DEFAULTBYTESREQUESTED = 100 * 1024 * 1024;

    let fileStore = {};

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
    fileStore.init = function() {
        return new Promise((resolve, reject) => {

	        // Initialise fileSystem storage if it is supported
	        if (supported) {
		        resolve(true);
	        } else {
		        reject(new Error('FileReader not supported.'));
	        }

        });
    }

    /**
     * Whether filemanager is supported in browser
     * @return {Boolean}
     */
    fileStore.isSupported = function() {
        return supported;
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
                    console.log("Revoke URL: " + item);
                    window.URL.revokeObjectURL(item);
                }
                console.log("Delete item: " + key);
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

    /*
     * **********************************************
     * End Media Storage Functions
     * **********************************************
     *
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
    */


