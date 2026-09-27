import Widget from '../../js/widget';
import { t } from 'enketo/translator';

/**
 * Shows a conversation question, held as a json array of messages, as a read only chat.
 * Messages are shown oldest first and the chat opens scrolled to the newest.
 * Matches formatConversation() in the Smap console and analysis pages.
 *
 * @augments Widget
 */
class ConversationWidget extends Widget {
    /**
     * @type {string}
     */
    static get selector() {
        return '.or-appearance-conversation input[type="text"]';
    }

    _init() {
        const fragment = document.createRange().createContextualFragment( '<div class="widget conversation-widget"></div>' );

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
        return this.originalInputValue;
    }

    set value( value ) {
        this.question.querySelector( '.conversation-widget' ).innerHTML = ConversationWidget.format( value );
    }

    /**
     * Format a conversation as html
     *
     * @param {string} value - json array of messages
     * @return {string} html
     */
    static format( value ) {
        let conv;

        try {
            conv = JSON.parse( value || '[]' );
        } catch ( e ) {
            return ConversationWidget.encode( value );     // Not a conversation, show it as it is
        }
        if ( !Array.isArray( conv ) || conv.length === 0 ) {
            return '';
        }

        // column-reverse on the outer div opens the chat scrolled to the bottom, where the newest message is
        const h = [ '<div class="conv"><div>' ];
        conv.forEach( msg => {
            const channel = msg.channel || 'sms';
            const dir = msg.inbound ? t( 'conversation.received' ) : t( 'conversation.sent' );

            h.push( `<div class="conv-row ${msg.inbound ? 'conv-row-from' : 'conv-row-to'}">` );
            h.push( `<div class="conv-bubble ${msg.inbound ? 'conv-from' : 'conv-to'} ${ConversationWidget.encode( channel )}">` );
            h.push( '<div class="conv-meta">' );
            h.push( `<span aria-hidden="true">${msg.inbound ? '&larr;' : '&rarr;'}</span>` );
            h.push( `<span class="visually-hidden">${ConversationWidget.encode( dir )}</span> ` );
            h.push( ConversationWidget.encode( ConversationWidget.channelName( channel ) ) );
            if ( msg.ts ) {
                h.push( ` <time datetime="${ConversationWidget.encode( msg.ts )}">${ConversationWidget.encode( msg.ts )}</time>` );
            }
            if ( msg.theirNumber ) {
                h.push( ` ${ConversationWidget.encode( msg.theirNumber )}` );
            }
            h.push( '</div>' );
            h.push( ConversationWidget.encode( msg.msg ) );
            h.push( '</div></div>' );
        } );
        h.push( '</div></div>' );

        return h.join( '' );
    }

    /**
     * @param {string} channel - sms, whatsapp or email
     * @return {string} name to show
     */
    static channelName( channel ) {
        if ( channel === 'whatsapp' ) {
            return 'WhatsApp';
        }
        if ( channel === 'email' ) {
            return t( 'conversation.email' );
        }

        return 'SMS';
    }

    /**
     * @param {*} value - value to encode
     * @return {string} html encoded value
     */
    static encode( value ) {
        if ( value === null || typeof value === 'undefined' ) {
            return '';
        }

        return String( value ).replace( /&/g, '&amp;' ).replace( /</g, '&lt;' ).replace( />/g, '&gt;' ).replace( /"/g, '&quot;' );
    }
}

export default ConversationWidget;
