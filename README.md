# ghosthorsejs
> Node server app to speak horse_js tweets

Web site lives at https://github.com/simianarmy/horsejs.com

## Installation

```
git clone git@github.com:simianarmy/ghosthorsejs.git
cd ghosthorsejs
```

## Running

```
node app.js
```

## Architecture

* Node backend converts tweets to audio using OS X built in 'say' program.  It
  then converts those to mp3 for web playback.  mp3s are saved to S3 and their 
  metadata are saved to custom Parse backend.

  API hosted at api.twhispr.com serves metadata info as a Parse service

  Express-powered front end at www.twhispr.com serves pages for Twitter
  Audio Cards API

## Notes

- SSL Certs powered by Let's Encrypt.  Requires script on servers to
  auto-renew.
  
  Cronjob on api.twhispr.com server to auto-renew Let's Encrypt certs
  # 54 17 * * * /path/to/certbot-auto renew --nginx && service nginx reload

## TODO

- Self-service addition of Twitter accounts to follow
- Some kind of business justification

