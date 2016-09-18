var expect = require("chai").expect,
    DataStore = require('../lib/datastore.js'),
    config = require('../lib/appconfig.js');

describe('DataStore', function () {
    var ds;

    before(function () {
        ds = new DataStore({config: config});
    });

    describe('config', function () {
        it('should store required Parse properties', function () {
            expect(config.Parse).to.be.ok();
        });
    });

    describe('constructor', function () {
        it('should create the datastore client', function () {
            expect(ds).to.be.ok();
        });
    });

    describe('data lookup', function () {
        it('should return error if record not found', function (done) {
            ds.getHorseTweet(1, 'foo', function (err) {
                expect(err).to.not.equal(null);
                done();
            });
        });


        it('should return data object if record found', function (done) {
            // Using live data, so just use one we know exists
            var aid = 3;
            var tid = '777178779391299600';
            ds.getHorseTweet(aid, tid, function (err, tweet) {
                expect(tweet).to.be.ok();
                done();
            });
        });

        it('should return data as JSON object', function (done) {
            var aid = 3;
            var tid = '777178779391299600';
            ds.getHorseTweet(aid, tid, function (err, tweet) {
                expect(tweet.text).to.be.ok();
                done();
            });
        });
    });

    describe('saving data', function () {
        describe('failing case', function () {
            it('should fail with error message if data is malformed', function () {
                return ds.saveHorseTweet(1, null).then(null, function (err) {
                    expect(err).to.contain('invalid');
                });
            });

            it('should fail with message if data already saved', function () {
                var aid = 3;
                var tid = '777178779391299600';
                var data = {
                    id: tid,
                    text: 'SHIT'
                };

                return ds.saveHorseTweet(aid, data).then(function (res) {
                    expect(res).to.contain('already exists');
                });
            });
        });

        describe('success case', function () {
            it('should return the saved object as JSON', function () {
                var aid = 666;
                var tid = Date.now(); // enforce uniqueness of tid
                var data = {
                    id: tid,
                    text: 'mocha test case 1'
                };

                return ds.saveHorseTweet(aid, data).then(function (res) {
                    expect(res.accountId).to.equal(aid);
                    expect(res.tid).to.equal(tid+'');
                    expect(res.text).to.equal(data.text);
                    expect(res.objectId).to.be.ok();
                });
            });
        });
    });
});
