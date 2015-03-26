/**
 */
var expect = require("chai").expect,
    TwitterClient = require('../lib/twitterclient.js'),
    Sprinkler = require('../lib/twhisprersprinkler.js'),
    config = require('../lib/appconfig.js');

describe('TwitterTimeline', function () {

    var tc, ts;

    before(function () {
        tc = new TwitterClient();
        tc.createClient(config.Twitter.twhisprer, function () {});
    });

    beforeEach(function () {
        ts = new Sprinkler({client: tc});
    });

    describe('oUpdate', function () {
    
    });
});

