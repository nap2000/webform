import settings from '../src/js/settings';
import dbStore from './dbStore';

/**
 * @typedef {import('../../../../app/models/record-model').EnketoRecord} EnketoRecord
 */

/**
 * @typedef {import('../../../../app/models/survey-model').SurveyObject} Survey
 */

export const LAST_SAVED_VIRTUAL_ENDPOINT = 'jr://instance/last-saved';

/**
 * @return {boolean}
 */
const hasLastSavedInstance = () =>
    Array.isArray(surveyData.external) &&
    surveyData.external.some(
        (item) => item?.src === LAST_SAVED_VIRTUAL_ENDPOINT
    );

/**
 * @param {Survey} survey
 */
export const isLastSaveEnabled = () =>
    settings.type === 'other' &&
    dbStore.available &&
    hasLastSavedInstance();

/**
 * @param {string} id
 * @return {Promise<LastSavedRecord | void>}    TODO
 */
export const getLastSavedRecord = (id) => {
    if (!dbStore.available || settings.type !== 'other') {
        return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
        dbStore.getLastSavedRecord( id ).then( ( lastSavedRecord ) => {
            if (lastSavedRecord != null) {
                delete lastSavedRecord._enketoId;

                resolve(Object.assign( lastSavedRecord, { id } ));
            }
        } );
    });
};

/**
 * @param {string} id
 * @return {Promise<void>}
 */
export const removeLastSavedRecord = async (id) => {
    if (dbStore.available) {
        await dbStore.lastSavedRecords.remove(id);
    }
};

const domParser = new DOMParser();

/**
 * @param {Survey} survey
 * @param {EnketoRecord} [lastSavedRecord]
 * @return {XMLDocument}
 */
const getLastSavedInstanceDocument = (lastSavedRecord) => {
    if (lastSavedRecord == null || !isLastSaveEnabled()) {
        const model = domParser.parseFromString(surveyData.modelStr, 'text/xml');
        const modelDefault = model
            .querySelector('model > instance > *')
            .cloneNode(true);

        const doc = document.implementation.createDocument(null, '', null);

        doc.appendChild(modelDefault);

        return doc;
    }
    return domParser.parseFromString(lastSavedRecord.data, 'text/xml');
};

/**
 * @param {EnketoRecord} [lastSavedRecord]
 */
export const populateLastSavedInstances = (lastSavedRecord) => {
    if (!hasLastSavedInstance()) {
        return;
    }

    const lastSavedInstance = getLastSavedInstanceDocument(lastSavedRecord);

    surveyData.external = surveyData.external.map((item) => {
        if (item?.src === LAST_SAVED_VIRTUAL_ENDPOINT) {
            return { ...item, xml: lastSavedInstance };
        }

        return item;
    });

};

/**
 * @typedef SetLastSavedRecordResult
 * @property {Survey} survey
 * @property {EnketoRecord} [lastSavedRecord]
 */

/**
 * @param {EnketoRecord} record
 * @return {Promise<SetLastSavedRecordResult>}
 */
export const setLastSavedRecord = ( record) => {

    return new Promise((resolve, reject) => {
        const lastSavedRecord = isLastSaveEnabled()
            ? { ...record, _surveyId: surveyData.surveyIdent }
            : null;

        lastSavedRecord == null
            ? removeLastSavedRecord( surveyData.surveyIdent )
            : dbStore.setLastSavedRecord( lastSavedRecord )
        resolve();
    });

};
