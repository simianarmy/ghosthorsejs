var expect = require("chai").expect,
    TwitterClient = require('../lib/twitterclient.js'),
    config = require('../lib/appconfig.js');

describe('TwitterClient', function () {

    var tc;
    var TestAccount = 'realDonaldTrump';

    before(function () {
        tc = new TwitterClient();
        tc.createClient(config.Twitter.twhisprer, function () {});
    });

    describe('constructor', function () {
        it('should create Twitter client', function () {
            expect(tc._client).to.be.ok();
        });
    });

    describe('fetching tweets', function () {

        it('should be able to search public accounts', function (done) {
            tc.search(TestAccount, {}, function (err, json) {
                if (err) throw err;
                console.log('search results', json);
                expect(json).to.be.ok();
                done();
            });
        });

        it('should be able to fetch timeline posts', function (done) {
            tc.homeTimeline({}, function (err, json) {
                if (err) throw err;
                expect(json).to.be.ok();
                done();
            });
        });
    });
});
