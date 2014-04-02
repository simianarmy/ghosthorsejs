ghosthorsejs
============

Node / client app to speak horse_js tweets

Live at www.horsejs.com

Live site runs on the 'stable' branch

Installation
============
> git clone git@github.com:simianarmy/ghosthorsejs.git  
> cd ghosthorsejs

* Edit server.js configuration blob keys

> node server.js 

Architecture
============

* Node backend converts tweets to audio using OS X built in 'say' program.  It
  then converts those to mp3 for web playback.  mp3s are saved to S3 and their 
  metadata are saved to Parse

Notes
=====
Currently following: @horse_js & @horse_horse_js


