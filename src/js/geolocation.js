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
