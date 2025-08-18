
import Widget from '../../js/widget';
import { NotFoundException, BrowserMultiFormatReader } from '@zxing/library';
import $ from 'jquery';
import { t } from 'enketo/translator';
import events from '../../js/event';

const codeReader = new BrowserMultiFormatReader();
let selectedDeviceId;
let videoElement;
let $video;
let startButtonElement;
let $start;
let stopButtonElement;
let $stop;
let sourceSelectElement;
let $result;
let inputElement;

/**
 * Barcode and QR code scanning
 */
class Zxing extends Widget {

    static get selector() {
        return '.question input[data-type-xml="barcode"]';
    }

    static get helpersRequired() {
        return [ 'evaluate' ];
    }

    _init() {

        this._addDomElements();
        $video = $( '#video' );
        videoElement = document.getElementById( 'video' );
        sourceSelectElement = document.getElementById( 'sourceSelect' );
        startButtonElement = document.getElementById( 'startButton' );
        $start = $( '#startButton' );
        stopButtonElement = document.getElementById( 'resetButton' );
        $stop = $( '#resetButton' );
        $result = $( '#result' );

        inputElement = this.question.querySelector( '.zxing-result' );

        startButtonElement.addEventListener( 'click', () => {
            this._startDecoding();
        } );

        stopButtonElement.addEventListener( 'click', () => {
            this._stopDecoding();
        } );

        $video.hide();
        $stop.hide();

        codeReader.listVideoInputDevices()
            .then( ( videoInputDevices ) => {

                selectedDeviceId = videoInputDevices[0].deviceId;
                if ( videoInputDevices.length >= 1 ) {
                    videoInputDevices.forEach( ( element ) => {
                        const sourceOption = document.createElement( 'option' );
                        sourceOption.text = element.label;
                        sourceOption.value = element.deviceId;
                        sourceSelectElement.appendChild( sourceOption );
                    } );

                    sourceSelectElement.onchange = () => {
                        selectedDeviceId = sourceSelectElement.value;
                        if( codeReader.isVideoPlaying( videoElement ) ) {
                            codeReader.reset();
                            this._startDecoding();
                        }
                    };

                }

            } )
            .catch( ( err ) => {
                console.error( err );
            } );


        // load default value
        if ( this.originalInputValue ) {
            this.value = this.originalInputValue;
        }
    }

    _addDomElements() {

        this.$widget = $(
            `<div class="center-block">
                <label for="sourceSelect">Change the video source:</label>
                <select id="sourceSelect" style="max-width:400px">
                </select>
            </div>

            <div>
                <a class="widget form-widget btn btn-primary" id="startButton" data-i18n="literacywidget.start">${t( 'literacywidget.start' )}</a>
                <a class="widget form-widget btn btn-secondary" id="resetButton" data-i18n="literacywidget.finish">${t( 'literacywidget.finish' )}</a>
            </div>

            <div>
                <video class="center-block" id="video" width="300" height="200" style="border: 1px solid gray"></video>
            </div>

            <pre id="result"></pre>`
        );
        $( this.element ).hide().after( this.$widget ).parent().addClass( 'clearfix' );
    }

    _updateValue() {
        const oldValue = this.originalInputValue;
        const newValue = this.value;

        // console.log( 'updating value by joining', this.points, 'old value', oldValue, 'new value', newValue );

        if ( oldValue !== newValue ) {
            this.originalInputValue = newValue;

            return true;
        } else {
            return false;
        }
    }

    _startDecoding() {
        $video.show();
        $result.hide();
        $start.hide();
        $stop.show();

        codeReader.decodeFromVideoDevice( selectedDeviceId, 'video', ( result, err ) => {
            if ( result ) {

                this.value = result.text;
                this._updateValue();
                this.element.dispatchEvent( events.Change() );

                $video.hide();
                $result.show();
                $start.show();
                $stop.hide();

                codeReader.stopContinuousDecode();
                codeReader.reset();
            }
            if ( err && !( err instanceof NotFoundException ) ) {
                console.error( err );
            }
        } );
    }

    _stopDecoding() {
        $video.hide();
        $result.show();
        $start.show();
        $stop.hide();

        codeReader.reset();
        this.value = '';
    }
    /**
     * @type {string}
     */
    get value() {
        return inputElement.value;
    }

    set value( value ) {
        value = value || '';
        inputElement.value = value;
        $result.text( value );
    }


}

export default Zxing;
