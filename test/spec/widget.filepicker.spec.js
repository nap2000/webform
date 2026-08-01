import Filepicker from '../../src/widget/file/filepicker';
import support from '../../src/js/support';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM =
    `<form class="or">
        <label class="question">
            <input name="/data/d" type="file" data-type-xml="binary" />
        </label>
        <input />
    </form>`;

runAllCommonWidgetTests( Filepicker, FORM, '' );

/**
 * Creates a media question and instantiates the widget for it.
 *
 * @param {object} [options] - question options
 * @param {string} [options.appearance] - appearance of the question, e.g. 'new'
 * @param {string} [options.capture] - value of a capture attribute set by the server
 * @param {string} [options.accept] - accepted media type
 * @return {Filepicker} the widget instance
 */
const initQuestion = ( { appearance, capture, accept = 'image/*' } = {} ) => {
    const fragment = document.createRange().createContextualFragment(
        `<form class="or">
            <label class="question${appearance ? ` or-appearance-${appearance}` : ''}">
                <input name="/data/img" type="file" data-type-xml="binary" accept="${accept}"${capture !== undefined ? ` capture="${capture}"` : ''} />
            </label>
        </form>` );

    return new Filepicker( fragment.querySelector( Filepicker.selector ) );
};

/**
 * Replaces navigator.mediaDevices, which decides whether the camera can be opened in the page.
 *
 * @param {object|undefined} mediaDevices - the stub, or undefined for a browser without camera access
 */
const stubMediaDevices = mediaDevices => {
    Object.defineProperty( navigator, 'mediaDevices', { value: mediaDevices, configurable: true } );
};

/**
 * @param {Function} condition - condition to wait for
 * @return {Promise} resolves once the condition is met
 */
const waitFor = condition => new Promise( resolve => {
    const poll = () => condition() ? resolve() : setTimeout( poll, 10 );

    poll();
} );

