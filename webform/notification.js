"use strict";

import $ from 'jquery';

const notification = {
    _surveyIdent: null,
    _ourNumbers: [],

    init( surveyIdent ) {
        this._surveyIdent = surveyIdent;
        this._loadTypes();
        this._loadOurNumbers();
        this._setupHandlers();
    },

    _loadTypes() {
        $.ajax( {
            url: '/surveyKPI/notifications/types?page=console',
            dataType: 'json',
            cache: false,
            success: ( data ) => {
                if ( !Array.isArray( data ) ) return;
                const $sel = $( '#target' );
                $sel.empty();
                data.forEach( type => {
                    $sel.append( `<option value="${type}">${type}</option>` );
                } );
                this._setTargetDeps( $sel.val() );
            },
            error: () => console.error( 'Failed to load notification types' )
        } );
    },

    _loadOurNumbers() {
        $.ajax( {
            url: '/surveyKPI/smsnumbers?org=true',
            dataType: 'json',
            cache: false,
            success: ( data ) => {
                this._ourNumbers = Array.isArray( data ) ? data : [];
                this._populateOurNumbers( $( '#msg_channel' ).val() );
            },
            error: () => console.error( 'Failed to load SMS numbers' )
        } );
    },

    _populateOurNumbers( channel ) {
        const $sel = $( '#msg_our_nbr' );
        $sel.empty();
        this._ourNumbers
            .filter( n => n.channel === channel )
            .forEach( n => {
                $sel.append( `<option value="${n.ourNumber}">${n.ourNumber} - ${n.channel}</option>` );
            } );
    },

    _setTargetDeps( target ) {
        $( '.sms_options, .email_options, .submission_options, .conv_options' ).hide();
        if ( target === 'email' ) {
            $( '.email_options, .submission_options' ).show();
        } else if ( target === 'sms' ) {
            $( '.sms_options' ).show();
        } else if ( target === 'conversation' ) {
            $( '.conv_options' ).show();
        }
    },

    _setupHandlers() {
        $( '#target' ).on( 'change', () => {
            this._setTargetDeps( $( '#target' ).val() );
        } );

        $( '#msg_channel' ).on( 'change', () => {
            this._populateOurNumbers( $( '#msg_channel' ).val() );
        } );

        $( '#msg_cur_nbr' ).on( 'change', () => {
            if ( $( '#msg_cur_nbr' ).val() === 'other' ) {
                $( '.other_msg' ).show();
                $( '#msg_channel' ).prop( 'disabled', false );
            } else {
                $( '.other_msg' ).hide();
                const channel = $( '#msg_cur_nbr option:selected' ).data( 'channel' );
                if ( channel ) {
                    $( '#msg_channel' ).val( channel ).prop( 'disabled', true ).trigger( 'change' );
                }
            }
        } );

        $( '#wf-send-notification' ).on( 'click', () => {
            this._send();
        } );
    },

    _send() {
        const target = $( '#target' ).val();
        let notif = {};

        if ( target === 'email' ) {
            notif = this._buildEmail();
        } else if ( target === 'sms' ) {
            notif = this._buildSMS();
        } else if ( target === 'conversation' ) {
            notif = this._buildConversation();
        } else if ( target === 'document' ) {
            notif = { target: 'document', notifyDetails: {} };
        }

        if ( notif.error ) {
            this._showStatus( notif.errorMsg || 'Invalid notification', 'danger' );
            return;
        }

        notif.trigger = 'submission';
        notif.sIdent = this._surveyIdent;
        notif.enabled = true;
        notif.instanceId = window.smapCurrentInstanceId;

        const $btn = $( '#wf-send-notification' );
        $btn.prop( 'disabled', true );
        $( '#wf-notification-status' ).hide();

        $.ajax( {
            type: 'POST',
            dataType: 'text',
            cache: false,
            url: '/surveyKPI/notifications/immediate',
            data: { notification: JSON.stringify( notif ) },
            success: () => {
                $btn.prop( 'disabled', false );
                this._showStatus( 'Notification sent', 'success' );
                document.getElementById( 'wf-notification-form' ).reset();
                this._setTargetDeps( $( '#target' ).val() );
            },
            error: ( xhr ) => {
                $btn.prop( 'disabled', false );
                this._showStatus( 'Error: ' + ( xhr.responseText || xhr.statusText ), 'danger' );
            }
        } );
    },

    _showStatus( msg, type ) {
        $( '#wf-notification-status' )
            .removeClass( 'alert-success alert-danger' )
            .addClass( 'alert alert-' + type )
            .text( msg )
            .show();
    },

    _buildEmail() {
        const emails = ( $( '#notify_emails' ).val() || '' ).trim();
        if ( !emails ) {
            return { error: true, errorMsg: 'Please enter at least one email address.' };
        }
        return {
            target: 'email',
            notifyDetails: {
                emails: emails.split( ',' ).map( e => e.trim() ).filter( e => e ),
                subject: $( '#email_subject' ).val(),
                content: $( '#email_content' ).val(),
                attach: $( '#email_attach' ).val()
            }
        };
    },

    _buildSMS() {
        return {
            target: 'sms',
            notifyDetails: {
                emails: [ $( '#notify_sms' ).val() ],
                subject: $( '#sms_sender_id' ).val(),
                content: $( '#sms_content' ).val()
            }
        };
    },

    _buildConversation() {
        let theirNumber = $( '#msg_cur_nbr' ).val();
        if ( theirNumber === 'other' ) {
            theirNumber = $( '#msg_nbr_other' ).val();
        }
        if ( !theirNumber ) {
            return { error: true, errorMsg: 'Please specify a phone number.' };
        }
        return {
            target: 'conversation',
            notifyDetails: {
                emails: [ theirNumber ],
                ourNumber: $( '#msg_our_nbr' ).val(),
                msgChannel: $( '#msg_channel' ).val(),
                content: $( '#conversation_text' ).val()
            }
        };
    }
};

export default notification;
