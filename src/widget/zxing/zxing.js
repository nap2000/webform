import Widget from '../../js/widget';
import $ from 'jquery';
import { t } from 'enketo/translator';
import events from '../../js/event';
import config from 'enketo/config';

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
        return this._loadZxingLibrary()
            .then( ( { BrowserMultiFormatReader, NotFoundException } ) => {
                this._NotFoundException = NotFoundException;

                this._addDomElements();

                this.codeReader = new BrowserMultiFormatReader();

                this.$video = this.$widget.find( '.video' );
                this.videoId = 'video' + this.element.getAttribute( 'name' );
                this.$video.attr( 'id', this.videoId );
                this.$sourceSelect = this.$widget.find( '.sourceSelect' );
                this.$start = this.$widget.find( '.startButton' );
                this.$stop = this.$widget.find( '.stopButton' );
                this.$showResult = this.$widget.find( '.showResult' );

                this.$start.on( 'click', () => {
                    this._startDecoding();
                } );

                this.$stop.on( 'click', () => {
                    this._stopDecoding();
                } );

                this.$video.hide();
                this.$stop.hide();

                this.codeReader.listVideoInputDevices()
                    .then( ( videoInputDevices ) => {
                        this.selectedDeviceId = videoInputDevices[0].deviceId;
                        if ( videoInputDevices.length >= 1 ) {
                            videoInputDevices.forEach( ( element ) => {
                                let sourceOption = document.createElement( 'option' );
                                sourceOption.text = element.label;
                                sourceOption.value = element.deviceId;
                                this.$sourceSelect.append( sourceOption );
                            } );

                            this.$sourceSelect.on( 'change', ( event ) => {
                                this.selectedDeviceId = event.target.value;
                                if ( this.codeReader.isVideoPlaying( this.$video[0] ) ) {
                                    this.codeReader.reset();
                                    this._startDecoding();
                                }
                            } );
                        }
                    } )
                    .catch( ( err ) => {
                        console.error( err );
                    } );

                // load default value
                if ( this.originalInputValue ) {
                    this.value = this.originalInputValue;
                }
            } );
    }

    /**
     * Loads the ZXing bundle on demand. Returns a promise resolving to { BrowserMultiFormatReader, NotFoundException }.
     *
     * @return {Promise}
     */
    _loadZxingLibrary() {
        if ( window.ZXing ) {
            return Promise.resolve( window.ZXing );
        }

        return new Promise( ( resolve, reject ) => {
            const script = document.createElement( 'script' );
            script.src = config.zxingBundlePath || '/build/js/zxing-bundle.js';
            script.onload = () => resolve( window.ZXing );
            script.onerror = () => reject( new Error( 'Failed to load ZXing library from ' + script.src ) );
            document.head.appendChild( script );
        } );
    }

    _addDomElements() {
        this.$widget = $(
            `<div class="center-block">
                <label data-i18n="barcode.select_device">${t( 'barcode.select_device' )}</label>
                <select class="sourceSelect ignore" style="max-width:400px">
                </select>
            </div>

            <div>
                <a class="widget form-widget btn btn-primary startButton" data-i18n="literacywidget.start">${t( 'literacywidget.start' )}</a>
                <a class="widget form-widget btn btn-secondary stopButton" data-i18n="barcode.stop">${t( 'barcode.stop' )}</a>
            </div>

            <div>
                <video class="center-block video" style="border: 1px solid gray"></video>
            </div>

            <div>
                <p class="showResult"></p>
            </div>`
        );
        $( this.element ).hide().after( this.$widget ).parent().addClass( 'clearfix' );
    }

    _updateValue() {
        const oldValue = this.originalInputValue;
        const newValue = this.value;

        if ( oldValue !== newValue ) {
            this.originalInputValue = newValue;

            return true;
        } else {
            return false;
        }
    }

    _startDecoding() {
        this.$video.show();
        this.$showResult.hide();
        this.$start.hide();
        this.$stop.show();

        this.codeReader.decodeFromVideoDevice( this.selectedDeviceId, this.videoId, ( result, err ) => {
            if ( result ) {
                this.value = result.text;
                this._updateValue();
                this.element.dispatchEvent( events.Change() );

                this.$video.hide();
                this.$showResult.show();
                this.$start.show();
                this.$stop.hide();

                this.codeReader.reset();
            }
            if ( err && !( err instanceof this._NotFoundException ) ) {
                console.error( err );
            }
        } );
    }

    _stopDecoding() {
        this.$video.hide();
        this.$showResult.show();
        this.$start.show();
        this.$stop.hide();

        this.codeReader.reset();
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
        this.$showResult.text( value );
    }
}

export default Zxing;
