import Geopicker from '../../src/widget/geo/geopicker';
import support from '../../src/js/support';
import { createTestCoordinates, createGeolocationLookupError, mockGetCurrentPosition } from '../helpers/geolocation';
import { runAllCommonWidgetTests } from '../helpers/test-widget';

const FORM =
    `<form class="or">
        <label class="question">
            <input name="/data/geo" type="text" data-type-xml="geoshape"/>
        </label>
    </form>`;
const SHAPE = '7.9377 -11.5845 0 0;7.9324 -11.5902 0 0;7.927 -11.5857 0 0;7.9377 -11.5845 0 0';

runAllCommonWidgetTests( Geopicker, FORM, SHAPE );

describe( 'geoshape widget', () => {
    let geoshapePicker;

    beforeEach( () => {
        const fragment = document.createRange().createContextualFragment( FORM );
        const control = fragment.querySelector( 'input' );
        geoshapePicker = new Geopicker( control );
    } );

    mockGetCurrentPosition( createTestCoordinates( {
        latitude: 48.66,
        longitude: -120.5,
        accuracy: 2500.12,
        altitude: 123,
    } ) );


    describe( 'KML to Leaflet conversion', () => {
        const kmlCoordinates = '81.601884,44.160723 83.529902,43.665148 82.947737,44.248831 81.509322,44.321015',
            a = {
                kml: `<coordinates>${kmlCoordinates}</coordinates>`,
                result: [
                    [ 44.160723, 81.601884 ],
                    [ 43.665148, 83.529902 ],
                    [ 44.248831, 82.947737 ],
                    [ 44.321015, 81.509322 ]
                ]
            },
            b = {
                kml: '<coordinates>   11.111,22.222 33.333,44.444  </coordinates>',
                result: [
                    [ 22.222, 11.111 ],
                    [ 44.444, 33.333 ]
                ]
            },
            gobbledigook = '<something< notquite </right>';

        it( 'works for space-separated KML <coordinates>', () => {
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( a.kml ) ).toEqual( a.result );
        } );

        it( 'works for newline-separated KML <coordinates>', () => {
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( a.kml.replace( ' ', '\n' ) ) ).toEqual( a.result );
        } );

        it( 'ignores gobbledigook outside of <coordinates>', () => {
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( a.kml + gobbledigook ) ).toEqual( a.result );
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( gobbledigook + a.kml ) ).toEqual( a.result );
        } );

        it( 'only extracts the values of the first <coordinates> if multiple are present', () => {
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( a.kml + b.kml ) ).toEqual( a.result );
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( b.kml + a.kml ) ).toEqual( b.result );
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( gobbledigook + b.kml + gobbledigook + a.kml + gobbledigook ) ).toEqual( b.result );
        } );

        it( 'works for the content of a single <coordinates> without the tags', () => {
            expect( geoshapePicker._convertKmlCoordinatesToLeafletCoordinates( kmlCoordinates ) ).toEqual( a.result );
        } );

    } );
} );

const GEOPOINT_FORM =
    `<form class="or">
        <label class="question">
            <input name="/data/geo" type="text" data-type-xml="geopoint"/>
        </label>
    </form>`;

