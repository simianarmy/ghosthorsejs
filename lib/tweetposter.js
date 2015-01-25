/**
 * Module responsible for sending out tweet notifications
 */

/**
 * @constructor
 */
function TweetPoster (opts) {
    if (!(this instanceof TweetPoster)) {
        return new TweetPoster(opts);
    }
    this._client = opts.client;
}

/**
 * posts new tweet to the app account
 * @param {Object} data tweet details
 */
TweetPoster.prototype.execute = function (data) {
    console.log('TWEETING SOMETHING! ', data);
};

/**
 * @exports
 */
module.exports = TweetPoster;

