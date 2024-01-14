import Widget from '../../js/widget';

/**
 * @augments Widget
 */
class FormWidget extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.or-appearance-form input[type="text"]';
    }

    _init() {
        const fragment = document.createRange().createContextualFragment( '<a class="widget form-widget btn btn-primary" role="button" target="_blank" rel="noopener"/>' );

        this.element.classList.add( 'hide' );
        this.element.after( fragment );

        this.value = this.originalInputValue;
    }

    /**
     * Updates widget
     */
    update() {
        this.value = this.originalInputValue;
    }

    /**
     * @type {string}
     */
    get value() {
        return this.question.querySelector( '.form-widget' ).href;
    }

    set value( value ) {
        value = value || '';
        const link = this.question.querySelector( '.form-widget' );
        link.href = value;
        link.title = this.question.title;
        link.textContent = this.question.title;
    }
}

export default FormWidget;
