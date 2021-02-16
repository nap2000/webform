
    import $ from 'jquery';

    "use strict";
    var RESERVED_KEYS = ['user_locale', '__settings', 'null', '__history', 'Firebug', 'undefined', '__bookmark', '__counter',
            '__current_server', '__loadLog', '__writetest', '__maxSize'
        ],
        localStorage = window.localStorage;

    let store = {};

    // Could be replaced by Modernizr function if Modernizr remains used in final version
    store.isSupported = function() {
        try {
            return 'localStorage' in window && window['localStorage'] !== null;
        } catch (e) {
            return false;
        }
    }

    store.isWritable = function() {
        var result = store.setRecord('__writetest', 'x', null, true);
        if (result === 'success') {
            store.removeRecord('__writetest');
            return true;
        }
        return false;
    }

    //used for testing
    store.getForbiddenKeys = function() {
        return RESERVED_KEYS;
    }

    /**
     * saves a data object in JSON format (string)
     * @param {string} newKey    [description]
     * @param {*} record     [description]
     * @param {boolean=} del [description] used to change name of existing record and delete old record
     * @param {boolean=} overwrite [description] overwrite is only used when there is *another* record with the same new name (not when simply updating current form)
     * @param {?string=} oldKey    [description]
     * @return {string}
     */
    store.setRecord = function(newKey, record, del, overwrite, oldKey) {
        var error;
        if (!newKey || typeof newKey !== 'string' || newKey.length < 1) {
            //console.error( 'no key or empty key provided for record: ' + newKey );
            return 'require';
        }
        newKey = newKey.trim();
        oldKey = ( typeof oldKey === 'string' ) ? oldKey.trim() : null;
        overwrite = ( typeof overwrite !== 'undefined' && overwrite === true ) ? true : false;

        //using the knowledge that only survey data is provided as a "data" property (and is a string)
        if (typeof record['data'] === 'string' && store.isReservedKey(newKey)) {
            return 'forbidden';
        }
        if (typeof record['data'] === 'string' &&
            ( oldKey !== newKey && store.isExistingKey(newKey) && overwrite !== true ) ||
            ( oldKey === newKey && overwrite !== true )) {
            return 'existing';
        }
        try {
            //add timestamp to survey data
            if (typeof record['data'] === 'string') {
                record['lastSaved'] = ( new Date() ).getTime();
                localStorage.setItem('__counter', JSON.stringify({
                    'counter': store.getCounterValue()
                }));

            }
            localStorage.setItem(newKey, JSON.stringify(record));
            //console.debug( 'saved: ' + newKey + ', old key was: ' + oldKey );
            //if the record was loaded from the store (oldKey != null) and the key's value was changed during editing
            //delete the old record if del=true
            if (oldKey !== null && oldKey !== '' && oldKey !== newKey) {
                if (del) {
                    console.log('going to remove old record with key:' + oldKey);
                    store.removeRecord(oldKey);
                }
            }
            return 'success';
        } catch (e) {
            if (e && e.code === 22) { //} (e.name==='QUOTA_EXCEEDED_ERR'){
                return 'full (or browser is set to not allow storage)';
            }
            console.log('error in store.setRecord:', e);
            error = ( e ) ? JSON.stringify(e) : 'unknown';
            return 'error: ' + error;
        }
    };

    store.setKey = function(key, value) {
        localStorage.setItem(key, value);
    };

    store.getKey = function(key) {
        var value = localStorage.getItem(key);
        if(value && value.charAt(0) === '"') {
            value = value.replace(/"/g, '');     // Hack to cater for draft names being previously wrapped in quotes by being json stringified
        }
        return value;
    };

    /**
     * Returns a form data record as an object. This is the only function that obtains records from the local storage.
     * @param  {string} key [description]
     * @return {?*}     [description]
     */
    store.getRecord = function(key) {
        var record;
        try {
            var x = localStorage.getItem(key);
            if(x && x.trim().startsWith('{')) {
                record = JSON.parse(localStorage.getItem(key));
            }
            return record;
        } catch (e) {
            console.error('error with loading data from store: ' + e.message);
            return null;
        }
    };

    // removes a record
    store.removeRecord = function(key) {
        try {
            localStorage.removeItem(key);
            if (!store.isReservedKey(key)) {
                $('form.or').trigger('delete', JSON.stringify(store.getRecordList()));
            }
            return true;
        } catch (e) {
            console.log('error with removing data from store: ' + e.message);
            return false;
        }
    };

    // Removes all records
    store.removeAllRecords = function() {
        var records = getSurveyRecords(false);

        records.forEach(function (record) {
            store.removeRecord(record.key);
        });
    };

    /**
     * Returns a list of locally stored form names and properties for a provided server URL
     * @param  {string} serverURL
     * @return {Array.<{name: string, server: string, title: string, url: string}>}
     */
    store.getFormList = function(serverURL) {
        if (typeof serverURL == 'undefined') {
            return null;
        }
        return store.getRecord('__server_' + serverURL);
    };

    /**
     * returns an ordered array of objects with record keys and final variables {{"key": "name1", "draft": true},{"key": "name2", etc.
     * @return { Array.<Object.<string, (boolean|string)>>} [description]
     */
    store.getRecordList = function() {
        var formList = [],
            records = store.getSurveyRecords(false);

        records.forEach(function (record) {
            formList.push({
                'key': record.key,
                'draft': record.draft,
                'lastSaved': record.lastSaved
            });
        });

        //order formList by lastSaved timestamp
        formList.sort(function (a, b) {
            return a['lastSaved'] - b['lastSaved'];
        });
        return formList;
    };

    /**
     * retrieves all survey data
     * @param  {boolean=} finalOnly   [description]
     * @param  {?string=} excludeName [description]
     * @return {Array.<Object.<(string|number), (string|boolean)>>}             [description]
     */
    store.getSurveyRecords = function(finalOnly, excludeName) {
        var i, key,
            records = [],
            record = {};
        finalOnly = ( typeof finalOnly !== 'undefined' ) ? finalOnly : false;
        excludeName = excludeName || null;

        for (i = 0; i < localStorage.length; i++) {
            key = localStorage.key(i);
            if (!store.isReservedKey(key) && !key.startsWith("fs::")) {

                // get record -
                record = store.getRecord(key);
                if(record) {

	                try {
		                record.key = key;
		                //=== true comparison breaks in Google Closure compiler.
		                if (key !== excludeName && (!finalOnly || !record.draft)) {
			                if (record.form) {		// If there is a form then this should be record data (Smap)
				                records.push(record);
			                }
		                }
	                } catch (e) {
		                console.log('record found that was probably not in the expected JSON format' +
			                ' (e.g. Firebug settings or corrupt record) (error: ' + e.message + '), record was ignored');
	                }
                }
            }
        }

        return records;
    };

    /**
     * [getSurveyDataArr description]
     * @param  {boolean=} finalOnly   [description]
     * @param  {?string=} excludeName the (currently open) record name to exclude from the returned data set
     * @return {Array.<{name: string, data: string}>}             [description]
     */
    store.getSurveyDataArr = function(finalOnly, excludeName) {
        var i, records,
            dataArr = [];

        finalOnly = ( typeof finalOnly !== 'undefined' ) ? finalOnly : true;
        excludeName = excludeName || null;
        return store.getSurveyRecords(finalOnly, excludeName);
    };


    store.getExportStr = function() {
        var dataStr = '';

        store.getSurveyDataArr(false).forEach(function (record) {
            dataStr += '<record name="' + record.key + '" lastSaved="' + record.lastSaved + '"' +
                ( record.draft ? ' draft="true()"' : '' ) +
                '>' + record.data + '</record>';
        });

        return dataStr;
    };

    store.isReservedKey = function(k) {
        var i;
        for (i = 0; i < RESERVED_KEYS.length; i++) {
            if (k === RESERVED_KEYS[i]) {
                return true;
            }
        }
        return false;
    };

    store.isExistingKey = function(k) {
        if (localStorage.getItem(k)) {
            //console.log('existing key');// DEBUG
            return true;
        }
        //console.log('not existing key');// DEBUG
        return false;
    };

    store.getCounterValue = function() {
        var record = store.getRecord('__counter'),
            number = ( record && record['counter'] && isNumber(record['counter']) ) ? Number(record['counter']) : 0,
            numberStr = ( number + 1 ).toString();

        return numberStr;
    };


    function isNumber(n) {
        return !isNaN(parseFloat(n)) && isFinite(n);
    }


    export default store;




