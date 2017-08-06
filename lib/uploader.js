/**
 * Audio file uploader
 */
var AWS = require('aws-sdk'),
    Q = require('q'),
    fs = require('fs'),
    path = require('path'),
    spawn = require('child_process').spawn,
    winston = require('winston');

var S3_BUCKET = 'horsejs';

/**
 * @class AudioUploader
 * @param {Object} opts
 *   {Object} S3 credentials
 *   {Object} settings misc
 */
function AudioUploader (opts) {
    this.s3Client = null;
    this.settings = opts.settings;
    this._cache = {};

    // S3
    if (opts.S3 && opts.S3.enabled) {
        AWS.config.update(opts.S3);
        this.s3Client = new AWS.S3();
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

    // check cache first
    if (self._cache[data.audioFile]) {
        return Q.fcall(function() { return data; });
    }
    // First check if it exists so we don't pay for unnecessary data by uploading
    // repeatedly.
    return this.isUploaded(data.audioFile)
        // file is uploaded already
        .then(function (info) {
            self._cache[data.audioFile] = true;

            return Q.fcall(function () { return info; });
            // file not found in cloud, go ahead and try to upload
        }, function () {
            return self._uploadToS3(data.audioFile);
        });
};

/**
 * Query object existence
 * @param {String} filename
 * @return {Q.Deferred} Promise with (data) on resolve, otherwise reject with
 * error
 */
AudioUploader.prototype.isUploaded = function (fileName) {

    var deferred = Q.defer();

    if (!this.s3Client) {
        return deferred.reject('ERR_NO_CLIENT');
    }

    var params = {
        Bucket: S3_BUCKET,
        Key: fileName
    };

    this.s3Client.headObject(params, function (err, data) {
        if (err) {
            deferred.reject(err);
        }
        else {
            deferred.resolve(data);
        }
    });

    return deferred.promise;
};

/**
 * uploads file to S3 for safe keeping...I don't fully trust Soundcloud
 * @param {String} fileName
 */
AudioUploader.prototype._uploadToS3 = function (fileName) {

    var self = this;
    var deferred = Q.defer();

    if (!this.s3Client) {
        return deferred.resolve(fileName);
    }

    var params = {
        ACL: 'public-read',
        StorageClass: 'REDUCED_REDUNDANCY',
        Bucket: S3_BUCKET,
        Key: fileName,
        Body: fs.readFileSync(path.join(this.settings.audioPath, fileName)) 
    };

    winston.info('uploading ' + fileName + ' to S3...');

    this.s3Client.putObject(params, function (err, data) {
        if (!err) {
            self._cache[fileName] = true;
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
