/*
This file is part of SMAP.

SMAP is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

SMAP is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with SMAP.  If not, see <http://www.gnu.org/licenses/>.

*/
"use strict";

import {FormModel} from "../src/js/form-model";
import connection from './connection';
import $ from "jquery";
import store from "./store";

let submit = {};
let HTTP_CREATED = 201;
let HTTP_ACCEPTED = 202;

let contentLength = 10000000;   // 10MB try to keep uploads within this value

submit.send = function(fileStore, calledFrom, record, inMemoryMedia, autoClose) {

    console.log("submit called from: " + calledFrom);

    return new Promise((resolve, reject) => {

        var model,
            xmlData,
            media = [];

        if (record.data) {

            // Get the XML data to submit
            model = new FormModel(record.data);
            model.init();
            xmlData = model.getStr();
            xmlData = submit.fixIosMediaNames(xmlData); // ios names all media image.jpg, Make each name unique

            // Get the media to submit
            if(inMemoryMedia) {
                if(record.media) {
                    media = record.media
                } else {
                    media = submit.getMedia();
                }
                sendWithMedia(fileStore, record, xmlData, media, autoClose).then(response => {

                });
            } else if(model) {
                getMediaFromStore(fileStore, model.instanceID, model).then( media => {
                    sendWithMedia(fileStore, record, xmlData, media, autoClose).then(response => {

                    });
                });
            } else {
                reject("Model not found");
            }


        } else {
            reject("Record has no data");
        }
    });
};


async function sendWithMedia(fileStore, record, xmlData, media, autoClose) {

    var content = new FormData(),
        fileIndex = 0,
        i,
        url = getSubmissionUrl(record);

    /*
	 * Use same approach as fieldTask to send bached results
	 * he XML content is sent with each batch
	 */
    var fileIndex = 0;
    var lastFileIndex = 0;
    var first = true;
    while (fileIndex < media.length || first) {
        lastFileIndex = fileIndex;
        first = false;
        var byteCount = 0;

        // Add the XML content
        content.append('xml_submission_data', xmlData);
        if (record.assignmentId) {
            content.append('assignment_id', record.assignmentId);
        }
        byteCount += xmlData.length;

        // Add the media
        for (; fileIndex < media.length; fileIndex++) {
            var blob = undefined;
            var name = undefined;

            if (media[fileIndex].blob) {
                blob = media[fileIndex].blob;
                name = media[fileIndex].fileName;
                // Commented out 14/1/2019 during upgrade - uncommented 25/2/2020
            } else if (media[fileIndex].dataUrl) {
                // immediate send data is still in dataUrl
                blob = fileStore.dataURLtoBlob(media[fileIndex].dataUrl);
                name = media[fileIndex].name;
            } else {
                // Assume the media file is the blob
                blob = media[fileIndex];
                name = blob.name;
            }

            console.log("++++++++++ append file: " + name);
            if (blob) {
                content.append(name, blob, name);
                byteCount += media[fileIndex].size;

                if (fileIndex + 1 < media.length) {      // Look ahead to see if we should stop now
                    if ((fileIndex - lastFileIndex + 1 > 100) || (byteCount + media[fileIndex + 1].size > contentLength)) {
                        // the next file would exceed the 10MB threshold
                        console.log("Spliting large post");
                        content.append("*isIncomplete*", "yes");
                        ++fileIndex;
                        break;
                    }
                }
            }
        }


        let promise = post(url, content);
        let response = await promise;

        if (response != HTTP_CREATED && response != HTTP_ACCEPTED) {
            console.log("error");

            if (response == 401) {
                getNewKey(record);		// Get a new access key  TODO
            }
            reject();

        }
    }
    console.log("success");

    if (autoClose) {
        refreshForm();      // TODO
    }

}






function post(url, content) {
    return new Promise((resolve, reject) => {
        console.debug("Submit: " + url);
        $.ajax(url, {
            type: 'POST',
            data: content,
            cache: false,
            contentType: false,
            processData: false,
            timeout: 800 * 1000,
            complete: function (jqXHR, response) {
                resolve(jqXHR.status);
            }
        });
    });
}

/*
 **************************
 * Utility Functions
 */

