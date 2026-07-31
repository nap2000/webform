/**
 * smap: the parts of the mobile capture UI that the file picker and annotate widgets share.
 *
 * Mobile browsers open the photo gallery, and never the camera, unless the file input has a
 * valid capture attribute. Media questions on a mobile device are therefore operated with
 * buttons instead of a file picker field: capturing is the primary action, choosing an
 * existing file is secondary.
 *
 * @module media-capture
 */

import support from './support';
import { t } from 'enketo/translator';

const range = document.createRange();

// media types the device can capture itself, with the icon and label of each control
const MEDIA_TYPES = {
    'image/*': { captureIcon: 'fa-camera', captureLabel: 'takePhoto', browseIcon: 'fa-picture-o' },
    'video/*': { captureIcon: 'fa-video-camera', captureLabel: 'recordVideo', browseIcon: 'fa-film' },
    'audio/*': { captureIcon: 'fa-microphone', captureLabel: 'recordAudio', browseIcon: 'fa-music' }
};

/**
 * @param {Element} element - the file input of the question
 * @return {object|undefined} the controls for the accepted media type, if the device can capture it
 */
export const getMediaControls = element => MEDIA_TYPES[ element.getAttribute( 'accept' ) ];

/**
 * @param {Element} element - the file input of the question
 * @param {boolean} readonly - whether the question is readonly
 * @return {boolean} whether the question is operated with capture buttons
 */
export const usesCaptureUi = ( element, readonly ) => !!getMediaControls( element ) && support.touch && !readonly;

/**
 * Determines which camera to open. The back camera is used unless the appearance asks for a
 * selfie. A capture attribute set by the server is honoured too, so that legacy values such
 * as capture="camera" are mapped to the values current browsers understand.
 *
 * @param {Element} element - the file input of the question
 * @param {Array<string>} appearances - appearances of the question
 * @return {string} 'user' for the front camera, 'environment' for the back camera
 */
export const getCaptureFacing = ( element, appearances ) => {
    if ( appearances.includes( 'selfie' ) || appearances.includes( 'new-front' ) ) {
        return 'user';
    }

    return ( element.getAttribute( 'capture' ) || '' ).trim().toLowerCase() === 'user' ? 'user' : 'environment';
};

/**
 * Whether the question requires a newly captured file, which removes the option to choose an
 * existing one. Note that "selfie" only changes which camera is opened, it still allows an
 * existing file to be chosen.
 *
 * @param {Element} element - the file input of the question
 * @param {Array<string>} appearances - appearances of the question
 * @return {boolean} whether only a new capture is allowed
 */
export const isCaptureOnly = ( element, appearances ) =>
    appearances.includes( 'new' ) || appearances.includes( 'new-front' ) || appearances.includes( 'new-rear' ) ||
    element.hasAttribute( 'capture' );

/**
 * @param {Element} element - the file input of the question
 * @return {DocumentFragment} the primary capture button
 */
export const captureButtonHtml = element => {
    const controls = getMediaControls( element );
    const fragment = range.createContextualFragment(
        `<button type="button" class="btn btn-primary btn-capture" disabled>
            <i class="icon ${controls.captureIcon}"> </i><span class="btn-capture__label"></span>
        </button>` );

    fragment.querySelector( '.btn-capture__label' ).textContent = t( `filepicker.${controls.captureLabel}` );

    return fragment;
};

/**
 * @param {Element} element - the file input of the question
 * @return {DocumentFragment} the secondary button that selects an existing file
 */
export const browseButtonHtml = element => {
    const controls = getMediaControls( element );
    const fragment = range.createContextualFragment(
        `<button type="button" class="btn-icon-only btn-browse" disabled>
            <i class="icon ${controls.browseIcon}"> </i>
        </button>` );
    const label = t( 'filepicker.chooseExisting' );

    fragment.querySelector( 'button' ).setAttribute( 'aria-label', label );
    fragment.querySelector( 'button' ).setAttribute( 'title', label );

    return fragment;
};
