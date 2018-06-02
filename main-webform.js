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
var translator = require( 'enketo/translator' );
var t = translator.t;

window.enketo = controller;             // Make controller global so it can be called by cordova app

if(typeof surveyData !== "undefined") {
    translator.init().then (function() {

        // Start form
        controller.init('form.or:eq(0)', {
            recordStore: recordStore,
            fileStore: fileStore,
            submitInterval: 300 * 1000
        });

        // Apply translations
        $(".lang").each(function() {
            var $this = $(this);
            var code = $this.data("lang");
            if(code) {
                $this.html(t(code));
            }
        });

        // Apply markdown
        //$(".question-label, .option-label").each(function() {
        //    var $this = $(this);
        //    $this.html(markdown_convert($this.html()));
        //});

    });
}




