/**
 * Module responsible for sending out tweet notifications
 */
var twitter = require('ntwitter'),
    client = require('lib/twitterclient'),
    url = require('url');

/**
 * @constructor
 */
function TweetPoster (opts) {
    if (!(this instanceof TweetPoster)) {
        return new TweetPoster(opts);
    }
    this._client = null;
}

TweetPoster.prototype.initialize = function (config, callback) {
    this._client = new TwitterClient();

    try {
        this._client.createClient(config, callback);
        //console.log('client: ', self._client);
    } catch (e) {
        callback(e.getMessage());
    }
};

/**
 * posts new tweet to the app account
 * @param {Object} data tweet details
 */
TweetPoster.prototype.post = function (data) {
    console.log('posting new tweet', data);
};

/**
 * @exports
 */
module.exports = TweetPoster;

