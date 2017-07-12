/**
 * Main entry point for webforms
 * Calls enketo library
 */

var $ = require( 'jquery' );
window.jQuery = $; // required for bootstrap-timepicker
var support = require( './src/js/support' );

var loadErrors;
var form;
var formStr;
var modelStr;

// WebForm
var fileStore = require( './webform/file-storage' );
var recordStore = require('./webform/store');
var controller = require('./webform/controller-webform');

window.enketo = controller;             // Make controller global so it can be called by cordova app

if(typeof surveyData !== "undefined") {
    controller.init( 'form.or:eq(0)', {
        recordStore: recordStore,
        fileStore: fileStore,
        submitInterval: 300 * 1000
    } );
}



