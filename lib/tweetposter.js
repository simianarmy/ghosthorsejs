/**
 * Module responsible for sending out tweet notifications
 */
var Q = require('q'),
    winston = require('winston');

/**
 * @constructor
 */
function TweetPoster (opts) {
    if (!(this instanceof TweetPoster)) {
        return new TweetPoster(opts);
    }
    this._client = opts.client;
}

// TODO: make this configurable
var AUDIO_URL = 'https://twhispr.com/cards/';

/**
 * posts new tweet to the app account
 * @param {Object} data tweet details
 * sample data:
     { id: 559505187769835500,
  created: 'Mon Jan 26 00:16:46 +0000 2015',
  name: 'Riker Googling',
  handle: 'RikerGoogling',
  text: 'klingon knock knock jokes',
  source: '<a href="http://twitter.com/download/iphone" rel="nofollow">Twitter for iPhone</a>',
  filePrefix: 559505187769835500,
  audioFile: '559505187769835500.mp3',
  tid: '559505187769835500',
  accountId: 4 }
 */
TweetPoster.prototype.post = function (data) {
    var deferred = Q.defer();

    this._client.tweet(this._formatPost(data), function (err, data) {
        if (err) {
            deferred.reject(err);
        } else {
            deferred.resolve(data);
        }
    });
    return deferred.promise;
};

/**
 * Formats the status update string
 * @param {Objevct} data
 * @return {String}
 */
TweetPoster.prototype._formatPost = function (data) {
    var text = '.@' + data.handle + ' said ' + AUDIO_URL + 
        [data.handle, data.id, data.trackId].join('/');

    if (data.notifyUser) {
        text += ' @' + data.notifyUser;
    }
    // link back to tweet
    //text += ' https://twitter.com/' + data.handle + '/status/' + data.tid;
    winston.info(data);

    winston.info('TWEETING ' + text);
    return text;
};

/**
 * @exports
 */
module.exports = TweetPoster;

