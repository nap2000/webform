"use strict";

import $ from 'jquery';
import dbStore from './dbstore';
import gui from './gui';

const notification = {
    _instanceId: null,

    init( surveyIdent ) {
        const editId = window.surveyData && window.surveyData.instanceStrToEditId;
        if ( editId ) {
            this._instanceId = editId;
            gui.panelManager.enableNotification();
            this._refreshPendingList();
        }
        this._loadTypesFromSurveyData();
        this._setupHandlers();
    },

    _loadTypesFromSurveyData() {
        const types = ( window.surveyData && window.surveyData.notificationTypes ) || [];
        const ourNumbers = ( window.surveyData && window.surveyData.ourNumbers ) || [];

        const $sel = $( '#target' );
        $sel.empty();
        types.forEach( type => {
            $sel.append( `<option value="${type}">${type}</option>` );
        } );
        this._ourNumbers = ourNumbers;
        this._setTargetDeps( $sel.val() );
        this._populateOurNumbers( $( '#msg_channel' ).val() );
    },

    _populateOurNumbers( channel ) {
        const $sel = $( '#msg_our_nbr' );
        $sel.empty();
        ( this._ourNumbers || [] )
            .filter( n => !channel || n.channel === channel )
            .forEach( n => {
                $sel.append( `<option value="${n.ourNumber}">${n.ourNumber}</option>` );
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
            this._queue();
        } );
    },

    _queue() {
        const target = $( '#target' ).val();
        let notif = null;

        if ( target === 'email' ) {
            notif = this._buildEmail();
        } else if ( target === 'sms' ) {
            notif = this._buildSMS();
        } else if ( target === 'conversation' ) {
            notif = this._buildConversation();
        }

        if ( !notif ) {
            this._showStatus( 'Unknown notification type', 'danger' );
            return;
        }
        if ( notif.error ) {
            this._showStatus( notif.errorMsg || 'Invalid notification', 'danger' );
            return;
        }

        const instanceId = this._instanceId || window.smapCurrentInstanceId || 'default';

        dbStore.saveNotification( instanceId, notif ).then( () => {
            this._showStatus( 'Notification queued — will be sent on form submission', 'success' );
            document.getElementById( 'wf-notification-form' ).reset();
            this._setTargetDeps( $( '#target' ).val() );
            this._refreshPendingList();
        } ).catch( () => {
            this._showStatus( 'Failed to queue notification', 'danger' );
        } );
    },

    _refreshPendingList() {
        const instanceId = this._instanceId || window.smapCurrentInstanceId || 'default';
        dbStore.getNotifications( instanceId ).then( ( { notifications } ) => {
            let $list = $( '#wf-pending-notifications' );
            if ( !$list.length ) return;
            $list.empty();
            if ( notifications.length === 0 ) {
                $list.hide();
                return;
            }
            $list.show();
            notifications.forEach( n => {
                const desc = n.target === 'email'
                    ? `Email → ${( n.emails || [] ).join( ', ' )}`
                    : `${n.target} → ${n.toNumber || ''}`;
                $list.append( `<li>${desc}</li>` );
            } );
        } ).catch( () => {} );
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
            emails: emails.split( ',' ).map( e => e.trim() ).filter( e => e ),
            subject: $( '#email_subject' ).val(),
            content: $( '#email_content' ).val()
        };
    },

    _buildSMS() {
        const toNumber = ( $( '#notify_sms' ).val() || '' ).trim();
        if ( !toNumber ) {
            return { error: true, errorMsg: 'Please enter a phone number.' };
        }
        return {
            target: 'sms',
            toNumber,
            content: $( '#sms_content' ).val()
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
            toNumber: theirNumber,
            ourNumber: $( '#msg_our_nbr' ).val(),
            msgChannel: $( '#msg_channel' ).val(),
            content: $( '#conversation_text' ).val()
        };
    }
};

export default notification;
