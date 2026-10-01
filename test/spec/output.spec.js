import $ from 'jquery';
import output from '../../src/js/output';

describe( 'Output', () => {

    /**
     * Run output.update on a single output whose expression evaluates to value
     *
     * @param {string} value - what the output's expression evaluates to
     * @return {Element} the output element after the update
     */
    function render( value ) {
        const html = document.createElement( 'form' );
        html.innerHTML = '<label class="question"><span class="question-label">Name: <span class="or-output" data-value="/data/name"> </span></span>' +
            '<input type="text" name="/data/name"></label>';
        const outputEl = html.querySelector( '.or-output' );

        output.form = {
            repeatsPresent: false,
            view: { html },
            getRelatedNodes: () => $( outputEl ),
            input: { getName: () => '/data/name', getIndex: () => 0 },
            model: { evaluate: () => value }
        };
        output.update();

        return outputEl;
    }

    it( 'keeps formatting markup', () => {
        const el = render( '<span style="color:red">Red</span> and <b>bold</b>' );
        expect( el.querySelector( 'span[style]' ) ).not.toBeNull();
        expect( el.querySelector( 'b' ).textContent ).toEqual( 'bold' );
    } );

    it( 'shows plain text, including quotes', () => {
        expect( render( 'it\'s "quoted"' ).textContent ).toEqual( 'it\'s "quoted"' );
    } );

    it( 'strips event handlers from an answer', () => {
        window.__outputXss = 0;
        const el = render( '<img src=x onerror="window.__outputXss=1">' );
        expect( el.querySelector( '[onerror]' ) ).toBeNull();
    } );

    it( 'strips scripts and form controls', () => {
        const el = render( '<script>window.__outputXss=1</script><input name="password"><a href="javascript:alert(1)">x</a>' );
        expect( el.querySelector( 'script' ) ).toBeNull();
        expect( el.querySelector( 'input' ) ).toBeNull();
        expect( el.querySelector( 'a' ).getAttribute( 'href' ) ).toBeNull();
    } );
} );
