"use strict";

import $ from 'jquery';
import dbStore from './dbstore';
import gui from './gui';
import { t } from '../src/js/translator';

const notification = {

    _extraFiles: [],
    _pendingData: [],

    init( surveyIdent ) {
        if ( this._initialized ) return;
        this._initialized = true;
        gui.panelManager.enableNotification();
        this._refreshPendingList();
        this._loadTypesFromSurveyData();
        this._setupHandlers();
        $( '#wf-send-notification' ).text( t( 'c_queue' ) );
    },

    _loadTypesFromSurveyData() {
        const types = ( window.surveyData && window.surveyData.notificationTypes ) || [];

        // The conversation that established the case, only set if there is one
        this._conversation = ( window.surveyData && window.surveyData.conversation ) || null;

        const $sel = $( '#target' );
        $sel.empty();
        types.forEach( type => {
            if ( type === 'conversation' ) {
                if ( this._conversation ) {
                    $sel.append( `<option value="${type}">${t( 'n_conv_type' )}</option>` );
                }
            } else {
                $sel.append( `<option value="${type}">${type}</option>` );
            }
        } );

        // Default to the type last used, users tend to keep sending the same kind
        const lastTarget = this._getLastTarget();
        if ( lastTarget && $sel.find( `option[value="${lastTarget}"]` ).length ) {
            $sel.val( lastTarget );
        }

        this._setConversationNumber();
        this._setTargetDeps( $sel.val() );
    },

    _getLastTarget() {
        try {
            return window.localStorage.getItem( 'wf-notification-target' );
        } catch ( e ) {
            return null;
        }
    },

    _setLastTarget( target ) {
        try {
            window.localStorage.setItem( 'wf-notification-target', target );
        } catch ( e ) {
            // Storage unavailable, the type is still kept for this form
        }
    },

    _setConversationNumber() {
        const conv = this._conversation;
        $( '#msg_their_nbr' ).val( conv ? `${conv.theirNumber} (${conv.channel})` : '' );
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

        $( '#wf-send-notification' ).on( 'click', () => {
            this._queue();
        } );

        $( '#email_extra_files' ).on( 'change', () => {
            const newFiles = Array.from( $( '#email_extra_files' )[0].files || [] );
            newFiles.forEach( f => this._extraFiles.push( f ) );
            $( '#email_extra_files' ).val( '' );
            this._renderExtraFilesList();
        } );

        $( document ).on( 'click', '.notif-file-delete', ( e ) => {
            const idx = parseInt( $( e.currentTarget ).attr( 'data-idx' ), 10 );
            this._extraFiles.splice( idx, 1 );
            this._renderExtraFilesList();
        } );

        $( document ).on( 'click', '.notif-pending-delete', ( e ) => {
            const key = $( e.currentTarget ).attr( 'data-key' );
            dbStore.deleteNotification( key ).then( () => {
                this._refreshPendingList();
            } ).catch( () => {} );
        } );

        $( document ).on( 'click', '.notif-pending-edit', ( e ) => {
            const idx = parseInt( $( e.currentTarget ).attr( 'data-idx' ), 10 );
            const entry = this._pendingData[ idx ];
            if ( !entry ) return;
            this._editNotification( entry.notif, entry.key );
        } );
    },

    _renderExtraFilesList() {
        const $list = $( '#email_extra_files_list' );
        $list.empty();
        this._extraFiles.forEach( ( f, idx ) => {
            $list.append(
                `<li><span>${f.name}</span><button type='button' class='notif-file-delete btn-link-danger' data-idx='${idx}' aria-label='Remove'>&#x2715;</button></li>`
            );
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

        const instanceId = window.smapCurrentInstanceId;
        if ( !instanceId ) {
            this._showStatus( 'No active instance — save a draft first', 'danger' );
            return;
        }

        dbStore.saveNotification( instanceId, notif ).then( () => {
            console.log( '[notification] saveNotification success' );
            this._showStatus( 'Notification queued — will be sent on form submission', 'success' );
            this._setLastTarget( target );
            this._clearForm();
            this._refreshPendingList( instanceId );
        } ).catch( ( err ) => {
            console.error( '[notification] saveNotification failed', err );
            const msg = err && err.message ? err.message : 'Failed to queue notification';
            this._showStatus( msg, 'danger' );
        } );
    },

    _clearForm() {
        $( '#wf-notification-form input, #wf-notification-form textarea' ).val( '' );
        $( '#wf-notification-form select' ).not( '#target' ).each( function() {     // Keep the type for the next one
            $( this ).prop( 'selectedIndex', 0 );
        } );
        this._extraFiles = [];
        $( '#email_extra_files_list' ).empty();
        this._setConversationNumber();
        this._setTargetDeps( $( '#target' ).val() );
    },

    _refreshPendingList( instanceId ) {
        instanceId = instanceId || window.smapCurrentInstanceId;
        console.log( '[notification] _refreshPendingList instanceId=', instanceId );

        dbStore.getNotifications( instanceId ).then( ( { notifications, keys } ) => {
            console.log( '[notification] got', notifications.length, 'notifications' );

            const $section = $( '#wf-pending-section' );
            const $list = $( '#wf-pending-notifications' );
            if ( !$list.length ) {
                console.warn( '[notification] #wf-pending-notifications not found in DOM' );
                return;
            }

            $list.empty();
            this._pendingData = [];

            if ( notifications.length === 0 ) {
                $section.attr( 'hidden', '' );
                return;
            }

            $section.removeAttr( 'hidden' );
            $( '.smap-panel-body' ).scrollTop( 0 );

            notifications.forEach( ( n, i ) => {
                let desc = n.target === 'email'
                    ? `Email → ${( n.emails || [] ).join( ', ' )}`
                    : `${n.target} → ${n.toNumber || ''}`;
                if ( n.extraFiles && n.extraFiles.length > 0 ) {
                    desc += ` (+${n.extraFiles.length} file${n.extraFiles.length > 1 ? 's' : ''})`;
                }
                const key = keys[ i ];
                this._pendingData.push( { notif: n, key } );
                $list.append(
                    `<li>` +
                    `<span class='notif-item-desc'>${desc}</span>` +
                    `<span class='notif-item-actions'>` +
                    `<button type='button' class='notif-pending-edit btn-link-action' data-idx='${i}' aria-label='Edit'>&#x270E;</button>` +
                    `<button type='button' class='notif-pending-delete btn-link-danger' data-key='${key}' aria-label='Delete'>&#x2715;</button>` +
                    `</span></li>`
                );
            } );
        } ).catch( ( err ) => {
            console.error( '[notification] getNotifications failed', err );
        } );
    },

    _editNotification( notif, key ) {
        dbStore.deleteNotification( key ).then( () => {
            const target = notif.target;
            $( '#target' ).val( target );
            this._setTargetDeps( target );

            if ( target === 'email' ) {
                $( '#notify_emails' ).val( ( notif.emails || [] ).join( ', ' ) );
                $( '#email_subject' ).val( notif.subject || '' );
                $( '#email_content' ).val( notif.content || '' );
                $( '#email_attach' ).val( notif.attach || 'none' );
                this._extraFiles = notif.extraFiles ? notif.extraFiles.slice() : [];
                this._renderExtraFilesList();
            } else if ( target === 'sms' ) {
                $( '#notify_sms' ).val( notif.toNumber || '' );
                $( '#sms_content' ).val( notif.content || '' );
            } else if ( target === 'conversation' ) {
                $( '#conversation_text' ).val( notif.content || '' );
            }

            this._refreshPendingList();
            $( '#wf-notification-status' ).hide();
            $( '#wf-notification-form' )[0].scrollIntoView( { behavior: 'smooth', block: 'start' } );
        } ).catch( () => {} );
    },

    /**
     * Returns true if the notification form has partial data that hasn't been queued.
     */
    hasIncompleteNotification() {
        const textFilled = [
            $( '#notify_emails' ).val(),
            $( '#email_subject' ).val(),
            $( '#email_content' ).val(),
            $( '#notify_sms' ).val(),
            $( '#conversation_text' ).val()
        ].some( v => ( v || '' ).trim() !== '' );
        return textFilled || this._extraFiles.length > 0;
    },

    _showStatus( msg, type ) {
        $( '#wf-notification-status' )
            .removeClass( 'alert-success alert-danger' )
            .addClass( 'alert alert-' + type )
            .text( msg )
            .show();
    },

    _isValidEmail( email ) {
        return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test( email.trim() );
    },

    _buildEmail() {
        const emails = ( $( '#notify_emails' ).val() || '' ).trim();
        if ( !emails ) {
            return { error: true, errorMsg: 'Please enter at least one email address.' };
        }
        const emailList = emails.split( ',' ).map( e => e.trim() ).filter( e => e );
        const invalid = emailList.filter( e => !this._isValidEmail( e ) );
        if ( invalid.length ) {
            return { error: true, errorMsg: `Invalid email address: ${invalid.join( ', ' )}` };
        }
        const subject = ( $( '#email_subject' ).val() || '' ).trim();
        if ( !subject ) {
            return { error: true, errorMsg: 'Please enter a subject.' };
        }
        const content = ( $( '#email_content' ).val() || '' ).trim();
        if ( !content ) {
            return { error: true, errorMsg: 'Please enter content for the email.' };
        }
        return {
            target: 'email',
            emails: emailList,
            subject,
            content,
            attach: $( '#email_attach' ).val(),
            extraFiles: this._extraFiles.slice()
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

    /*
     * Reply to the conversation that established the case
     * The server sends to the case's number, the numbers here are only shown in the pending list
     */
    _buildConversation() {
        const conv = this._conversation;
        if ( !conv ) {
            return { error: true, errorMsg: 'This case has no conversation to reply to.' };
        }
        const content = ( $( '#conversation_text' ).val() || '' ).trim();
        if ( !content ) {
            return { error: true, errorMsg: 'Please enter a message.' };
        }
        return {
            target: 'conversation',
            toNumber: conv.theirNumber,
            msgChannel: conv.channel,
            content
        };
    }
};

export default notification;
