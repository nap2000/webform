import DrawWidget from '../../src/widget/draw/draw-widget';
import support from '../../src/js/support';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM1 =
    `<form class="or">
        <label class="question or-appearance-draw">
            <input name="/data/d" type="file" data-type-xml="binary" accept="image/*" />
        </label>
        <input />
    </form>`;
const FORM2 =
    `<form class="or">
        <label class="question or-appearance-signature">
            <input name="/data/s" type="file" data-type-xml="binary" accept="image/*" />
        </label>
        <input />
    </form>`;
const FORM3 =
    `<form class="or">
        <label class="question or-appearance-annotate">
            <input name="/data/a" type="file" data-type-xml="binary" accept="image/*" />
        </label>
        <input />
    </form>`;

[ FORM1, FORM2, FORM3 ].forEach( form => {
    runAllCommonWidgetTests( DrawWidget, form, '' );
} );

describe( 'draw widget', () => {

    it( 'does not instantiate for non image accept attributes', () => {
        const form = FORM1.replace( 'accept="image/*"', 'accept="something/else"' );
        const fragment = document.createRange().createContextualFragment( form );
        const control = fragment.querySelector( DrawWidget.selector );
        expect( control ).toEqual( null );
    } );

} );

describe( 'annotate widget image capture', () => {
    let touch;

    beforeEach( () => {
        touch = support.touch;
        support.touch = true;
    } );

    afterEach( () => {
        support.touch = touch;
    } );

    /**
     * @param {string} [appearance] - appearance of the question, defaults to annotate
     * @return {DrawWidget} the widget instance
     */
    const initWidget = ( appearance = 'annotate' ) => {
        const fragment = document.createRange().createContextualFragment(
            FORM3.replace( 'or-appearance-annotate', `or-appearance-annotate or-appearance-${appearance}` ) );

        return new DrawWidget( fragment.querySelector( DrawWidget.selector ) );
    };

    it( 'captures the image with buttons, above the canvas', () => {
        const widget = initWidget();
        const drawWidget = widget.question.querySelector( '.draw-widget' );
        const filePicker = drawWidget.querySelector( '.file-picker' );

        expect( filePicker.classList.contains( 'with-capture' ) ).toBe( true );
        expect( drawWidget.classList.contains( 'with-capture' ) ).toBe( true );
        expect( filePicker.querySelector( '.btn-capture .fa-camera' ) ).not.toBeNull();
        expect( filePicker.querySelector( '.btn-browse' ) ).not.toBeNull();
        // above the canvas, not in the 50px strip the file field lives in
        expect( filePicker.parentElement ).toBe( drawWidget );
        expect( filePicker.compareDocumentPosition( drawWidget.querySelector( '.draw-widget__body' ) ) &
            Node.DOCUMENT_POSITION_FOLLOWING ).toBeTruthy();
    } );

    it( 'requests the camera when the capture button is clicked', async() => {
        const widget = initWidget();
        const question = widget.question;
        const input = question.querySelector( 'input[type=file]' );
        const clicks = [];

        input.addEventListener( 'click', event => {
            clicks.push( input.getAttribute( 'capture' ) );
            event.preventDefault();
        } );

        // the buttons are enabled once the filemanager is ready
        await widget.initialize;
        await new Promise( resolve => setTimeout( resolve, 0 ) );

        question.querySelector( '.btn-capture' ).click();

        expect( clicks ).toEqual( [ 'environment' ] );
    } );

    it( 'does not offer existing images when the appearance forces a new one', () => {
        [ 'new', 'new-front', 'new-rear' ].forEach( appearance => {
            const question = initWidget( appearance ).question;

            expect( question.querySelector( '.btn-capture' ) ).not.toBeNull();
            expect( question.querySelector( '.btn-browse' ) ).toBeNull();
            expect( question.querySelector( 'input[type=file]' ).getAttribute( 'capture' ) )
                .toEqual( appearance === 'new-front' ? 'user' : 'environment' );
        } );
    } );

    it( 'opens the front camera for appearance "selfie", but still offers existing images', () => {
        const widget = initWidget( 'selfie' );
        const question = widget.question;

        expect( widget.props.captureFacing ).toEqual( 'user' );
        expect( question.querySelector( 'input[type=file]' ).hasAttribute( 'capture' ) ).toBe( false );
        expect( question.querySelector( '.btn-browse' ) ).not.toBeNull();
    } );

    it( 'hides the capture buttons once there is an image', () => {
        const widget = initWidget();
        const filePicker = widget.question.querySelector( '.file-picker' );

        widget._showFileName( 'annotation.png' );
        expect( filePicker.classList.contains( 'has-file' ) ).toBe( true );
        widget._showFileName( null );
        expect( filePicker.classList.contains( 'has-file' ) ).toBe( false );
    } );

    it( 'takes a selfie with the front camera in the page', async() => {
        let requested = null;

        Object.defineProperty( navigator, 'mediaDevices', {
            configurable: true,
            value: {
                getUserMedia: constraints => {
                    requested = constraints;
                    const canvas = document.createElement( 'canvas' );

                    canvas.width = 40;
                    canvas.height = 30;
                    canvas.getContext( '2d' ).fillRect( 0, 0, 40, 30 );

                    return Promise.resolve( canvas.captureStream() );
                }
            }
        } );

        const widget = initWidget( 'selfie' );
        const input = widget.question.querySelector( 'input[type=file]' );

        await widget.initialize;
        await new Promise( resolve => setTimeout( resolve, 0 ) );
        widget.question.querySelector( '.btn-capture' ).click();

        await new Promise( resolve => {
            const poll = () => document.querySelector( '.camera-capture__shutter:not([disabled])' ) ? resolve() : setTimeout( poll, 10 );

            poll();
        } );

        expect( requested.video.facingMode.ideal ).toEqual( 'user' );
        expect( input.hasAttribute( 'capture' ) ).toBe( false );

        document.querySelector( '.camera-capture__shutter' ).click();
        await new Promise( resolve => {
            const poll = () => input.files.length === 1 ? resolve() : setTimeout( poll, 10 );

            poll();
        } );

        expect( document.querySelector( '.camera-capture' ) ).toBeNull();
        expect( input.files[ 0 ].name ).toEqual( 'selfie.jpg' );

        delete navigator.mediaDevices;
    } );

    it( 'keeps the file field layout on a desktop browser', () => {
        support.touch = false;
        const drawWidget = initWidget().question.querySelector( '.draw-widget' );

        expect( drawWidget.querySelector( '.btn-capture' ) ).toBeNull();
        expect( drawWidget.querySelector( '.file-picker' ).parentElement.classList.contains( 'draw-widget__body' ) ).toBe( true );
    } );

} );

