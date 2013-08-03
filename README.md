ghosthorsejs
============

Node / client app to speak horse_js tweets

Installation
============
> git clone git@github.com:simianarmy/ghosthorsejs.git
> cd ghosthorsejs

* Edit server.js configuration blob keys: nodeHost, nodePort, audioHost to point
to your local dev server

* Run the dev server - it reloads anytime you make a change to a file

> NODE_PATH=. node run_dev_server.js 

* There's some bullshit NODE_PATH b.s. that will probably break all over the
  place.  I wish I could say it was an easy fix...

* open browser to nodeHost value

Architecture
============
* Node backend uses Bayeux protocol (via Faye module) to implement pub/sub between node server
  and clients http://svn.cometd.com/trunk/bayeux/bayeux.html

* Web clients register themselves with the node server, the node server pushes
  new HorseJS tweets to all of them simultaneously (via websockets, if
  supported, otherwise falls back to long polling)

* Node backend converts tweets to audio using OS X built in 'say' program.  It
  then converts those to mp3 for web playback.

Notes
=====
This project should be split into the node server and website, but it's so
small right now...who cares?