describe( 'Filepicker camera capture', () => {
    let touch;

    beforeEach( () => {
        touch = support.touch;
        support.touch = true;
        // the camera of the device is used unless a test asks for a camera in the page
        stubMediaDevices( undefined );
    } );

    afterEach( () => {
        support.touch = touch;
        delete navigator.mediaDevices;
    } );

    it( 'requests the rear camera for appearance "new", without offering existing files', () => {
        const widget = initQuestion( { appearance: 'new' } );

        expect( widget.element.getAttribute( 'capture' ) ).toEqual( 'environment' );
        expect( widget.question.querySelector( '.btn-capture' ) ).not.toBeNull();
        expect( widget.question.querySelector( '.btn-browse' ) ).toBeNull();
    } );

    it( 'opens the front camera for appearance "selfie", but still offers existing files', () => {
        const widget = initQuestion( { appearance: 'selfie' } );

        expect( widget.captureFacing ).toEqual( 'user' );
        expect( widget.element.hasAttribute( 'capture' ) ).toBe( false );
        expect( widget.question.querySelector( '.btn-capture' ) ).not.toBeNull();
        expect( widget.question.querySelector( '.btn-browse' ) ).not.toBeNull();
    } );

    it( 'requires a new file for the ODK appearance "new-rear"', () => {
        const widget = initQuestion( { appearance: 'new-rear' } );

        expect( widget.element.getAttribute( 'capture' ) ).toEqual( 'environment' );
        expect( widget.question.querySelector( '.btn-browse' ) ).toBeNull();
    } );

    it( 'opens the front camera and requires a new file for the ODK appearance "new-front"', () => {
        const widget = initQuestion( { appearance: 'new-front' } );

        expect( widget.element.getAttribute( 'capture' ) ).toEqual( 'user' );
        expect( widget.question.querySelector( '.btn-browse' ) ).toBeNull();
    } );

    it( 'converts a legacy capture="camera" attribute into a value browsers understand', () => {
        expect( initQuestion( { capture: 'camera' } ).element.getAttribute( 'capture' ) ).toEqual( 'environment' );
    } );

    it( 'adds a capture button, without forcing the camera, if no appearance is set', () => {
        const widget = initQuestion();

        expect( widget.element.hasAttribute( 'capture' ) ).toBe( false );
        expect( widget.question.querySelector( '.btn-capture' ) ).not.toBeNull();
    } );

    it( 'makes the capture button the first, primary control and browsing a secondary button', () => {
        const filePicker = initQuestion().question.querySelector( '.file-picker' );

        expect( filePicker.classList.contains( 'with-capture' ) ).toBe( true );
        expect( filePicker.firstElementChild.classList.contains( 'btn-capture' ) ).toBe( true );
        expect( filePicker.querySelector( '.btn-capture' ).classList.contains( 'btn-primary' ) ).toBe( true );
        expect( filePicker.querySelector( '.btn-browse' ) ).not.toBeNull();
    } );

    it( 'labels the capture and browse buttons per media type', () => {
        [
            { accept: 'image/*', captureIcon: 'fa-camera', browseIcon: 'fa-picture-o' },
            { accept: 'video/*', captureIcon: 'fa-video-camera', browseIcon: 'fa-film' },
            { accept: 'audio/*', captureIcon: 'fa-microphone', browseIcon: 'fa-music' }
        ].forEach( ( { accept, captureIcon, browseIcon } ) => {
            const question = initQuestion( { accept } ).question;

            expect( question.querySelector( `.btn-capture .${captureIcon}` ) ).not.toBeNull();
            expect( question.querySelector( `.btn-browse .${browseIcon}` ) ).not.toBeNull();
        } );
    } );

    it( 'hides the capture and browse buttons while there is a file', () => {
        const widget = initQuestion();
        const filePicker = widget.question.querySelector( '.file-picker' );

        expect( filePicker.classList.contains( 'has-file' ) ).toBe( false );
        widget._showFileName( 'photo.jpg' );
        expect( filePicker.classList.contains( 'has-file' ) ).toBe( true );
        widget._showFileName( '' );
        expect( filePicker.classList.contains( 'has-file' ) ).toBe( false );
    } );

    it( 'does not add a capture button on non-mobile devices', () => {
        support.touch = false;

        expect( initQuestion().question.querySelector( '.btn-capture' ) ).toBeNull();
    } );

    it( 'does not add a capture button for a non-media question', () => {
        const question = initQuestion( { accept: 'application/pdf' } ).question;

        expect( question.querySelector( '.btn-capture' ) ).toBeNull();
        expect( question.querySelector( '.file-picker' ).classList.contains( 'with-capture' ) ).toBe( false );
    } );

    it( 'asks the camera app of the device for the front camera if the page cannot open a camera', async() => {
        const widget = initQuestion( { appearance: 'selfie' } );

        await new Promise( resolve => setTimeout( resolve, 0 ) );
        widget.question.querySelector( '.btn-capture' ).click();

        expect( widget.element.getAttribute( 'capture' ) ).toEqual( 'user' );
    } );

    it( 'requests the camera on capture button click and releases it for the browse button', async() => {
        const widget = initQuestion();
        const question = widget.question;

        // the widget enables its buttons and adds its click handlers once the filemanager is ready
        await new Promise( resolve => setTimeout( resolve, 0 ) );

        question.querySelector( '.btn-capture' ).click();
        expect( widget.element.getAttribute( 'capture' ) ).toEqual( 'environment' );

        question.querySelector( '.btn-browse' ).click();
        expect( widget.element.hasAttribute( 'capture' ) ).toBe( false );
    } );

} );