describe( 'geopoint widget location detection', () => {
    const coordinates = createTestCoordinates( {
        latitude: 48.66,
        longitude: -120.5,
        accuracy: 12.5,
        altitude: 123,
    } );

    let touch;
    let control;
    let widget;
    let lookups;

    /**
     * @param {Array<window.GeolocationPositionError|window.GeolocationCoordinates>} results - result of each consecutive lookup
     */
    const mockLookups = ( results ) => {
        lookups = [];
        spyOn( navigator.geolocation, 'getCurrentPosition' ).and.callFake( ( success, error, options ) => {
            const result = results[ Math.min( lookups.length, results.length - 1 ) ];

            lookups.push( options );

            if ( result instanceof window.GeolocationPositionError ) {
                error( result );
            } else {
                success( { coords: result, timestamp: Date.now() } );
            }
        } );
    };

    const clickDetect = () => {
        widget.$detect[ 0 ].click();

        // the lookup and its handlers run in promise callbacks
        return new Promise( resolve => setTimeout( resolve, 0 ) );
    };

    beforeEach( () => {
        touch = support.touch;
        support.touch = true;   // a mobile device, where the map is not shown
        spyOn( window, 'alert' );
    } );

    afterEach( () => {
        support.touch = touch;
    } );

    /**
     * Creates a geopoint question and instantiates the widget for it.
     */
    const initWidget = () => {
        const fragment = document.createRange().createContextualFragment( GEOPOINT_FORM );
        control = fragment.querySelector( 'input' );
        widget = new Geopicker( control );
    };

    it( 'records the position when the detect button is clicked', async() => {
        mockLookups( [ coordinates ] );
        initWidget();

        await clickDetect();

        expect( lookups.length ).toEqual( 1 );
        expect( control.value ).toEqual( '48.66 -120.5 123 12.5' );
        expect( window.alert ).not.toHaveBeenCalled();
    } );

    it( 'does not ask for a location before the button is clicked, the map is not shown', () => {
        mockLookups( [ coordinates ] );
        initWidget();

        expect( lookups.length ).toEqual( 0 );
    } );

    it( 'accepts a network position when a high accuracy fix is not available', async() => {
        mockLookups( [ createGeolocationLookupError( 'TIMEOUT' ), coordinates ] );
        initWidget();

        await clickDetect();

        expect( lookups.length ).toEqual( 2 );
        expect( lookups[ 0 ].enableHighAccuracy ).toBe( true );
        expect( lookups[ 1 ].enableHighAccuracy ).toBe( false );
        expect( control.value ).toEqual( '48.66 -120.5 123 12.5' );
    } );

    it( 'reports a timeout instead of failing silently', async() => {
        mockLookups( [ createGeolocationLookupError( 'TIMEOUT' ) ] );
        initWidget();

        await clickDetect();

        expect( control.value ).toEqual( '' );
        expect( window.alert ).toHaveBeenCalled();
    } );

    it( 'reports a refused permission without retrying', async() => {
        mockLookups( [ createGeolocationLookupError( 'PERMISSION_DENIED' ) ] );
        initWidget();

        await clickDetect();

        expect( lookups.length ).toEqual( 1 );
        expect( window.alert ).toHaveBeenCalled();
    } );

    it( 'shows a busy state while detecting and clears it afterwards', async() => {
        mockLookups( [ coordinates ] );
        initWidget();

        expect( widget.$detect.hasClass( 'detecting' ) ).toBe( false );

        const detected = clickDetect();

        expect( widget.detecting ).toBe( true );
        expect( widget.$detect.find( '.icon' ).hasClass( 'fa-spin' ) ).toBe( true );

        await detected;

        expect( widget.detecting ).toBe( false );
        expect( widget.$detect.find( '.icon' ).hasClass( 'fa-spin' ) ).toBe( false );
    } );

    it( 'ignores further clicks while a lookup is running', async() => {
        mockLookups( [ coordinates ] );
        initWidget();

        widget._setDetecting( true );
        await clickDetect();

        expect( lookups.length ).toEqual( 0 );
    } );

} );

describe( 'geoshape and geotrace editing', () => {
    const TRACE_FORM = FORM.replace( 'geoshape', 'geotrace' );
    const TRACE = '7.9377 -11.5845 0 0;7.9324 -11.5902 0 0;7.927 -11.5857 0 0';
    let touch;

    beforeEach( () => {
        touch = support.touch;
        support.touch = true;   // no map, so the points are edited without one
    } );

    afterEach( () => {
        support.touch = touch;
    } );

    const initWidget = ( form, value ) => {
        const fragment = document.createRange().createContextualFragment( form );
        const control = fragment.querySelector( 'input' );
        control.value = value;

        return new Geopicker( control );
    };

    it( 'keeps a closed shape as a ring, with each point once, and writes it back closed', () => {
        const widget = initWidget( FORM, SHAPE );
        expect( widget.points.length ).toEqual( 3 );
        expect( widget.closed ).toEqual( true );
        expect( widget.value ).toEqual( SHAPE );
    } );

    it( 'does not close a trace', () => {
        const widget = initWidget( TRACE_FORM, TRACE );
        expect( widget.closed ).toEqual( false );
        expect( widget.value ).toEqual( TRACE );
    } );

    it( 'removes a point without asking, and the shape opens when fewer than three points are left', () => {
        const widget = initWidget( FORM, SHAPE );
        widget._setCurrent( 1 );
        widget.$widget.find( '.btn-remove' ).trigger( 'click' );
        expect( widget.points.length ).toEqual( 2 );
        expect( widget.closed ).toEqual( false );
        expect( widget.value ).toEqual( '7.9377 -11.5845 0 0;7.927 -11.5857 0 0' );
    } );

    it( 'undoes the removal of a point', () => {
        const widget = initWidget( FORM, SHAPE );
        widget._setCurrent( 1 );
        widget.$widget.find( '.btn-remove' ).trigger( 'click' );
        widget.$widget.find( '.geo-undo' ).trigger( 'click' );
        expect( widget.value ).toEqual( SHAPE );
        expect( widget.closed ).toEqual( true );
        expect( widget.$widget.find( '.geo-undo' ).prop( 'disabled' ) ).toEqual( true );
    } );

    it( 'removes all points in one step, which can be undone', () => {
        const widget = initWidget( TRACE_FORM, TRACE );
        widget.$widget.find( '.geo-clear' ).trigger( 'click' );
        expect( widget.value ).toEqual( '' );
        expect( widget.$points.find( '.point-list' ).length ).toEqual( 0 );
        widget.$widget.find( '.geo-undo' ).trigger( 'click' );
        expect( widget.value ).toEqual( TRACE );
        expect( widget.$points.find( '.point-list' ).length ).toEqual( 3 );
    } );

    it( 'adds a point in the middle of a side', () => {
        const widget = initWidget( TRACE_FORM, TRACE );
        widget._insertWithCheck( 1, { lat: 7.935, lng: -11.587 } );
        expect( widget.points.length ).toEqual( 4 );
        expect( widget.value ).toEqual( '7.9377 -11.5845 0 0;7.935 -11.587 0 0;7.9324 -11.5902 0 0;7.927 -11.5857 0 0' );
    } );
} );

