/**
 * Created by igor on 20.09.16.
 */

"use strict";

var IDBTransaction = window.IDBTransaction || window.webkitIDBTransaction;

if (IDBTransaction) {
    IDBTransaction.READ_WRITE = IDBTransaction.READ_WRITE || 'readwrite';
    IDBTransaction.READ_ONLY = IDBTransaction.READ_ONLY || 'readonly';
}
    
var modelVerto = {
    _dbName: 'verto',
    _dbDescription: "A Verto phone DB",
    _dbCollections: [
        {
            name: "history",
            keyPath: "id",
            autoIncrement: true,
            index: [
                {
                    name: "createdOn",
                    columns: "createdOn",
                    unique: false
                }
            ]
        },
        {
            name: 'chat',
            keyPath: "id",
            autoIncrement: true,
            index: [
                {
                    name: "createdOn",
                    columns: "createdOn"
                },
                {
                    name: "from",
                    columns: "from"
                }
            ]
        }
        // {
        //     name: 'contacts',
        //     columns: [{
        //         name: "name",
        //         unique: false
        //     },{
        //         name: "email",
        //         unique: true
        //     },{
        //         name: "number",
        //         unique: true
        //     }]
        // }
    ],
    db: null,
    _destroy: function () {
        indexedDB.deleteDatabase(this._dbName);
    },
    init: function (cb) {
        var request = indexedDB.open(this._dbName, 1),
            scope = this;

        request.onsuccess = function (event) {
            scope.db = event.target.result;
            return cb && cb()
        };

        request.onupgradeneeded = function (event) {
            var db = event.target.result;

            console.debug('onupgradeneeded');

            for (var col of scope._dbCollections) {
                initTable(col,responseInitTable)
            }

            var responseCount = 0;

            function responseInitTable(store) {
                console.debug('init table ' + store.name + ': OK');
                if (++responseCount == scope._dbCollections.length) {
                    console.info('init database success');
                    scope.db = db;
                    return cb && cb()
                }
            }

            function initTable(prop, callback) {
                var objectStore = db.createObjectStore(prop.name, { keyPath: prop.keyPath,  autoIncrement: prop.autoIncrement});

                // Create an index to search customers by name. We may have duplicates
                // so we can't use a unique index.
                // Create an index to search customers by email. We want to ensure that
                // no two customers have the same email, so use a unique index.

                for (var i of prop.index) {
                    objectStore.createIndex(i.name, i.columns, { unique: i.unique == true, multiEntry: i.multiEntry == true });
                }

                callback(objectStore);

            }
        }

        
    },
    add: function (collectionName, data, cb) {

        var trans = this.db.transaction(collectionName, IDBTransaction.READ_WRITE);
        var store = trans.objectStore(collectionName);

        // add
        var requestAdd = store.add(data);

        requestAdd.onsuccess = function(e) {
            return cb(null, e);
        };

        requestAdd.onerror = function(e) {
            return cb(e.target.error)
        };
    },
    
    list: function (collectionName, params = {}, cb) {
        var transaction = this.db.transaction(collectionName, IDBTransaction.READ_ONLY);
        var objectStore = transaction.objectStore(collectionName);
        if (params.index) {
            objectStore = objectStore.index(params.index)
        }
        var result = [];
        var limit = params.limit || Infinity;
        var idx = 0;
        var filter = null;

        if (params.search) {
            filter = IDBKeyRange.only(params.search)
        }

        objectStore.openCursor(filter, params.sort).onsuccess = function(event) {
            var cursor = event.target.result;
            if (cursor) {
                result.push(cursor.value);

                if (++idx >= limit) {
                    transaction.abort();
                    return cb && cb(result);
                } else {
                    cursor.continue();
                }
            }
            else {
                return cb && cb(result)
            }
        };
    }
};