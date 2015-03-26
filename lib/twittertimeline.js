/**
 * Module responsible for accessing and retrieving twitter user tweets
 */

/**
 * @constructor
 * @param {Object} opts
 *   client {TwitterClient} twitter api client
 */
function TwitterTimeline(opts) {
    this._client = opts.client;
    this._fetchCb = null;
}

TwitterTimeline.REFRESH_INTERVAL = 60 * 5; // 5 minutes

/**
 * begin monitoring an account
 * @param {Function} onDataCb callback for every new tweet found
 */
TwitterTimeline.prototype.monitor = function (onDataCb) {
    this._fetchCb = onDataCb;

    this._refresh();
};

TwitterTimeline.prototype._refresh = function () {

    this._client.homeTimeline({}, function (err, json) {
        if (err) {
            console.warn('timeline request error: ' + err);
        }
        else if (this._fetchCb) {
            this._fetchCb(json);
        }
        setTimeout(this._refresh.bind(this), TwitterTimeline.REFRESH_INTERVAL * 1000);
    }.bind(this));
};

module.exports = TwitterTimeline;