describe( 'geoshape on a map', () => {
    let touch;
    let container;

    beforeEach( () => {
        touch = support.touch;
        support.touch = false;  // a desktop, where the map is shown
        container = document.createElement( 'div' );
        document.body.appendChild( container );
    } );

    afterEach( () => {
        support.touch = touch;
        container.remove();
    } );

    const wait = ms => new Promise( resolve => setTimeout( resolve, ms ) );

    it( 'moves the whole shape when its inside is dragged with a mouse', async() => {
        container.innerHTML = FORM;
        const control = container.querySelector( 'input' );
        control.value = SHAPE;
        const widget = new Geopicker( control );
        const canvas = container.querySelector( '.map-canvas' );
        canvas.style.width = '400px';
        canvas.style.height = '300px';

        await widget.loadMap;
        widget.map.invalidateSize();
        await wait( 100 );      // the map is fitted to the shape after a timeout

        const el = widget.polygon.getElement();
        expect( el ).toBeTruthy();
        expect( el.classList.contains( 'enketo-geo-movable' ) ).toEqual( true );

        const box = el.getBoundingClientRect();
        const x = box.left + box.width / 2;
        const y = box.top + box.height / 2;
        const before = widget.points.map( p => p.slice( 0, 2 ) );
        const centre = widget.map.getCenter();

        const fire = ( type, dx, dy ) => el.dispatchEvent( new PointerEvent( type, {
            bubbles: true, cancelable: true, pointerId: 1, pointerType: 'mouse', button: 0,
            clientX: x + dx, clientY: y + dy
        } ) );
        fire( 'pointerdown', 0, 0 );
        fire( 'pointermove', 20, 10 );
        fire( 'pointermove', 40, 20 );
        fire( 'pointerup', 40, 20 );

        // every point moved by the same amount, the shape is still closed and the map did not pan
        const dLat = widget.points[ 0 ][ 0 ] - before[ 0 ][ 0 ];
        const dLng = widget.points[ 0 ][ 1 ] - before[ 0 ][ 1 ];
        expect( dLat ).toBeLessThan( 0 );
        expect( dLng ).toBeGreaterThan( 0 );
        widget.points.forEach( ( p, i ) => {
            expect( p[ 0 ] - before[ i ][ 0 ] ).toBeCloseTo( dLat, 5 );
            expect( p[ 1 ] - before[ i ][ 1 ] ).toBeCloseTo( dLng, 5 );
        } );
        expect( widget.closed ).toEqual( true );
        expect( widget.map.getCenter().equals( centre ) ).toEqual( true );
        expect( widget.value.split( ';' ).length ).toEqual( 4 );

        // and it can be undone
        widget.$widget.find( '.geo-undo' ).trigger( 'click' );
        expect( widget.value ).toEqual( SHAPE );
    } );
} );

describe( 'maps on a phone or tablet', () => {
    let touch;

    beforeEach( () => {
        touch = support.touch;
        support.touch = true;
    } );

    afterEach( () => {
        support.touch = touch;
    } );

    const mapButtons = type => {
        const fragment = document.createRange().createContextualFragment( FORM.replace( 'geoshape', type ) );
        const widget = new Geopicker( fragment.querySelector( 'input' ) );

        return widget.$widget.find( '.show-map-btn' ).length;
    };

    it( 'always offers a map for a line or shape, as FieldTask does', () => {
        expect( mapButtons( 'geoshape' ) ).toEqual( 1 );
        expect( mapButtons( 'geotrace' ) ).toEqual( 1 );
        expect( mapButtons( 'geocompound' ) ).toEqual( 1 );
    } );

    it( 'offers a map for a geopoint only with the maps or placement-map appearance', () => {
        expect( mapButtons( 'geopoint' ) ).toEqual( 0 );
    } );
} );
