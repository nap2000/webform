/**
 * This file is just meant to facilitate enketo-core development as a standalone library.
 *
 * When using enketo-core as a library inside your app, it is recommended to just **ignore** this file.
 * Place a replacement for this controller elsewhere in your app.
 */

var $ = require( 'jquery' );
window.jQuery = $; // required for bootstrap-timepicker
var support = require( './src/js/support' );

var fileManager = require( './src/js/file-manager' );
var loadErrors;
var form;
var formStr;
var modelStr;

// WebForm
var recordStore = require('./webform/store');
var fileStore = require('./webform/file-manager');
var controller = require('./webform/controller-webform');

window.enketo = controller;             // Make controller global so it can be called by cordova app

if(typeof surveyData !== "undefined") {
	controller.init( 'form.or:eq(0)', {
	recordStore: recordStore,
	fileStore: fileStore,
	submitInterval: 300 * 1000
	} );
}



