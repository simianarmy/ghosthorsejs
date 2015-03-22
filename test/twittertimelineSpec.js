var expect = require("chai").expect,
    TwitterClient = require('../lib/twitterclient.js'),
    TwitterTimeline = require('../lib/twittertimeline.js'),
    config = require('../lib/appconfig.js');

describe('TwitterTimeline', function () {

    var tc, tm;

    before(function () {
        tc = new TwitterClient();
        tc.createClient(config.Twitter.twhisprer, function () {});
    });

    beforeEach(function () {
        tm = new TwitterTimeline({client: tc});
    });

    describe('monitoring timeline', function () {
    
        it('should be able to fetch timeline posts', function (done) {
            tm.monitor(function (json) {
                console.log(json);
                expect(json).to.be.ok();
                done();
            });
        });
    });
});

