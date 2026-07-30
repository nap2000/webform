/**
 * @typedef GeolocationPosition
 * @property {string} geopoint
 * @property {number} lat
 * @property {number} lng
 * @property {window.GeolocationPosition} position
 */

/**
 * @param {window.PositionOptions} [options] - lookup options
 * @return {Promise<GeolocationPosition>} - coordinates
 */
export const getCurrentPosition = ( options ) => {
    return new Promise( ( resolve, reject ) => {
        navigator.geolocation.getCurrentPosition( ( position ) => {
            const { latitude, longitude, altitude, accuracy } = position.coords;

            const lat = Math.round( latitude * 1000000 ) / 1000000;
            const lng = Math.round( longitude * 1000000 ) / 1000000;

            const geopoint = `${lat} ${lng} ${altitude || '0.0'} ${accuracy || '0.0'}`;

            resolve( {
                geopoint,
                lat,
                lng,
                position,
            } );
        }, reject, options );
    } );
};

// smap: GeolocationPositionError.PERMISSION_DENIED
const PERMISSION_DENIED = 1;

// smap: a high accuracy fix can take a long time on a phone, and is impossible indoors
const HIGH_ACCURACY_TIMEOUT = 20000;
const FALLBACK_TIMEOUT = 15000;
const FALLBACK_MAXIMUM_AGE = 60000;

/**
 * smap: Obtains the current position for a location request made by the user. A high
 * accuracy (GPS) fix is tried first. If that times out or is unavailable a network based
 * fix is accepted instead, because waiting for a GPS fix that will never arrive looks
 * like nothing happening at all.
 *
 * @param {Function} [onFallback] - called when the high accuracy attempt is given up on
 * @return {Promise<GeolocationPosition>} - coordinates
 */
export const detectCurrentPosition = ( onFallback ) => {
    return getCurrentPosition( {
        enableHighAccuracy: true,
        timeout: HIGH_ACCURACY_TIMEOUT,
        maximumAge: 0
    } ).catch( error => {
        if ( error && error.code === PERMISSION_DENIED ) {
            throw error;
        }
        if ( onFallback ) {
            onFallback( error );
        }

        return getCurrentPosition( {
            enableHighAccuracy: false,
            timeout: FALLBACK_TIMEOUT,
            maximumAge: FALLBACK_MAXIMUM_AGE
        } );
    } );
};

// smap
export const readCurrentPosition = ( options ) => {
    return new Promise( ( resolve, reject ) => {

        let accuracyObtained = 0;
        const id = navigator.geolocation.watchPosition( ( position ) => {
            const { latitude, longitude, altitude, accuracy } = position.coords;

            const lat = Math.round( latitude * 1000000 ) / 1000000;
            const lng = Math.round( longitude * 1000000 ) / 1000000;

            const geopoint = `${lat} ${lng} ${altitude || '0.0'} ${accuracy || '0.0'}`;

            accuracyObtained = accuracy;
            if(accuracy <= 10) {
                resolve({
                    geopoint,
                    lat,
                    lng,
                    position,
                });
            }

        }, reject, options );

        let timeout = setTimeout(() => {
            window.navigator.geolocation.clearWatch(id);
            if(accuracyObtained > 10) {
                alert("Failed to get location");
            }
        }, 2000);
    } );
};
