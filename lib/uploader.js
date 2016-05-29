/**
 * Audio file uploader
 */
var SC = require('soundcloud-api'),
    AWS = require('aws-sdk'),
    Q = require('q'),
    fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn,
    winston = require('winston');

/**
 * @class AudioUploader
 * @param {Object} opts
 *   {Object} S3 credentials
 *   {Object] SC credentials
 *   {Object} settings misc
 */
function AudioUploader (opts) {
    this.s3Client = null;
    this.scClient = null;
    this.settings = opts.settings;

    // S3
    if (opts.S3.enabled) {
        AWS.config.update(opts.S3);
        this.s3Client = new AWS.S3();
    }

    // Soundcloud
    if (opts.SC.enabled) {
        var sc = new SC({
            client_id : opts.SC.clientId,
            client_secret : opts.SC.clientSecret,
            ssl: true,
            username: opts.SC.username,
            password: opts.SC.password
        });
        this.scClient = sc.client();
    }
}

/**
 * Performs task of uploading sound file to one or more network services
 * @param {Object} data
 *   {String} audioFile filename
 *   {String} handle tweet author's twitter handle
 * @return {Q.Deferred} Promise
 */
AudioUploader.prototype.upload = function (data) {
    var self = this;

    return Q.all([this._uploadToS3(data.audioFile), this._uploadToSoundcloud(data)]);
};

/**
 * uploads file to S3 for safe keeping...I don't fully trust Soundcloud
 * @param {String} fileName
 */
AudioUploader.prototype._uploadToS3 = function (fileName) {

    var deferred = Q.defer();

    if (!this.s3Client) {
        return deferred.resolve(fileName);
    }

    var params = {
        ACL: 'public-read',
        StorageClass: 'REDUCED_REDUNDANCY',
        Bucket: 'horsejs', 
        Key: fileName,
        Body: fs.readFileSync(path.join(this.settings.audioPath, fileName)) 
    };

    winston.info('uploading ' + fileName + ' to S3...');

    this.s3Client.putObject(params, function (err, data) {
        if (!err) {
            deferred.resolve(data);
        } else {
            winston.info('S3 UPLOAD FAIL: ' + err);
            deferred.reject(err);
        }
    });
    return deferred.promise;
};

/**
 * Uploads file to soundcloud - for Twitter Cards
 * Looks like Soundcloud is eating shit now...as I expected
 * @param {Object} data;
 */
AudioUploader.prototype._uploadToSoundcloud = function (data) {

    var deferred = Q.defer();

    // Soundcloud is on the outs
    if (!this.scClient) {
        return deferred.resolve(data);
    }

    var filePath = path.join(this.settings.audioPath, data.audioFile);
    var author = data.handle;

    winston.info(['Running ruby ', this.settings.soundcloudUploader, filePath, author].join(' '));
    var upload = spawn('ruby', [this.settings.soundcloudUploader, filePath, author]);
    var output = null;

    upload.stdout.on('data', function (out) {
        var str = out.toString(), lines = str.split(/(\r?\n)/g);
        winston.info('ruby stdout: ' + str);
        output = lines[0];
    });
    upload.stderr.on('data', function (err) {
        winston.info('ruby stderr: ' + err);
    });
    upload.on('close', function (code) {
        winston.info('child process exited with code ' + code);

        // Saving the SoundCloud trackId!  This will be saved later to storage
        if (code === 1 && output !== null) {
            data.trackId = parseInt(output, 10);
            deferred.resolve(data);
        } else {
            deferred.reject('SoundCloud uploader failed to upload');
        }
    });
    return deferred.promise;
};

module.exports = AudioUploader;
