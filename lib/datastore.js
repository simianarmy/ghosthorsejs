/**
 * Datastore interface
 * Used to store permanent application-wide data
 */

var Kaiseki = require('kaiseki'),
    util = require('util'),
    Q = require('q');

var HorseTweetClass = 'HorseTweet';

module.exports = DataStore;

function DataStore (opts) {
    this._config = opts.config.Parse;
    this._api = new Kaiseki(this._config.appId, this._config.restKey);
}

/**
 * Saves tweet to store if necessary
 * @param {Object} tweet
 * @param {Function} callback
 * @return {Q.Deferred} Promise
 */
DataStore.prototype.saveHorseTweet = function (accountId, tweet, callback) {
    var self = this;
    var deferred = Q.defer();

    // Query Parse for object first so that we don't duplicate data
    // Make sure the id is a string and not named 'id' so that we don't confuse Parse
    tweet.tid = tweet.id + '';
    tweet.accountId = accountId;
 
    // query with search parameters - only care about existence of results, not
    // data
    var params = { 
        where: { 
            accountId: accountId,
            tid: tweet.tid 
        },
        count: true,
        limit: 1
    };
    self._api.getObjects(HorseTweetClass, params, function (err, res, body, success) {
        if (!success) {
            deferred.reject(err);
        } 
        else if (body.count === 0) {
            console.log('Saving to Parse: ' + util.inspect(tweet));

            self._api.createObject(HorseTweetClass, tweet, function (err, res, body, success) {
                if (!success) {
                    console.log('Parse insert error: ' + err);
                    deferred.reject(err);
                } else {
                    console.log('Saved object', body);
                    deferred.resolve(body);
                }
            });
        } else {
            //console.log(body.count + ' Parse object(s) already exists for id: ' + tweet.tid);
            deferred.resolve('already exists');
        }
    });

    return deferred.promise;
};

/**
 * Saves tweet to store if necessary
 * @param {String} id tweet id
 * @param {Function} callback
 */
DataStore.prototype.getHorseTweet = function (tid, callback) {
    var self = this;

    // Make sure the id is a string and not named 'id' so that we don't confuse Parse
    tid = tid + '';
    console.log('Querying for tweet ' + tid);

    // query with search parameters - only care about existence of results, not
    // data
    var params = { 
        where: { 
            tid: tid 
        },
        count: true,
        limit: 1
    };

    self._api.getObjects(HorseTweetClass, params, function (err, res, body, success) {
        callback(err, body);
    });
};
