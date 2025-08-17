
import Widget from '../../js/widget';
import { NotFoundException, BrowserMultiFormatReader } from '@zxing/library';
import $ from 'jquery';
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

        console.log( 'ZXing code reader initialized' );
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
                            this.element.dispatchEvent( events.Change() );
                            codeReader.stopContinuousDecode();
                        }
                        if ( err && !( err instanceof NotFoundException ) ) {
                            console.error( err );
                            this.question.querySelector( '.zxing-result' ).textContent = err;
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
                <a class="button btn btn-default " id="startButton">Start</a>
                <a class="button btn btn-default " id="resetButton">Reset</a>
            </div>

            <div>
                <video id="video" width="300" height="200" style="border: 1px solid gray"></video>
            </div>

            <div id="sourceSelectPanel" style="display:none">
                <label for="sourceSelect">Change video source:</label>
                <select id="sourceSelect" style="max-width:400px">
                </select>
            </div`
        );
        $( this.element ).after( this.$widget ).parent().addClass( 'clearfix' );
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
