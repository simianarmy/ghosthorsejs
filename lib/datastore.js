/**
 * Datastore interface
 * Used to store permanent application-wide data
 */

var Parse = require('parse/node'),
    util = require('util'),
    Q = require('q'),
    winston = require('winston');

var HorseTweetClass = 'HorseTweet';
var ERR_NOT_FOUND   = 'ERR_NOT_FOUND';

module.exports = DataStore;

function DataStore (opts) { 
    // Using parse-server as the datastore
    this._config = opts.config.Parse;

    Parse.initialize(opts.config.Parse.appId);
    Parse.serverURL = opts.config.Parse.server;

    this._DataObject = Parse.Object.extend(HorseTweetClass);
}

/**
 * Saves tweet data to data store
 * @param {Object} tweet
 * @return {Q.Deferred} Promise
 */
DataStore.prototype.saveHorseTweet = function (accountId, tweet) {
    var self = this;
    var deferred = Q.defer();

    if (!tweet) {
        return Q.reject('Error: invalid data');
    }
    // Query Parse for object first so that we don't duplicate data
    // Make sure the id is a string and not named 'id' so that we don't confuse Parse
    tweet.tid = tweet.id + '';
    tweet.accountId = accountId;
 
    this.getHorseTweet(accountId, tweet.tid, function (err, result) {
        if (err === null) {
            //winston.info('Parse object(s) already exists for tid: ' + tweet.tid);
            deferred.resolve('already exists');
        } 
        else if (err === ERR_NOT_FOUND) {
            // Create Parse object and set the data attributes
            winston.info('Saving to Parse: ', tweet);
            var horseTweet = new self._DataObject();

            horseTweet.save({
                accountId: accountId,
                tid: tweet.tid,
                text: tweet.text,
                audioFile: tweet.audioFile,
                filePrefix: tweet.filePrefix,
                source: tweet.source,
                handle: tweet.handle,
                name: tweet.name,
                created: tweet.created
            }, { 
                success: function (horseTweet) {
                    winston.info('Saved object');
                    // Might be safer to simply return tweet var
                    deferred.resolve(horseTweet.toJSON());
                },
                error: function (horseTweet, err) {
                    var message = "Error: " + err.code + " " + err.message;
                    winston.info('Parse save error: ' + message);
                    deferred.reject(message);
                }
            });
        } else {
            deferred.reject(err);
        }
    });

    return deferred.promise;
};

/**
 * Fetches tweet by id
 * @param {Number} aid account id
 * @param {String} tid tweet id
 * @param {Function} callback
 */
DataStore.prototype.getHorseTweet = function (aid, tid, callback) {

    var query = new Parse.Query(this._DataObject);

    // Make sure the id is a string and not named 'id' so that we don't confuse Parse
    tid = tid + '';
    winston.info('Querying for tweet ' + tid);

    query.equalTo('accountId', aid);
    query.equalTo('tid', tid);
    query.limit(1);
    query.find({
        success: function (results) {
            if (results && results.length > 0) {
                // Make sure to return the Parse object as JSON!
                callback(null, results[0].toJSON());
            }
            else {
                winston.warn('Tweet not found');
                callback(ERR_NOT_FOUND);
            }
        }, 
        error: function (error) {
            var message = "Error: " + error.code + " " + error.message;
            winston.warn(message);
            callback(message);
        }
    });
};
