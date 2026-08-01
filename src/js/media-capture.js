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
import { dataUriToBlobSync } from './utils';

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
 * Whether the front camera has to be opened inside the page. Chromium based browsers only
 * pass on that a capture was asked for, not which camera, so on Android the capture
 * attribute always opens the back camera. A selfie can therefore only be taken with a
 * camera preview in the page itself.
 *
 * @param {Element} element - the file input of the question
 * @param {string} facing - camera to open, 'user' or 'environment'
 * @return {boolean} whether the camera is opened in the page
 */
export const usesInPageCamera = ( element, facing ) => facing === 'user' &&
    element.getAttribute( 'accept' ) === 'image/*' &&
    !!( navigator.mediaDevices && navigator.mediaDevices.getUserMedia ) && canSetFiles();

/**
 * @return {boolean} whether a captured file can be put into a file input
 */
const canSetFiles = () => {
    try {
        return new DataTransfer().files.length === 0;
    } catch ( e ) {
        return false;
    }
};

/**
 * Puts a captured file into a file input, as if it was picked by the user, and lets the
 * change handler of the widget process it.
 *
 * @param {Element} element - the file input of the question
 * @param {File} file - the captured file
 */
export const setInputFile = ( element, file ) => {
    const transfer = new DataTransfer();

    transfer.items.add( file );
    element.files = transfer.files;
    element.dispatchEvent( new Event( 'change', { bubbles: true } ) );
};

/**
 * Opens a camera preview in the page and takes a photo with the requested camera. Rejects
 * if the camera cannot be used, e.g. because permission was refused, so that the caller can
 * fall back to the camera app of the device.
 *
 * @param {string} facing - camera to open, 'user' or 'environment'
 * @return {Promise<File|null>} the photo, or null if the user cancelled
 */
export const captureImage = facing => navigator.mediaDevices
    .getUserMedia( {
        // ask for a photo sized image, the default of a camera stream is only 640x480
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
    } )
    .then( stream => showCamera( stream, facing ) );

/**
 * @param {MediaStream} stream - the camera stream
 * @param {string} facing - camera in use, 'user' or 'environment'
 * @return {Promise<File|null>} the photo, or null if the user cancelled
 */
const showCamera = ( stream, facing ) => new Promise( resolve => {
    const fragment = range.createContextualFragment(
        `<div class="camera-capture">
            <video class="camera-capture__preview" autoplay playsinline muted></video>
            <div class="camera-capture__controls">
                <button type="button" class="btn btn-default camera-capture__cancel"></button>
                <button type="button" class="btn btn-primary camera-capture__shutter" disabled>
                    <i class="icon fa-camera"> </i>
                </button>
            </div>
        </div>` );
    const camera = fragment.querySelector( '.camera-capture' );
    const video = camera.querySelector( 'video' );
    const shutter = camera.querySelector( '.camera-capture__shutter' );
    const cancel = camera.querySelector( '.camera-capture__cancel' );

    cancel.textContent = t( 'filepicker.cancelCapture' );
    shutter.setAttribute( 'aria-label', t( 'filepicker.takePhoto' ) );
    // the preview of the front camera is mirrored, as users expect, the photo itself is not
    camera.classList.toggle( 'camera-capture--mirrored', facing === 'user' );

    const close = file => {
        stream.getTracks().forEach( track => track.stop() );
        video.srcObject = null;
        camera.remove();
        resolve( file );
    };

    // the video has no dimensions to grab a frame from until it has started playing
    video.addEventListener( 'loadedmetadata', () => {
        shutter.disabled = false;
    } );
    cancel.addEventListener( 'click', () => close( null ) );
    shutter.addEventListener( 'click', () => close( grabPhoto( video ) ) );

    document.body.append( camera );
    video.srcObject = stream;
    video.play().catch( () => {} );
    shutter.focus();
} );

/**
 * @param {Element} video - the camera preview
 * @return {File} the current frame of the preview, as a JPEG file
 */
const grabPhoto = video => {
    const canvas = document.createElement( 'canvas' );

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext( '2d' ).drawImage( video, 0, 0, canvas.width, canvas.height );

    const blob = dataUriToBlobSync( canvas.toDataURL( 'image/jpeg', 0.92 ) );

    return new File( [ blob ], 'selfie.jpg', { type: 'image/jpeg' } );
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
