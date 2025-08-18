
import Widget from '../../js/widget';
import { NotFoundException, BrowserMultiFormatReader } from '@zxing/library';
import $ from 'jquery';
import { t } from 'enketo/translator';
import events from '../../js/event';

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

        let selectedDeviceId;
        const name = this.props.name;
        const codeReader = new BrowserMultiFormatReader();

        console.log( 'zxing code reader initialized' );
        codeReader.listVideoInputDevices()
            .then( ( videoInputDevices ) => {
                const sourceSelect = document.getElementById( 'sourceSelect' );
                selectedDeviceId = videoInputDevices[0].deviceId;
                if ( videoInputDevices.length >= 1 ) {
                    videoInputDevices.forEach( ( element ) => {
                        const sourceOption = document.createElement( 'option' );
                        sourceOption.text = element.label;
                        sourceOption.value = element.deviceId;
                        sourceSelect.appendChild( sourceOption );
                    } );

                    sourceSelect.onchange = () => {
                        selectedDeviceId = sourceSelect.value;
                    };

                    const sourceSelectPanel = document.getElementById( 'sourceSelectPanel' );
                    sourceSelectPanel.style.display = 'block';
                }

                document.getElementById( 'startButton' ).addEventListener( 'click', () => {
                    codeReader.decodeFromVideoDevice( selectedDeviceId, 'video', ( result, err ) => {
                        if ( result ) {
                            console.log( result );
                            this._updateValue();
                            this.value = result.text;
                            $( '.zxing-result' ).text( result.text );
                            this.element.dispatchEvent( events.Change() );
                            codeReader.stopContinuousDecode();
                            codeReader.reset();
                        }
                        if ( err && !( err instanceof NotFoundException ) ) {
                            console.error( err );
                        }
                    } );
                    console.log( `Started continuous decode from camera with id ${selectedDeviceId}` );
                } );

                document.getElementById( 'resetButton' ).addEventListener( 'click', () => {
                    codeReader.reset();
                    document.getElementById( 'result' ).textContent = '';
                    console.log( 'Reset.' );
                } );

            } )
            .catch( ( err ) => {
                console.error( err );
            } );


        // load default value
        if ( this.originalInputValue ) {
            this.value = this.originalInputValue;
        }
        this.input = this.element.querySelector( `input[name="${name}"]` );

    }

    _addDomElements() {

        this.$widget = $(
            `<div>
                <a class="widget form-widget btn btn-primary" id="startButton" data-i18n="literacywidget.start">${t( 'literacywidget.start' )}</a>
                <a class="widget form-widget btn btn-secondary" id="resetButton" data-i18n="literacywidget.finish">${t( 'literacywidget.finish' )}</a>
            </div>

            <div>
                <video class="center-block" id="video" width="300" height="200" style="border: 1px solid gray"></video>
            </div>

            <pre class="zxing-result"></pre>

            <div class="center-block" id="sourceSelectPanel">
                <label for="sourceSelect">Change the video source:</label>
                <select id="sourceSelect" style="max-width:400px">
                </select>
            </div`
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

    /**
     * @type {string}
     */
    get value() {
        return this.question.querySelector( '.zxing-result' ).value;
    }

    set value( value ) {
        value = value || '';
        this.question.querySelector( '.zxing-result' ).value = value;
    }


}

export default Zxing;