function getMediaFromStore(fileStore, directory, model) {

    return new Promise((resolve, reject) => {
        var $fileNodes = (fileStore) ? $(model.data.modelStr).find('[type="file"]').removeAttr('type') : [];

        var todo = [],
            fileO,
            media = [],
            notfound = [];

        if (fileStore) {
            $fileNodes.each(function () {
                fileO = {
                    fileName: $(this).text()
                };
                todo.push(fileStore.retrieveFile(directory, fileO));
            });
        } else {
            reject("Database store not found");
        }

        Promise.all(todo)
            .then(function (values) {

                var i;
                var notfound = [];
                for (i = 0; i < values.length; i++) {

                    if (values[i].blob) {
                        media.push(values[i]);
                    } else {
                        notfound.push(values[i].fileName);
                    }
                }
                if (notfound.length > 0) {
                    alert("Cound not find the following files: " + notfound.join(""));
                }
                resolve(media);

            }).catch(e => {
                reject(e.toString())
        })
    });
}

/*
 * Get the submission url for this record
 */
function getSubmissionUrl(record) {

    var dynamic = "",
        url;

    if ( record.accessKey ) {
        dynamic = "/key/" + record.accessKey;       // Access ky is used to authenticate to the server on submission
    }

    if ( !record.instanceStrToEditId ) {
        url = "/submission" + dynamic; // New record
    } else {
        url = "/submission" + dynamic + "/" + record.instanceStrToEditId; // Update existing record
    }
    url += "?deviceID=webform";

    return url;
}

/*
 * IOS 4 (at least) sets all images to a name of image.jpg and all videos to a name of capturedvideo.mov
 * This function makes the reference to these names unique, however it does not change the file name.
 * The files are sent to the server with their duplicate names, the server then applies the same
 * logic as here to set the name of the file on the server
 */
submit.fixIosMediaNames = function(xmlData) {
    var xml = $.parseXML(xmlData),
        $xml,
        imageCount = 0,
        videoCount = 0;

    $xml = $(xml);
    $xml.find('[type="file"]').each(function () {
        var $this = $(this),
            name;
        name = $this.text();
        if (name === "image.jpg") {
            name = "image_" + imageCount + ".jpg";
            $this.text(name);
            imageCount++;
        }
        if (name === "capturedvideo.MOV") {
            name = "capturedvideo_" + videoCount + ".MOV";
            $this.text(name);
            videoCount++;
        }
    });

    return ( new XMLSerializer() ).serializeToString(xml);

};

/*
 * Get an array of the media dataUrls along with the filenames from the current form
 */
submit.getMedia = function() {
    var $media,
        $preview,
        elem,
        i,
        mediaArray = [],
        filename,
        filenameParts;

    $('[type="file"]').each(function () {
        $media = $(this);
        $preview = $media.parent().find(".file-preview").find("img");
        //name = $media.parent().find(".fake-file-input").text();
        elem = $media[0];

        var postfix = $media.parent().find('input[type="file"]').data("filename-postfix");
        postfix = postfix || '';

        if(elem.files.length == 0 && $preview.length > 0) {
            mediaArray.push({
                //fileName: $media.attr("data-loaded-file-name"),
                name: $media.attr("data-loaded-file-name"),
                dataUrl: $preview.attr("src"),
                size: $preview.attr("src").length
            });
        } else {
            for (i = 0; i < elem.files.length; i++) {
                filename = elem.files[i].name;

                // Add postfix
                filenameParts = filename.split('.');
                if (filenameParts.length > 1) {
                    filenameParts[filenameParts.length - 2] += postfix;
                } else if (filenameParts.length === 1) {
                    filenameParts[0] += postfix;
                }
                filename = filenameParts.join('.');

                mediaArray.push({
                    fileName: filename,
                    dataUrl: $preview.attr("src"),
                    size: elem.files[i].size
                });
            }
        }
    });

    console.log("Returning media");
    console.log(mediaArray);
    return mediaArray;
};

function refreshForm() {
    console.debug("Refresh Form");
    window.onbeforeunload = undefined;
    window.location.reload(true);
}

/*
 * Get a new update key and update the record
 * This will be required if the key in dynamic_users table has expired and been deleted
 * ODO
 */
function getNewKey(record) {
    $.ajax({
        url: '/surveyKPI/login/key?form=user',		// Get a generic user key
        dataType: 'json',
        cache: false,
        success: function(data) {
            if(record.name == 'iframe_record') {
                // Update the web page access key
                surveyData.key = data.key;
            } else {
                // Update the access key in the stored record
                var dbRecord = store.getRecord( record.name );
                dbRecord.accessKey = data.key;
                gStore.setRecord( record.name, dbRecord, true, true, dbRecord.key );
            }
            // TODO update the surveyData in the form if this is an immediate submit
            // setSubmissionUrl(data.key);
        },
        error: function(xhr, textStatus, err) {
            removeHourglass();
            if(xhr.readyState == 0 || xhr.status == 0) {
                return;  // Not an error
            } else {
                alert("Error: Failed to get access key: " + err);
            }
        }
    });
}


export default submit;
