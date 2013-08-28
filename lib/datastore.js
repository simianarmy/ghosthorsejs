/**
 * Datastore interface
 * Used to store permanent application-wide data
 */

var Kaiseki = require('kaiseki'),
    util = require('util');

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
 */
DataStore.prototype.saveHorseTweet = function (tweet, callback) {
    var self = this;
    // Query Parse for object first so that we don't duplicate data
    // Make sure the id is a string and not named 'id' so that we don't confuse Parse
    tweet.tid = tweet.id + '';
 
    // query with search parameters - only care about existence of results, not
    // data
    var params = { 
        where: { 
            tid: tweet.tid 
        },
        count: true,
        limit: 1
    };
    self._api.getObjects(HorseTweetClass, params, function (err, res, body, success) {
        if (!success) {
            console.log('Store find error: ' + err);
            callback(err);
        } 
        if (body.count === 0) {
            console.log('Saving to Parse: ' + util.inspect(tweet));

            self._api.createObject(HorseTweetClass, tweet, function (err, res, body, success) {
                if (!success) {
                    console.log('Parse insert error: ' + err);
                }
                console.log('Saved object', body);
                callback(err);
            });
        } else {
            console.log(body.count + ' Parse object(s) already exists for id: ' + tweet.tid);
            callback();
        }
    });
};

