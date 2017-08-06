var expect = require("chai").expect,
    uploader = require('../lib/uploader.js'),
    config = require('../lib/appconfig.js')
 
describe("AudioUploader", function() {
    var s3Config, settings;

    beforeEach(function () {
        s3Config = config.S3;
    });

    describe("constructor", function () {
        it("should create AWS client", function () {
            var up = new uploader({ S3: s3Config, settings: { audioPath: '.' } });
            expect(up.s3Client).to.be.ok();
        });

        describe("isUploaded", function () {
            var up;

            beforeEach(function () {
                up = new uploader({ S3: s3Config, settings: { audioPath: './test/' } });
            });

            it("should return promise rejection if file does not exist", function () {
                return up.isUploaded('non_existent_file').then(function (fileInfo) {
                }, function (fail) {
                    expect(fail).to.be.ok();
                });
            });

            it("should return promise success if file exists", function() {
                var testfile = 'dummy.s3.testfile';

                return up.upload({audioFile: testfile})
                    .then(function(res) {
                        console.log(res);
                        return up.isUploaded(testfile).then(function (info) {
                            expect(info).to.be.ok();
                        });
                    });
            });
        });
    });
});
