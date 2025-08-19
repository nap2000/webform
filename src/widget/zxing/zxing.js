
import Widget from '../../js/widget';
import { NotFoundException, BrowserMultiFormatReader } from '@zxing/library';
import $ from 'jquery';
import { t } from 'enketo/translator';
import events from '../../js/event';

const codeReader = new BrowserMultiFormatReader();
let selectedDeviceId;
let $video;
let videoId;
let $start;
let $stop;
let $sourceSelect;
let $result;

/**
 * Barcode and QR code scanning
 */
class Zxing extends Widget {

    static get selector() {
        return '.question input.zxing-result';
    }

    static get helpersRequired() {
        return [ 'evaluate' ];
    }

    _init() {

        this._addDomElements();
        $video = this.$widget.find( '.video' );
        videoId = 'video' + this.element.getAttribute( 'name' );
        $video.attr( 'id', videoId );
        $sourceSelect = this.$widget.find( '.sourceSelect' );
        $start = this.$widget.find( '.startButton' );
        $stop = this.$widget.find( '.stopButton' );
        $result = $( '#result' );

        $start.on( 'click', () => {
            this._startDecoding();
        } );

        $stop.on( 'click', () => {
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
                        $sourceSelect.append( sourceOption );
                    } );

                    $sourceSelect.onchange = () => {
                        selectedDeviceId = $sourceSelect.val();
                        if( codeReader.isVideoPlaying( $video[0] ) ) {
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
                <label data-i18n="barcode.select_device">${t( 'barcode.select_device' )}</label>
                <select class="sourceSelect" style="max-width:400px">
                </select>
            </div>

            <div>
                <a class="widget form-widget btn btn-primary startButton" data-i18n="literacywidget.start">${t( 'literacywidget.start' )}</a>
                <a class="widget form-widget btn btn-secondary stopButton" data-i18n="barcode.stop">${t( 'barcode.stop' )}</a>
            </div>

            <div>
                <video class="center-block video" width="300" height="200" style="border: 1px solid gray"></video>
            </div>

            <div id="result"></div>`
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

        codeReader.decodeFromVideoDevice( selectedDeviceId, videoId, ( result, err ) => {
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
        return this.element.value;
    }

    set value( value ) {
        value = value || '';
        this.element.value = value;
        $result.text( value );
    }


}

export default Zxing;
