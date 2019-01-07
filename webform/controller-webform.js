
    "use strict";

    let controller = {};
    import { t } from 'enketo/translator';

    import { Form } from '../src/js/form';
    import { FormModel } from '../src/js/form-model';

    import gui from './gui';
    import connection from'./connection';
    import $ from 'jquery';
    import ecFm from '../src/js/file-manager';
    //require('bootstrap');

    var form, $form, $formprogress, formSelector, originalSurveyData, store, fileManager, startEditData;

    controller.init = function(selector, options) {
        var  purpose;

        $('article').hide();   // start loader
        $('.loader').show();

        setTimeout( function() {
            /*
             * Add check prior to the user leaving the screen
             */
            window.onbeforeunload = function () {
                if (hasChanged()) {
                    return "You have unsaved changes. Are you sure you want to leave?";
                } else if(fileManager.getAllAttachments().length > 0) {
                    return "Some of the saved results that have not been submitted contain attached files.  These will be lost if you leave. Are you sure you want to leave?";
                }
            };

            //formSelector = selector;
            originalSurveyData = {};
            originalSurveyData.modelStr = surveyData.modelStr;

            options = options || {};
            fileManager = options.fileStore;
            store = options.recordStore || null;

            // Rename instanceStrToEdit to instanceStr as used by Enketo Core
            surveyData.instanceStrToEdit = surveyData.instanceStrToEdit || null;
            surveyData.instanceStr = surveyData.instanceStrToEdit || null;

            // Open an existing record if we need to
            if (fileManager.isSupported()) {
                var recordName = store.getRecord("draft");	// Draft identifies the name of a draft record that is being opened
                if (recordName) {

                    var record = store.getRecord(recordName);
                    surveyData.instanceStrToEdit = record.data;
                    surveyData.instanceStr = record.data;
                    surveyData.instanceStrToEditId = record.instanceStrToEditId;
                    surveyData.assignmentId = record.assignmentId;
                    surveyData.key = record.accessKey;
                    surveyData.submitted = false;

                    // Set the global instanceID of the restored form so that filePicker can find media
                    var model = new FormModel(record.data);
                    model.init();
                    window.gLoadedInstanceID = model.getInstanceID();

                    // Delete the draft key
                    store.removeRecord("draft");
                } else {
                    window.gLoadedInstanceID = undefined;
                }
            }


            // Initialise network connection
            connection.init(true, store);

            /*
             * Initialise file manager if it is supported in this browser
             * The fileSystems API is used to store images prior to upload when operating offline
             */
            if (fileManager.isSupported()) {
                fileManager.init();
                if (!store || store.getRecordList().length === 0) {
                    fileManager.deleteAllAttachments();
                }
            }
            // Create the form
            formSelector = 'form.or:eq(0)';
            form = new Form(formSelector, surveyData);
            var loadErrors = form.init();

            if (recordName) {
                form.setRecordName(recordName);
            }

            if (loadErrors.length > 0) {
                purpose = ( surveyData.instanceStr ) ? 'to edit data' : 'for data entry';
                gui.showLoadErrors(loadErrors,
                    'It is recommended <strong>not to use this form</strong> ' +
                    purpose + ' until this is resolved.');
            }

            $('.loader').hide();
            $('article').show();       // end loader

            //$form = form.getView().$;
	        $form = $( 'form.or' );
            $formprogress = $('.form-progress');

            setEventHandlers();
            setSubmitLogic();

            // Save current data so we can check if there have been changes
            startEditData = form.getDataStr(true, true);

            if (store) {
                var btnstyle = 'width:48%; white-space: normal;padding-left:5px; padding-right:5px;'
                $('.side-slider').append(
                    '<h3 class="lang" data-lang="record-list.title">queue</h3>' +
                    '<p class="lang" data-lang="record-list.msg1">Records are stored</p>' +
                    '<progress class="upload-progress"></progress>' +
                    '<ul class="record-list"></ul>' +
                    '<div class="button-bar">' +
                    //'<button class="btn btn-default export-records">Export</button>' +
                    '<button class="btn btn-primary upload-records lang pull-left" data-lang="record-list.upload" ' +
                    'style="' + btnstyle + '">upload</button>' +		// remove pull-right while export is disabled
                    '<button class="btn btn-default delete-records pull-right lang" data-lang="confirm.deleteall.posButton"' +
                    'style="' + btnstyle + '">Delete</button>' +
                    '</div>' +
                    '<p class="lang" data-lang="record-list.msg2-nodraft" >Queued records</p>' +
                    '<p class="lang" data-lang="record-list.msg3" >Foce Upload</p>');
                //trigger fake save event to update formlist in slider
                $form.trigger('save', JSON.stringify(store.getRecordList()));
            }
            if (options.submitInterval) {
                window.setInterval(function () {
                    submitQueue();
                }, options.submitInterval);
                window.setTimeout(function () {
                    submitQueue();
                }, 5 * 1000);
            }
        }, 0 );

    }

    /**
     * Controller function to reset to a blank form. Checks whether all changes have been saved first
     * @param  {boolean=} confirmed Whether unsaved changes can be discarded and lost forever
     */
    function resetForm(confirmed) {
        var message, choices;
        if (!confirmed && form.getEditStatus()) {
            message = 'There are unsaved changes, would you like to continue <strong>without</strong> saving those?';
            choices = {
                posAction: function () {
                    resetForm(true);
                }
            };
            gui.confirm(message, choices);
        } else {
            setDraftStatus(false);
            updateActiveRecord(null);
            form.resetView();
            form = new Form('form.or:eq(0)', originalSurveyData);
            //window.form = form; DEBUG
            form.init();
            //$form = form.getView().$;
	        $form = $( 'form.or' );
            $formprogress = $('.form-progress');
            $('button#delete-form').button('disable');

            // smap save the initial starting point
            startEditData = form.getDataStr(true, true);
        }
    }

    /*
     * Load a record from the list of draft records
     */
    function loadRecord(recordName, confirmed) {
        var record, texts, choices, loadErrors;

        if (!confirmed && form.getEditStatus()) {
            texts = {
                msg: 'The current form has unsaved changes. Would you like to load a record <strong>without saving changes</strong> to the form you were working on?',
                heading: 'Unsaved edits'
            };
            choices = {
                posButton: 'Proceed without saving',
                posAction: function () {
                    loadRecord(recordName, true);
                }
            };
            gui.confirm(texts, choices);
        } else {

            /*
             * Open the form with the saved data
             */
            record = store.getRecord(recordName);
            if (record && record.data) {
                store.setKey("draft", recordName);
                window.location.replace(record.form);
            }

        }
    }

    /*
     * Save a record to the Store
     */
    function saveRecord(recordName, confirmed, error, draft) {
        var texts, choices, record, saveResult, overwrite,
            count = 0,
            i,
            media = ecFm.getCurrentFiles(),
            recordResult = {};

        draft = draft || getDraftStatus();
        console.log('saveRecord called with recordname:' + recordName, 'confirmed:' + confirmed, "error:" + error + 'draft:' + draft);

        //triggering before save to update possible 'end' timestamp in form
        $form.trigger('beforesave');

        confirmed = ( typeof confirmed !== 'undefined' ) ? confirmed : false;
        recordName = recordName || form.getRecordName() || form.getSurveyName() + ' - ' + store.getCounterValue();

        if (!recordName) {
            console.log('No record name could be created.');
            return;
        }

        if (!draft || (draft && confirmed)) {

            form.validate()
                .then( function( valid ) {
                    if ( !valid ) {
                        gui.alert('Form contains errors <br/>(please see fields marked in red)');
                        return;
                    } else {
                        var originalUrl = window.location.href.split("?");

                        record = {
                            'draft': draft,
                            'form': originalUrl[0],
                            'data': form.getDataStr(true, true),
                            'instanceStrToEditId': surveyData.instanceStrToEditId,  		// d1504
                            'assignmentId': surveyData.assignmentId,				 		// d1504
                            'accessKey': surveyData.key										// d1504
                        };


                        // Save any media
                        var getFileClosure = function(i) {
                            ecFm.getFileUrl(media[i]).then(function(url) {
                                media[i].dataUrl = url;
                                fileManager.saveFile(media[i], dirname);
                            });
                        }
                        var dirname = "/" + form.getInstanceID();
                        if (media.length > 0) {
                            fileManager.deleteDir(dirname);        // Remove any existing media
                            for (i = 0; i < media.length; i++) {
                                if(!media[i].dataUrl) {
                                    getFileClosure(i, media[i]);
                                } else {
                                    fileManager.saveFile(media[i], dirname);
                                }

                                count++;
                                if (count === media.length) {
                                    saveResult = writeRecord(recordName, record, draft, media);
                                }
                            }

                        } else {
                            saveResult = writeRecord(recordName, record, draft, media);
                        }
                    }
                } );



        }

        if (draft && !confirmed) {
            texts = {
                dialog: 'save',
                msg: '',
                heading: t('formfooter.savedraft.label'),
                errorMsg: error
            };
            choices = {
                posButton: t('confirm.save.posButton'),
                negButton: t('confirm.default.negButton'),
                posAction: function (values) {
                    // if the record is new or
                    // if the record was previously loaded from storage and saved under the same name
                    if (!form.getRecordName() || form.getRecordName() === values['record-name']) {
                        saveRecord(values['record-name'], true, error);
                    } else {
                        gui.confirm({
                            msg: 'Are you sure you want to rename "' + form.getRecordName() +
                            '"" to "' + values['record-name'] + '"?'
                        }, {
                            posAction: function () {
                                saveRecord(values['record-name'], true, error);
                            }
                        });
                    }
                },
                negAction: function () {
                    return false;
                }
            };
            gui.confirm(texts, choices, {
                'record-name': recordName
            });
        } 

        recordResult.key = recordName;
        return recordResult;
    }

    /*
     * Write the record
     */
    function writeRecord(recordName, record, draft, media) {

        var overwrite = form.getRecordName() === recordName;
        var saveResult = store.setRecord(recordName, record, true, overwrite, form.getRecordName());

        console.log('saveResult: ' + saveResult);
        if (saveResult === 'success') {
            resetForm(true);
            $form.trigger('save', JSON.stringify(store.getRecordList()));

            if (draft) {
                gui.feedback(t('alert.recordsavesuccess.draftmsg'), 3);
            } else {
                //try to send the record immediately
                gui.feedback(t('alert.recordsavesuccess.finalmsg'), 3);
                submitOneForced(recordName, record, media);
            }
        } else if (saveResult === 'require' || saveResult === 'existing' || saveResult === 'forbidden') {
            saveRecord(undefined, false, 'Record name "' + recordName + '" already exists (or is not allowed). The record was not saved.');
        } else {
            gui.alert('Error trying to save data locally (message: ' + saveResult + ')');
        }
    }

    /*
     * Submit the data directly without using local storage
     */
    function submitEditedRecord(autoClose) {
        var name, record, saveResult, redirect, beforeMsg, callbacks, $alert;
        $form.trigger('beforesave');
        if (!form.isValid()) {
            gui.alert('Form contains errors <br/>(please see fields marked in red)');
            return;
        }

        gui.alert('<progress style="text-align: center;"/>', 'Submitting...', 'info');

        record = {
            'key': 'iframe_record',
            'data': form.getDataStr(true, true),
            'instanceStrToEditId': surveyData.instanceStrToEditId,  // d1504
            'assignmentId': surveyData.assignmentId,				 // d1504
            'accessKey': surveyData.key								 // d1504
        };

        callbacks = {
            error: function () {
                gui.alert('Please try submitting again.', 'Submission Failed');
            },
            success: function () {
                resetForm(true);
                gui.alert('Success', 'Submission Successful!', 'success');
            },
            complete: function () {
            }
        };

        //only upload the last one
        prepareFormDataArray(
            record, {
                success: function (formDataArr) {
                    connection.uploadRecords(formDataArr, true, callbacks, closeAfterSending());
                },
                error: function () {
                    gui.alert('Something went wrong while trying to prepare the record(s) for uploading.', 'Record Error');
                }
            },
            true // Use media referenced in browser
        );
    }

    /*
     * Return true if the web page should be closed after the results are sent. This should happen when:
     *   1) The web page has an assignmentId, that is it was loaded by clicking a task
     *   2) or, the web page has an instanceStrToEdit, that is it contained initial data from another survey
     */
    function closeAfterSending() {

        if (surveyData.assignmentId) {
            console.log("Close after saving");
            return true;
        } else {
            return false;
        }

    }

    /*
     * Return true if this form can be saved and submitted asynchronously. This is possible if either:
     *   1) The browser supports FileReader
     */
    function canSaveRecord() {

        if (fileManager.isSupported()) {
            console.log("Can Save record:");
            return true;
        } else {
            return false;
        }

    }

    function submitOneForced(recordName, record, media) {

        if (!record.draft) {
            prepareFormDataArray({
                    key: recordName,
                    data: record.data,
                    assignmentId: record.assignmentId,				 // d1504
                    instanceStrToEditId: record.instanceStrToEditId, // d1505
                    accessKey: record.accessKey,						 // d1504
                    media: media
                }, {
                    success: function (formDataArr) {
                        connection.uploadRecords(formDataArr, true, undefined, closeAfterSending());		// d1504 add closeAfterSending
                    },
                    error: function () {
                        gui.alert('Something went wrong while trying to prepare the record(s) for uploading.', 'Record Error');
                    }
                },
                true // Use media from file store
            );
        }
    }

    function submitQueue() {

        var i,
            records = store.getSurveyDataArr(true),
            successHandler = function (recordPrepped) {
                connection.uploadRecords(recordPrepped, false, undefined, false);		// d1504 do not close after sending as this is a background job
            },
            errorHandler = function () {
                console.log('Something went wrong while trying to prepare the record(s) for uploading.');
            };

        // reset recordsList with fake save
        $form.trigger('save', JSON.stringify(store.getRecordList()));
        // Clear any errors from recordList
        $('.record-list').find('li').removeClass('error');
        if (!connection.getUploadOngoingID() && connection.getUploadQueue().length === 0) {
            for (i = 0; i < records.length; i++) {
                prepareFormDataArray(
                    records[i], {
                        success: successHandler,
                        error: errorHandler
                    },
                    false // Use media from storage
                );
            }
        }
    }

    function emptyQueue() {

        var i,
            records = store.getSurveyDataArr(false);

        // reset recordsList with fake save
        $form.trigger('save', JSON.stringify(store.getRecordList()));

        for (i = 0; i < records.length; i++) {
            var r = records[i],
                recordName = r.key,
                model = new FormModel(r.data),
                instanceID;

            if (model) {
                model.init();
                instanceID = model.getInstanceID();
            }

            if (fileManager.isSupported()) {
                fileManager.deleteDir(instanceID);
            }
            if (store) {
                store.removeRecord(recordName);
            }
        }

        // Just to be sure delete all attachments
        fileManager.deleteAllAttachments();

    }

    /*
     * Get an array of the media dataUrls along with the filenames from the current form
     */
    function getMedia() {
        var $media,
            $preview,
            elem,
            count,
            i,
            $fp,
            $filePicker,
            name,
            dataUrl,
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

            for (i = 0; i < elem.files.length; i++) {
                filename = elem.files[i].name;

                // Add postfix
                filenameParts = filename.split( '.' );
                if ( filenameParts.length > 1 ) {
                    filenameParts[ filenameParts.length - 2 ] += postfix;
                } else if ( filenameParts.length === 1 ) {
                    filenameParts[ 0 ] += postfix;
                }
                filename = filenameParts.join( '.' );

                mediaArray.push({
                    fileName: filename,
                    //file: elem.files[i],              // Update media issue
                    dataUrl: $preview.attr("src"),
                    size: elem.files[i].size
                });
            }
        });

        console.log("Returning media");
        console.log(mediaArray);
        return mediaArray;
    }

    /**
     * Asynchronous function that builds up a form data array including media files
     * @param { { name: string, data: string } } record[ description ]
     * @param {{success: Function, error: Function}} callbacks
     */
    function prepareFormDataArray(record, callbacks, immediate) {
        var j, k, l, xmlData, formData, model, $fileNodes, fileIndex, fileO, recordPrepped,
            count = 0,
            sizes = [],
            batches = [],
            media = [];

        if (record.data) {
            model = new FormModel(record.data);
            model.init();
            xmlData = model.getStr();
            xmlData = _fixIosMediaNames(xmlData); // ios names all media image.jpg, Make each name unique
        } else {
            callbacks.success(record);	// d1504 existing record from record store all pre-prepared
        }

        function basicRecordPrepped(batchesLength, batchIndex) {
            if (xmlData) {
                formData = new FormData();
                formData.append('xml_submission_data', xmlData);
                if (record.assignmentId) {
                    formData.append('assignment_id', record.assignmentId);
                }
            } else {
                formData = record.formData;
            }
            return {
                name: record.key,
                instanceID: model.getInstanceID(),		// Use the instance ID that is built into the form
                formData: formData,
                batches: batchesLength,
                batchIndex: batchIndex,
                assignmentId: record.assignmentId,				 	// d1504
                instanceStrToEditId: record.instanceStrToEditId,	// d1505
                accessKey: record.accessKey						 	// d1504
            };
        }

        function getFileSizes() {
            var i;

            if(record.media) {
                media = record.media;
            } else {
                media = getMedia();
            }

            if (media) {
                for (i = 0; i < media.length; i++) {
                    count++;
                    sizes.push(media[i].size)
                }
            }

        }

        function gatherFiles(directory) {

            $fileNodes = ( fileManager ) ? model.$.find('[type="file"]').removeAttr('type') : [];


            var todo = [];
            if (fileManager) {
                var xxx = fileManager.getAllAttachments();
                $fileNodes.each(function () {
                    fileO = {
                        fileName: $(this).text()
                    };

                    todo.push(fileManager.retrieveFile(directory, fileO));

                }).toArray();
            }

            return Promise.all( todo )
                .then( function(values) {
                    if (values.length > 0) {

                        var i;
                        var notfound = [];
                        for(i = 0; i < values.length; i++) {

                            if(values[i].blob) {
                                media.push(values[i]);
                                sizes.push(values[i].size);
                            } else {
                                notfound.push(values[i].fileName);
                            }
                        }
                        if(notfound.length > 0) {
                            alert("Cound not find the following files: " + notfound.join(""));
                        }
                        distributeFiles();
                    } else {
                        recordPrepped = basicRecordPrepped(1, 0);
                        callbacks.success(recordPrepped);
                    }
                })
        }

        function distributeFiles() {
            //var maxSize = connection.getMaxSubmissionSize();
            var maxSize = 100 * 1024 * 1024;
            if (media.length > 0) {
                batches = divideIntoBatches(sizes, maxSize);
                console.log('splitting record into ' + batches.length + ' batches to reduce submission size ');
                for (k = 0; k < batches.length; k++) {
                    recordPrepped = basicRecordPrepped(batches.length, k);
                    for (l = 0; l < batches[k].length; l++) {
                        fileIndex = batches[k][l];
                        //recordPrepped.formData.append( media[ fileIndex ].name, media[ fileIndex ].file );
                        var blob = undefined;
                        var name = undefined;
                        if(media[fileIndex].blob) {
                            blob = media[fileIndex].blob;
                            name = media[fileIndex].fileName;
                        } else if (media[fileIndex].dataUrl) {
                            // immediate send data is still in dataUrl
                            blob = dataURLtoBlob(media[fileIndex].dataUrl);
                            name = media[fileIndex].name;
                        } else {
                            // Assume the media file is the blob
                            blob = media[fileIndex];
                            name = blob.name;
                        }

                        console.log("++++++++++ append file: " + name);
                        if(blob) {
                            recordPrepped.formData.append(name, blob, name);
                        }
                    }
                    callbacks.success(recordPrepped);
                }
            } else {
                recordPrepped = basicRecordPrepped(1, 0);
                callbacks.success(recordPrepped);
            }

        }

        // From: http://stackoverflow.com/questions/6850276/how-to-convert-dataurl-to-file-object-in-javascript
        function dataURLtoBlob(dataurl) {
            var arr = dataurl.split(','), mime = arr[0].match(/:(.*?);/)[1],
                bstr = atob(arr[1]), n = bstr.length, u8arr = new Uint8Array(n);
            while (n--) {
                u8arr[n] = bstr.charCodeAt(n);
            }
            return new Blob([u8arr], {type: mime});
        }

        if (immediate) {
            getFileSizes();
            distributeFiles();
        } else if (model) {
            gatherFiles(model.getInstanceID());
        }


    }

    /*
     * IOS 4 (at least) sets all images to a name of image.jpg and all videos to a name of capturedvideo.mov
     * This function makes the reference to these names unique, however it does not change the file name.
     * The files are sent to the server with their duplicate names, the server then applies the same
     * logic as here to set the name of the file on the server
     */
    function _fixIosMediaNames(xmlData) {
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

    }

    /**
     * Function to export or backup data to a file. In Chrome it will get an appropriate file name.
     */

    function exportToTextFile(fileName, dataStr) {
        var blob;
        blob = new Blob([dataStr], {
            type: "text/plain; charset=utf-8"
        });
        saveAs(blob, fileName);
    }

    function setEventHandlers() {

        $('button#reset-form')
            .click(function () {
                resetForm();
            });
        $('button#submit-form')
            .click(function () {
                var $button = $(this);
                $button.btnBusyState(true);
                // this timeout is to slow down the GUI a bit, UX
                setTimeout(function () {
                    if (canSaveRecord()) {
                        saveRecord();
                    } else if (getDraftStatus()) {
                        setDraftStatus(false);
                        $button.btnBusyState(false);
                        $button.text(t( 'formfooter.submit.btn' ));
                        gui.alert('Your browser does not support saving media files');
                    } else {
                        form.validate();
                        submitEditedRecord(closeAfterSending());
                    }
                    $button.btnBusyState(false);
                    return false;
                }, 100);

            });
        $('button#submit-form-single')
            .click(function () {
                if(surveyData.viewOnly) {
                    window.open( '', '_self' ).close();
                } else {
                    var $button = $(this);
                    $button.btnBusyState(true);
                    setTimeout(function () {
                        if (canSaveRecord()) {
                            saveRecord();
                        } else if (getDraftStatus()) {
                            setDraftStatus(false);
                            $button.btnBusyState(false);
                            $button.text(t( 'formfooter.submit.btn' ));
                            gui.alert('Your browser does not support saving media files');
                        } else {
                            form.validate();
                            submitEditedRecord(true);
                        }
                        //form.validate();
                        //submitEditedRecord(true);
                        $button.btnBusyState(false);
                        return false;
                    }, 100);
                }
            });


        $('.form-footer [name="draft"]').on('change', function () {
            var text = ( $(this).prop('checked') ) ? t( 'formfooter.savedraft.btn' ) : t( 'formfooter.submit.btn' );  // submit
            $('#submit-form').text(text);
        });

        $(document).on('click', 'button#validate-form:not(.disabled)', function () {
            //$form.trigger('beforesave');
            if (typeof form !== 'undefined') {
                var $button = $(this);
                $button.btnBusyState(true);
                setTimeout(function () {
                    form.validate();
                    $button.btnBusyState(false);
                    if (!form.isValid()) {
                        gui.alert('Form contains errors <br/>(please see fields marked in red)');
                        return;
                    }
                }, 100);
            }
        });

        $(document).on('click', '.export-records', function () {
            var server, exported, dataStr,
                fileName = form.getSurveyName() + '_data_backup.xml';

            dataStr = store.getExportStr();

            if (!dataStr) {
                gui.alert('No records in queue. The records may have been successfully submitted already.');
            } else {
                server = settings.serverURL || '';
                exported = vkbeautify.xml('<export date="' + new Date() + '" server="' + server + '">' + dataStr + '</export>');
                exportToTextFile(fileName, exported);
            }
        });

        $(document).on('click', '.upload-records:not(:disabled)', function () {
            submitQueue();
        });

        $(document).on('click', '.delete-records:not(:disabled)', function () {
            var message = t('confirm.deleteall.msg'),
                choices = {
                    posAction: function () {
                        emptyQueue();
                    }
                };
            gui.confirm(message, choices);
        });

        $(document).on('click', '.record.error', function () {
            var name = $(this).attr('name'),
                $info = $(this).siblings('[name="' + name + '"]');

            if ($info.is(':visible')) {
                $info.hide(500);
            } else {
                $info.show(500);
            }
        });

        $(document).on('click', '.record-list [data-draft="true"]', function () {
            loadRecord($(this).closest('.record').attr('name'), false);
        });

        //$( '#form-controls button' ).toLargestWidth();

        $(document).on('save delete', 'form.or', function (e, formList) {
            updateRecordList(JSON.parse(formList));
        });

        //remove filesystem folder after successful submission
        $(document).on('submissionsuccess', function (ev, recordName, instanceID) {
            if (fileManager.isSupported()) {
                fileManager.deleteDir(instanceID);
            }
            if (store) {
                store.removeRecord(recordName);
            }
            console.log('After submission success, attempted to remove record with key:' + recordName + 'and files in folder:' + instanceID);
        });

        $(document).on('progressupdate', 'form.or', function (event, status) {
            if ($formprogress.length > 0) {
                $formprogress.css('width', status + '%');
            }
        });
    }

    function setSubmitLogic() {
        if(surveyData.viewOnly) {
            $('.form-footer [name="draft"]').parent().hide();
            $('#submit-form, #submit-form-single').text("close");
        }
    }

    //update the survey forms names list
    function updateRecordList(recordList) {
        var name, draft, i, $li,
            $buttons = $('.side-slider .upload-records, .side-slider .export-records'),
            $list = $('.side-slider .record-list');

        console.log('updating record list');

        // get form list object (keys + upload) ordered by time last saved
        recordList = recordList || [];
        $('.queue-length').text(recordList.length);

        //cleanup
        $list.find('.record').each(function () {
            name = $(this).attr('name');
            //if the record in the DOM no longer exists in storage
            if ($.grep(recordList, function (record) {
                    return record.key == name;
                }).length === 0) {
                //remove the DOM element and its same-name-siblings (split submissions)
                $(this).siblings('[name="' + name + '"]').addBack().hide(2000, function () {
                    $(this).remove();
                });
            }
        });

        // disable buttons
        $buttons.attr('disabled', 'disabled');

        // add new records
        if (recordList.length > 0) {
            $list.find('.no-records').remove();

            $('.side-slider .export-records').removeAttr('disabled');

            recordList.forEach(function (record) {
                name = record.key;
                draft = record.draft;

                // if there is at least one record not marked as draft
                if (!draft) {
                    $buttons.removeAttr('disabled');
                }

                // add a new item when necessary
                $li = $list.find('[name="' + name + '"]');
                if ($li.length === 0) {
                    $li = $('<li class="record"></li>');
                    $li.text(name); // encodes string to html
                    $li.attr('name', name);
                    $list.append($li);
                }

                // update record status for new or existing records
                $li.attr('data-draft', draft);
            });
        } else if ($list.find('.no-records').length === 0) {
            $list.append('<li class="no-records">' + t("record-list.norecords") + '</li>');
        }
    }

    function updateActiveRecord(recordName) {
        var $list = $('.side-slider .record-list');

        $list.find('li').removeClass('active');
        if (recordName) {
            $list.find('li[name="' + recordName + '"]').addClass('active');
        }
    }

    function setDraftStatus(status) {
        status = status || false;
        $('.form-footer [name="draft"]').prop('checked', status).trigger('change');
    }

    function getDraftStatus() {
        return $('.form-footer [name="draft"]').prop('checked');
    }

    /**
     * splits an array of file sizes into batches (for submission) based on a limit
     * @param  {Array.<number>} fileSizes   array of file sizes
     * @param  {number}     limit   limit in byte size of one chunk (can be exceeded for a single item)
     * @return {Array.<Array.<number>>} array of arrays with index, each secondary array of indices represents a batch
     */

    function divideIntoBatches(fileSizes, limit) {
        var i, j, batch, batchSize,
            sizes = [],
            batches = [];
        //limit = limit || 5 * 1024 * 1024;
        for (i = 0; i < fileSizes.length; i++) {
            sizes.push({
                'index': i,
                'size': fileSizes[i]
            });
        }
        while (sizes.length > 0) {
            batch = [sizes[0].index];
            batchSize = sizes[0].size;
            if (sizes[0].size < limit) {
                for (i = 1; i < sizes.length; i++) {
                    if (( batchSize + sizes[i].size ) < limit) {
                        batch.push(sizes[i].index);
                        batchSize += sizes[i].size;
                    }
                }
            }
            batches.push(batch);
            for (i = 0; i < sizes.length; i++) {
                for (j = 0; j < batch.length; j++) {
                    if (sizes[i].index === batch[j]) {
                        sizes.splice(i, 1);
                    }
                }
            }
        }
        return batches;
    }

    /*
     * Functions to access Enketo Core without using WebForms wrapper
     */
    function finalise() {
        //var $form = form.getView().$;
	    var $form = $( 'form.or' );
        $form.trigger('beforesave');
        $(':focus').trigger('blur');
        form.validate();
    }

    function validate() {
        return form.isValid();
    }

    function getXmlData() {
        return form.getDataStr(true, true);
    }

    /*
     * Initialise the form without starting webforms connection or record store
     */
    function initialiseForm(recordName, setAsChanged) {
        var loadErrors,
            purpose;

        window.gLoadedInstanceID = undefined;

        // Create the form
        form = new Form('form.or:eq(0)', surveyData);			// form is global
        loadErrors = form.init();

        if (recordName) {
            form.setRecordName(recordName);
        }

        if (loadErrors.length > 0) {
            alert(loadErrors.join(','));
            //purpose = ( surveyData.instanceStrToEdit ) ? 'to edit data' : 'for data entry';
            //gui.showLoadErrors( loadErrors,
            //    'It is recommended <strong>not to use this form</strong> ' +
            //    purpose + ' until this is resolved.' );
        }

        //$form = form.getView().$;
	    $form = $( 'form.or' );
        $formprogress = $('.form-progress');

        setEventHandlers();

        // Save current data so we can check if there have been changes
        if (setAsChanged) {
            startEditData = "";		// hasChanged will return true immediately
        } else {
            startEditData = form.getDataStr(true, true);
        }

    }

    // Reset the start point (presumably after the data has been saved)
    function resetStartPoint() {
        startEditData = form.getDataStr(true, true);
    }

    // Return true if the data has changed
    function hasChanged() {
        if (typeof form !== "undefined") {
            var latestData = form.getDataStr(true, true);
            return (startEditData != latestData);
        } else {
            // return false as something has gone wrong with this form and the user should be able to exit (should be prevented from happening)
            return false;
        }
    }

    // Get the instance name
    function getInstanceName() {
        if (typeof form !== "undefined") {
            return form.getInstanceName();
        } else {
            // return false as something has gone wrong with this form and the user should be able to exit (should be prevented from happening)
            return "unknown";
        }
    }

    // Get the languages used by the form
    function getLanguages() {
        var resp = {
            defLang: $('#form-languages').data('default-lang'),
            languages: []
        };

        $('#form-languages').find('option').each(function (index) {
            var $this = $(this);
            resp.languages.push({
                value: $this.val(),
                name: $this.html()
            });
        });

        return resp;
    }

    // Set the current language
    function setLanguage(lang) {
        form.getView().langs.setAll(lang);
    }

    // Goto next page
    function nextPage() {
        form.getView().pages.next();
    }

    // Goto prev page
    function prevPage() {
        form.getView().pages.prev();
    }

    export default controller;

    /*
    module.exports = {
        init: init,
        saveRecord: saveRecord,
        validate: validate,
        finalise: finalise,
        getXmlData: getXmlData,
        initialiseForm: initialiseForm,
        getInstanceName: getInstanceName,
        hasChanged: hasChanged,
        resetStartPoint: resetStartPoint,
        submitQueue: submitQueue,
        emptyQueue: emptyQueue,
        getLanguages: getLanguages,
        setLanguage: setLanguage,
        nextPage: nextPage,
        prevPage: prevPage,
        divideIntoBatches: divideIntoBatches
    };
*/

