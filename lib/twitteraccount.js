/**
 * Module responsible for accessing and retrieving twitter user tweets
 * Simple aggregate object for client & monitor
 */

var TweetMonitor = require('./tweetmonitor');

/**
 * @constructor
 * @param {Object} opts
 *   client {TwitterClient} twitter api client
 *   user {String} tweet handle
 */
function TwitterAccount(opts) {
    this._client = opts.client;
    this._user = opts.user;
}

/**
 * begin monitoring an account
 * @param {Function} onDataCb callback for every new tweet found
 */
TwitterAccount.prototype.monitor = function (onDataCb) {
    new TweetMonitor({
        client: this._client,
        handle: this._user,
        onUpdate: onDataCb
    }).start();
};

module.exports = TwitterAccount;
