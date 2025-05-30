// idb_helper.js
var IDBHelper = (function () {
    'use strict';

    var db;
    var DB_NAME = 'WordPuzzleDB_v2';
    var DB_VERSION = 1;

    var LANG_METADATA_STORE = 'languages_metadata';
    var LANG_PUZZLES_STORE = 'language_puzzles';

    function openDB(callback) {
        if (db) {
            if (typeof callback === 'function') callback(null, db);
            return;
        }

        var request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = function (event) {
            console.error("IndexedDB error:", event.target.error || event.target.errorCode); // More robust error reporting
            if (typeof callback === 'function') callback(event.target.error || new Error("IndexedDB error code: " + event.target.errorCode));
        };

        request.onsuccess = function (event) {
            db = event.target.result;
            if (typeof callback === 'function') callback(null, db);
        };

        request.onupgradeneeded = function (event) {
            console.log("Upgrading IndexedDB...");
            var tempDb = event.target.result;

            if (!tempDb.objectStoreNames.contains(LANG_METADATA_STORE)) {
                tempDb.createObjectStore(LANG_METADATA_STORE, { keyPath: 'code' });
                console.log("Created store: " + LANG_METADATA_STORE);
            }
            if (!tempDb.objectStoreNames.contains(LANG_PUZZLES_STORE)) {
                tempDb.createObjectStore(LANG_PUZZLES_STORE, { keyPath: 'code' });
                console.log("Created store: " + LANG_PUZZLES_STORE);
            }
        };
    }

    function getStore(storeName, mode, callback) {
        if (!db) {
            openDB(function(err, openedDb) {
                if (err) {
                    if (typeof callback === 'function') callback(err);
                    return;
                }
                // db = openedDb; // This line was redundant and could cause issues if openDB calls callback before db is set globally
                var transaction = openedDb.transaction(storeName, mode); // Use openedDb directly
                var store = transaction.objectStore(storeName);
                if (typeof callback === 'function') callback(null, store, transaction);
            });
        } else {
            var transaction = db.transaction(storeName, mode);
            var store = transaction.objectStore(storeName);
            if (typeof callback === 'function') callback(null, store, transaction);
        }
    }

    return {
        init: function(initCallback) {
            openDB(initCallback);
        },

        getLanguageMetadata: function (langCode, callback) {
            getStore(LANG_METADATA_STORE, 'readonly', function(err, store) {
                if (err) { if (typeof callback === 'function') callback(err); return; }
                var request = store.get(langCode);
                request.onsuccess = function () { if (typeof callback === 'function') callback(null, request.result); };
                request.onerror = function (e) { if (typeof callback === 'function') callback(e.target.error); };
            });
        },

        getAllLanguagesMetadata: function (callback) {
            getStore(LANG_METADATA_STORE, 'readonly', function(err, store) {
                if (err) {
                    if (typeof callback === 'function') callback(err);
                    return;
                }
                var allMetadata = [];
                // Use a cursor instead of getAll() for broader compatibility
                var cursorRequest = store.openCursor();

                cursorRequest.onsuccess = function(event) {
                    var cursor = event.target.result;
                    if (cursor) {
                        allMetadata.push(cursor.value);
                        cursor.continue();
                    } else {
                        // No more entries
                        if (typeof callback === 'function') callback(null, allMetadata);
                    }
                };
                cursorRequest.onerror = function(e) {
                    if (typeof callback === 'function') callback(e.target.error);
                };
            });
        },

        saveLanguageMetadata: function (metadata, callback) {
            getStore(LANG_METADATA_STORE, 'readwrite', function(err, store, transaction) {
                if (err) { if (typeof callback === 'function') callback(err); return; }
                var itemsToSave = Array.isArray(metadata) ? metadata : [metadata];
                var totalItems = itemsToSave.length;
                var savedCount = 0;
                var errors = [];

                if (totalItems === 0 && typeof callback === 'function') { callback(null); return; }

                function onItemSaved(error) {
                    if (error) errors.push(error);
                    savedCount++;
                    if (savedCount === totalItems) {
                        // This part will be handled by transaction.oncomplete or transaction.onerror
                    }
                }

                itemsToSave.forEach(function(item) {
                    var request = store.put(item);
                    request.onsuccess = function() { onItemSaved(null); }; // Track success for individual items if needed
                    request.onerror = function(e) {
                        console.error("Error saving metadata item:", item.code, e.target.error);
                        onItemSaved(e.target.error); // Track error for individual items
                    };
                });

                transaction.oncomplete = function() {
                    if (typeof callback === 'function') {
                        // If you need to report per-item errors, you'd check the 'errors' array here
                        // For simplicity, the original just reports transaction success/failure.
                        callback(null);
                    }
                };
                transaction.onerror = function(e) {
                    if (typeof callback === 'function') callback(e.target.error);
                };
            });
        },

        getLanguagePuzzles: function (langCode, callback) {
            getStore(LANG_PUZZLES_STORE, 'readonly', function(err, store) {
                if (err) { if (typeof callback === 'function') callback(err); return; }
                var request = store.get(langCode);
                request.onsuccess = function () {
                    if (typeof callback === 'function') {
                        callback(null, request.result ? request.result.puzzles : null);
                    }
                };
                request.onerror = function (e) { if (typeof callback === 'function') callback(e.target.error); };
            });
        },

        saveLanguagePuzzles: function (langCode, puzzles, callback) {
            getStore(LANG_PUZZLES_STORE, 'readwrite', function(err, store, transaction) {
                if (err) { if (typeof callback === 'function') callback(err); return; }
                var request = store.put({ code: langCode, puzzles: puzzles });
                // request.onerror is not needed here as transaction.onerror will catch it.
                // request.onerror = function(e) { console.error("Error saving puzzles for:", langCode, e.target.error); };
                transaction.oncomplete = function() { if (typeof callback === 'function') callback(null); };
                transaction.onerror = function(e) {
                    console.error("Transaction error saving puzzles for:", langCode, e.target.error);
                    if (typeof callback === 'function') callback(e.target.error);
                };
            });
        },

        deleteLanguage: function(langCode, callback) {
            var storesToDeleteFrom = [LANG_METADATA_STORE, LANG_PUZZLES_STORE];
            var successfulDeletes = 0;
            var anyError = null;

            function attemptDelete(storeName, innerCallback) {
                getStore(storeName, 'readwrite', function(err, store, transaction) {
                    if (err) {
                        innerCallback(err);
                        return;
                    }
                    var request = store.delete(langCode);
                    request.onsuccess = function() {
                        // Deletion was successful for this item, transaction.oncomplete will confirm
                    };
                    // request.onerror is not strictly necessary here, transaction.onerror handles it.
                    // request.onerror = function(e) { console.error("Error deleting from " + storeName + ": ", e.target.error);};

                    transaction.oncomplete = function() {
                        innerCallback(null); // Success for this store
                    };
                    transaction.onerror = function(e) {
                        console.error("Transaction error deleting " + langCode + " from " + storeName + ":", e.target.error);
                        innerCallback(e.target.error); // Error for this store
                    };
                });
            }

            var storesProcessed = 0;
            storesToDeleteFrom.forEach(function(storeName) {
                attemptDelete(storeName, function(err) {
                    storesProcessed++;
                    if (err) {
                        anyError = anyError || err; // Keep the first error encountered
                    } else {
                        successfulDeletes++;
                    }

                    if (storesProcessed === storesToDeleteFrom.length) {
                        if (typeof callback === 'function') {
                            if (anyError) {
                                callback(anyError);
                            } else if (successfulDeletes === storesToDeleteFrom.length) {
                                callback(null); // All deletes successful
                            } else {
                                // This case should ideally be covered by anyError,
                                // but as a fallback if some transactions failed without setting anyError
                                callback(new Error("Failed to delete language data completely for " + langCode));
                            }
                        }
                    }
                });
            });
        }
    };
})();