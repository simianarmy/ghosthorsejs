/**
 * Datastore interface
 * Used to store permanent application-wide data
 */

var Parse = require('node-parse-api').Parse,
    util = require('util');

var HorseTweetClass = 'HorseTweet';

module.exports = DataStore;

function DataStore (opts) {
    this._config = opts.config.Parse;
    this._store = new Parse(this._config.appId, null, this._config.restKey);
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

    self._store.find(HorseTweetClass, { tid: tweet.tid }, function (err, response) {
        if (err) {
            console.log('Parse find error: ' + err);
            callback(err);
        } 
        if (response.results && response.results.length === 0) {
            console.log('Saving to Parse: ' + util.inspect(tweet));

            self._store.insert(HorseTweetClass, tweet, function (err, response) {
                if (err) {
                    console.log('Parse insert error: ' + err);
                }
                console.log(response);
                callback(err);
            });
        } else {
            console.log('Parse object already exists for id: ' + tweet.tid);
            callback();
        }
    });
};

