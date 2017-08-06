/**
 * TweetMonitor object
 * Responsible for saving a single Twitter account's tweets
 */
var fs = require('fs'),
   sys = require('sys'),
   util = require('util'),
   qs = require('querystring'),
   url = require('url'),
   winston = require('winston');

var SEARCH_INTERVAL = 5 * 60 * 1000; // minutes
var MORE_RESULTS_INTERVAL = 5 * 1000;
var MAX_PER_SEARCH = 20;

/**
 * @constructor
 */
function TweetMonitor (opts) {
    this._client = opts.client;
    this._user = opts.handle;
    this._fetchCb = opts.onUpdate;
    this._saved = {};
}

/** * Begins polling
 */
TweetMonitor.prototype.start = function () {

    winston.info('begin tracking twitter user ' + this._user);

    // Create initial search options
    this._search({count: MAX_PER_SEARCH});
};

/**
 * Executes search for next set of tweets
 */
TweetMonitor.prototype._search = function (opts) {
    var self = this;

    winston.info('searching twitter for ' + this._user, opts);

    try {
        this._client.search(this._user, opts, function (err, data) {
            if (err) {
                winston.info('twitter search error: ' + err);
            }
            self._parseSearchResults(data);
            self._monitor(data, opts);
        });
    } catch (e) {
        // Don't try to restart search on exceptions
        console.error('Exception in twitter search! ', e);
    }
};

TweetMonitor.prototype._parseSearchResults = function (data) {
    if (!data) {
        return;
    }
    var self = this;

    //winston.info('trackUser: ', data);
    data = data || [];
    
    if (util.isArray(data)) {
        data.forEach(function (tdata) {
            if (tdata.user.screen_name === self._user) {
                //winston.info(tdata.text);
                self._addTweet(tdata);
            }
        });
    }
    //winston.info(data.statuses.length + ' results');
};

/**
 * Called after a search - sets next search interval time
 * @param {Object} data most recent search results
 * @param {Object} opts search options
 */
TweetMonitor.prototype._monitor = function (data, opts) {
    var interval;

    // If there are more results, parse max_id and fetch again
    // Update: using new search api endpoint doesn't support pagination
    if (false && (typeof data !== 'undefined') && data.search_metadata.next_results) {
        // extract max id
        opts.max_id = qs.parse(data.search_metadata.next_results.substring(1)).max_id;
        interval = MORE_RESULTS_INTERVAL;
    } else {
        // set starting point for next search
        delete opts.max_id; // this will cause a twitter api error when < since_id
        opts.since_id = this._getMaxTweetId();
        interval = SEARCH_INTERVAL;
    }
    // start new search
    sys.log('fetching next tweets in ' + interval);
    setTimeout(this._search.bind(this, opts), interval);
};

/**
 * Process single tweet
 */
TweetMonitor.prototype._addTweet = function (tweet) {
    if (this._saved[tweet.id]) {
        return; // skip
    }
    if (this._fetchCb) {
        this._fetchCb(tweet);
    }
    // save ids
    this._saved[tweet.id] = tweet.id;
};

/**
 * Returns highest tweet id found so far
 * @return {Number}
 */
TweetMonitor.prototype._getMaxTweetId = function () {
    var max = Math.max.apply(null, Object.keys(this._saved));
    return max > 0 ? max : 0;
};

module.exports = TweetMonitor;