describe( 'draw widget full screen mode', () => {
    let touch;

    beforeEach( () => {
        touch = support.touch;
        support.touch = true;
    } );

    afterEach( () => {
        support.touch = touch;
        if ( history.state && history.state.drawWidgetFullScreen ) {
            history.back();
        }
    } );

    /**
     * @return {Promise<DrawWidget>} an initialized widget
     */
    const initWidget = async() => {
        const fragment = document.createRange().createContextualFragment( FORM3 );
        const widget = new DrawWidget( fragment.querySelector( DrawWidget.selector ) );

        await widget.initialize;
        await new Promise( resolve => setTimeout( resolve, 0 ) );

        return widget;
    };

    it( 'labels the button that closes the view, it is what saves the drawing', async() => {
        const widget = await initWidget();
        const done = widget.question.querySelector( '.hide-canvas-btn' );

        expect( done ).not.toBeNull();
        expect( done.classList.contains( 'btn-primary' ) ).toBe( true );
        expect( done.querySelector( '.icon-check' ) ).not.toBeNull();
    } );

    it( 'adds a history entry when the drawing view is opened', async() => {
        const widget = await initWidget();

        widget.question.querySelector( '.show-canvas-btn' ).click();

        expect( widget.$widget.hasClass( 'full-screen' ) ).toBe( true );
        expect( widget.fullScreenHistoryEntry ).toBe( true );
        expect( history.state.drawWidgetFullScreen ).toBe( true );
    } );

    it( 'closes the drawing view, and not the form, when the device back button is used', async() => {
        const widget = await initWidget();

        widget.question.querySelector( '.show-canvas-btn' ).click();
        // what the browser does for a back button press on the pushed entry
        window.dispatchEvent( new PopStateEvent( 'popstate' ) );

        expect( widget.$widget.hasClass( 'full-screen' ) ).toBe( false );
        expect( widget.fullScreenHistoryEntry ).toBe( false );
    } );

    it( 'does not add a second history entry when the view is reopened', async() => {
        const widget = await initWidget();
        const showBtn = widget.question.querySelector( '.show-canvas-btn' );

        showBtn.click();
        showBtn.click();

        expect( widget.fullScreenHistoryEntry ).toBe( true );
    } );

} );
