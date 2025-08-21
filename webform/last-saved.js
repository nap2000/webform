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
 * @param {Survey} survey
 * @return {boolean}
 */
const hasLastSavedInstance = (survey) =>
    Array.isArray(survey.externalData) &&
    survey.externalData.some(
        (item) => item?.src === LAST_SAVED_VIRTUAL_ENDPOINT
    );

/**
 * @param {Survey} survey
 */
export const isLastSaveEnabled = (survey) =>
    settings.type === 'other' &&
    dbStore.available &&
    hasLastSavedInstance(survey);

/**
 * @param {string} id
 * @return {Promise<LastSavedRecord | void>}    TODO
 */
export const getLastSavedRecord = (id) => {
    if (!dbStore.available || settings.type !== 'other') {
        return Promise.resolve();
    }

    return dbStore.getlastSavedRecord(id).then((lastSavedRecord) => {
        if (lastSavedRecord != null) {
            delete lastSavedRecord._enketoId;

            return Object.assign(lastSavedRecord, { id });
        }
    });
};

/**
 * @param {string} id
 * @return {Promise<void>}
 */
export const removeLastSavedRecord = async (enketoId) => {
    if (dbStore.available) {
        await dbStore.lastSavedRecords.remove(enketoId);
    }
};

const domParser = new DOMParser();

/**
 * @param {Survey} survey
 * @param {EnketoRecord} [lastSavedRecord]
 * @return {XMLDocument}
 */
const getLastSavedInstanceDocument = (survey, lastSavedRecord) => {
    if (lastSavedRecord == null || !isLastSaveEnabled(survey)) {
        const model = domParser.parseFromString(survey.model, 'text/xml');
        const modelDefault = model
            .querySelector('model > instance > *')
            .cloneNode(true);

        const doc = document.implementation.createDocument(null, '', null);

        doc.appendChild(modelDefault);

        return doc;
    }
    return domParser.parseFromString(lastSavedRecord.xml, 'text/xml');
};

/**
 * @param {Survey} survey
 * @param {EnketoRecord} [lastSavedRecord]
 * @return {Survey}
 */
export const populateLastSavedInstances = (survey, lastSavedRecord) => {
    if (!hasLastSavedInstance(survey)) {
        return survey;
    }

    const lastSavedInstance = getLastSavedInstanceDocument(
        survey,
        lastSavedRecord
    );

    const externalData = survey.externalData.map((item) => {
        if (item?.src === LAST_SAVED_VIRTUAL_ENDPOINT) {
            return { ...item, xml: lastSavedInstance };
        }

        return item;
    });

    return { ...survey, externalData };
};

/**
 * @typedef SetLastSavedRecordResult
 * @property {Survey} survey
 * @property {EnketoRecord} [lastSavedRecord]
 */

/**
 * @param {Survey} survey
 * @param {EnketoRecord} record
 * @return {Promise<SetLastSavedRecordResult>}
 */
export const setLastSavedRecord = (survey, record) => {
    if (!dbStore.available || settings.type !== 'other') {
        return Promise.resolve({
            survey: populateLastSavedInstances(survey),
        });
    }

    const lastSavedRecord = isLastSaveEnabled(survey)
        ? { ...record, _enketoId: record.enketoId }
        : null;

    return (
        lastSavedRecord == null
            ? removeLastSavedRecord(survey.enketoId)
            : dbStore.lastSavedRecords.update(lastSavedRecord)
    ).then(([lastSavedRecord] = []) => ({
        survey: populateLastSavedInstances(survey, lastSavedRecord),
        lastSavedRecord,
    }));
};
