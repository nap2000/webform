/**
 * Main entry point for webforms
 * Calls enketo library
 */

import $ from 'jquery';
window.jQuery = $; // required for bootstrap-timepicker

// WebForm
import fileStore from './webform/file-storage';
import recordStore from './webform/store';
import controller from './webform/controller-webform';
import { t }  from './src/js/translator';

window.enketo = controller;             // Make controller global so it can be called by cordova app

if(typeof surveyData !== "undefined") {

    t.init().then (function() {


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

