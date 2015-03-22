/**
 * Monitors @twhisprer feed for tweet links to visit and add to the audio queue
 */

var TwitterTimeline = require('lib/twittertimeline');

/**
 * @constructor
 */
function TwhisprerSprinkler (opts) {
    // twitter client
    this._client = opts.client;
}

TwhisprerSprinkler.TWITTER_HANDLE = 'Twhisprer';

/**
 * Regular epression to find sprinkler-type messages
 */
TwhisprerSprinkler.TWEET_LINK_RE = /^@twhisprer https:\/\/t\.co\/\w+$/;

/**
 * Initialize account monitoring
 */
TwhisprerSprinkler.prototype.init = function () {
    // Begin client monitoring loop
    var timeline = new TwitterTimeline({
        client: this._client 
    });
    timeline.monitor(this.onUpdate.bind(this));
};

/**
 * Called when tweet found in account
 * @param {Object} tweet
 */
TwhisprerSprinkler.prototype.onUpdate = function (tweet) {
    console.log('Twhisprer tweet found: ' + tweet.text);
    // Does tweet match the sprinkler format? (link to tweet only)
    if (this._isValidSprinkler(tweet)) {
        console.log('Found sprinkler tweet!');
        // Fetch contents of linked tweet
    }
};

/**
 * Test if tweet is a sprinkler type
 * @param {Object} tweet
 * @return {Boolean}
 */
TwhisprerSprinkler.prototype._isValidSprinkler = function (tweet) {
    return TwhisprerSprinkler.TWEET_LINK_RE.test(tweet.text) &&
        (tweet.user.screen_name !== TwhisprerSprinkler.TWITTER_HANDLE);
};

module.exports = TwhisprerSprinkler;
