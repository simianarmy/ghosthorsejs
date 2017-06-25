var expect = require("chai").expect,
    uploader = require('../lib/uploader.js'),
    config = require('../lib/appconfig.js')
 
describe("AudioUploader", function() {
    var s3Config;

    beforeEach(function () {
        s3Config = config.S3;
    });

    describe("constructor", function () {
        it("should create AWS client", function () {
            var up = new uploader({S3: s3Config});
            expect(up.s3Client).to.be.ok();
        });
    });
});
