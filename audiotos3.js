// Uploads audio in local filesystem to S3
//
var AWS = require('aws-sdk'),
    config = require('./lib/AppConfig').S3,
    path = require('path'),
    fs = require('fs');

var S3_BUCKET = 'horsejs';
var AUDIO_PATH = '/Users/marcmauger/Sites/neighs.horsejs.com/public/audio';

// Create an S3 client
AWS.config.update(config);
console.log(config);

var s3 = new AWS.S3();

var files = fs.readdirSync(AUDIO_PATH);
files.forEach(function (f) {
    upload(f);
});

function upload (f) {
    var params = {
        ACL: 'public-read',
        StorageClass: 'REDUCED_REDUNDANCY',
        Bucket: S3_BUCKET, 
        Key: path.basename(f), 
        Body: fs.readFileSync(path.join(AUDIO_PATH, f)) 
    };
    console.log('uploading ' + f + ' to S3...', params.Key);
    s3.putObject(params, function(err, data) {
        console.log("ENDPOINT", this.request.httpRequest.endpoint);
        if (err) {
            console.log('FAIL! ' +  err);
        } else {
            console.log(data);
        }
    });
}