describe( 'Filepicker front camera in the page', () => {
    let touch;
    let requested;

    /**
     * A camera that hands out a real stream, so that a frame can be grabbed from it.
     *
     * @param {object} [options] - camera options
     * @param {boolean} [options.available] - whether permission is given
     */
    const stubCamera = ( { available = true } = {} ) => {
        stubMediaDevices( {
            getUserMedia: constraints => {
                requested = constraints;
                if ( !available ) {
                    return Promise.reject( new Error( 'Permission denied' ) );
                }
                const canvas = document.createElement( 'canvas' );

                canvas.width = 40;
                canvas.height = 30;
                canvas.getContext( '2d' ).fillRect( 0, 0, 40, 30 );

                return Promise.resolve( canvas.captureStream() );
            }
        } );
    };

    /**
     * @param {Filepicker} widget - the widget under test
     * @return {Promise} resolves once the camera preview is ready to take a photo
     */
    const openCamera = async widget => {
        // the widget enables its buttons and adds its click handlers once the filemanager is ready
        await new Promise( resolve => setTimeout( resolve, 0 ) );
        widget.question.querySelector( '.btn-capture' ).click();

        return waitFor( () => document.querySelector( '.camera-capture__shutter:not([disabled])' ) );
    };

    beforeEach( () => {
        touch = support.touch;
        support.touch = true;
        requested = null;
        stubCamera();
    } );

    afterEach( () => {
        support.touch = touch;
        delete navigator.mediaDevices;
        const camera = document.querySelector( '.camera-capture' );
        if ( camera ) {
            camera.remove();
        }
    } );

    it( 'takes a selfie with the front camera in the page, because Android ignores capture="user"', async() => {
        const widget = initQuestion( { appearance: 'selfie' } );

        await openCamera( widget );

        expect( requested.video.facingMode.ideal ).toEqual( 'user' );
        expect( widget.element.hasAttribute( 'capture' ) ).toBe( false );
        expect( document.querySelector( '.camera-capture' ).classList.contains( 'camera-capture--mirrored' ) ).toBe( true );

        document.querySelector( '.camera-capture__shutter' ).click();
        await waitFor( () => widget.element.files.length === 1 );

        expect( widget.element.files[ 0 ].name ).toEqual( 'selfie.jpg' );
        expect( widget.element.files[ 0 ].type ).toEqual( 'image/jpeg' );
        expect( document.querySelector( '.camera-capture' ) ).toBeNull();
    } );

    it( 'keeps the file empty and closes the camera when the capture is cancelled', async() => {
        const widget = initQuestion( { appearance: 'selfie' } );

        await openCamera( widget );
        document.querySelector( '.camera-capture__cancel' ).click();

        expect( document.querySelector( '.camera-capture' ) ).toBeNull();
        expect( widget.element.files.length ).toEqual( 0 );
    } );

    it( 'falls back to the camera app of the device if the camera cannot be used', async() => {
        stubCamera( { available: false } );
        const widget = initQuestion( { appearance: 'selfie' } );

        await new Promise( resolve => setTimeout( resolve, 0 ) );
        widget.question.querySelector( '.btn-capture' ).click();
        await waitFor( () => widget.element.hasAttribute( 'capture' ) );

        expect( widget.element.getAttribute( 'capture' ) ).toEqual( 'user' );
        expect( document.querySelector( '.camera-capture' ) ).toBeNull();
    } );

    it( 'uses the camera app of the device for a back camera capture', async() => {
        const widget = initQuestion( { appearance: 'new' } );

        await new Promise( resolve => setTimeout( resolve, 0 ) );
        widget.question.querySelector( '.btn-capture' ).click();

        expect( requested ).toBeNull();
        expect( widget.element.getAttribute( 'capture' ) ).toEqual( 'environment' );
    } );

    it( 'uses the camera app of the device for a video or audio question', async() => {
        for ( const accept of [ 'video/*', 'audio/*' ] ) {
            const widget = initQuestion( { appearance: 'selfie', accept } );

            await new Promise( resolve => setTimeout( resolve, 0 ) );
            widget.question.querySelector( '.btn-capture' ).click();

            expect( requested ).toBeNull();
            expect( widget.element.getAttribute( 'capture' ) ).toEqual( 'user' );
        }
    } );

} );
