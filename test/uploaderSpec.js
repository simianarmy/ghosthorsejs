var expect = require("chai").expect,
    uploader = require('../lib/uploader.js'),
    config = require('../lib/appconfig.js')
 
describe("AudioUploader", function() {
    var s3Config, scConfig;

    beforeEach(function () {
        s3Config = config.S3,
        scConfig = config.Soundcloud
    });

    describe("constructor", function () {
        it("should create AWS client", function () {
            var up = new uploader({S3: s3Config, SC: scConfig});
            expect(up.s3).to.be.ok();
        });

        it("should create Soundcloud client", function () {
            var up = new uploader({S3: s3Config, SC: scConfig});
            expect(up.scClient).to.be.ok();
        });
    });
});
