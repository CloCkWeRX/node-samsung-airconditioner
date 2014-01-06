node-samsung-airconditioner
===========================

A node.js module to interface with Samsung SMART Airconditioners

Install
-------

    npm install samsung-airconditioner

API
---

### SSDP

https://github.com/TheThingSystem/steward/issues/100

### Get a token


    var SamsungAirconditionerAuthenticator = require('./samsung-airconditioner-authenticator');


    var auth = new SamsungAirconditionerAuthenticator({
      ip: '192.168.1.15' 
    });

    auth.socket.on('physicallyAuthenticating', function() {
      console.log("Please physically power on your air conditioner within the next 30 seconds");
    });

    auth.socket.on('failedAuthentication', function() {
      console.log("Too slow!");
    });

    auth.socket.on('authenticated', function(token) {
      console.log("Your token is: " + token);
    });

    auth.socket.on('end', function() {
      console.log("Bye");
    });


#### Drive the aircon

    var aircon = new SamsungAirconditioner({
      ip: '192.168.1.15',
      token: '98854465-6273-M559-N887-373832354144',
      duid: '7825AD103D06'
    })
    aircon.socket.on('loggedIn', function() {
      aircon.on();

      setTimeout(function () {
        aircon.off();
      }, 10000);
    });
