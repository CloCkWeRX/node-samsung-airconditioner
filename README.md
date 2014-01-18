node-samsung-airconditioner
===========================

A node.js module to interface with Samsung SMART Airconditioners

Install
-------

    npm install samsung-airconditioner

API
---

### Load

    var API = require('samsung-airconditioner').API;


### Discover

    new API().on('discover', function(aircon) {
      // now login!
    }).on('error', function(err) {
      console.log('discovery error: ' + err.message);
    });

### Get Token

You need to physically authenticate with the aircon during your first setup.

      aircon.get_token(function(err, token) {
        if (!!err) return console.log('login error: ' + err.message);

        // remember token for next time!
      }).on('waiting', function() {
        console.log('please power on the device within the next 30 seconds');
      }).on('end', function() {
        console.log('aircon disconnected');
      }).on('err', function(err) {
        console.log('aircon error: ' + err.message);
      });

### Login

Have a token? This time connect.

      aircon.login(token, function(err) {
        if (!!err) return console.log('login error: ' + err.message);

        // Drive the aircon!
        aircon.onoff(true);
      });


#### Drive the aircon after logging in

    aircon.onoff(true);

    aircon.mode(type);                   // one of 'auto', 'cool', 'dry', 'wind', or 'heat'

    aircon.set_temperature(celcius);
    aircon.get_temperature(function(err, celcius) {});

    aircon.set_convenient_mode(mode);    // one of 'off', 'quiet', 'sleep', 'smart', 'softcool', 'turbomode',
                                         // 'windmode1', 'windmode2', 'windmode3'

    aircon.sleep_mode(hours);


#### Responding to manual changes or confirming your changes

    new API().on('discover', function(aircon) {
      aircon.login(token, function(err) {
        if (!!err) return console.log('login error: ' + err.message);

        // Drive the aircon!
        aircon.onoff(true);
      }).on('stateChange', function(state) {
        // Responses, or user triggered state changes
        console.log(state);
      });
    });

The air conditioner can be changed quite rapidly by a person with the physical controls or remote.
For example, in about a minute the following were generated


  "AC_FUN_POWER": "On"
  "AC_FUN_OPMODE": "Cool" 
  "AC_FUN_TEMPSET": "24"
  "AC_FUN_OPMODE": "Dry"
  "AC_FUN_OPMODE": "Wind"
  "AC_FUN_WINDLEVEL": "Low"
  "AC_FUN_OPMODE": "Heat"
  "AC_FUN_WINDLEVEL": "Auto"
  "AC_FUN_OPMODE": "Auto" 
  "AC_FUN_TEMPSET": "23" 
  "AC_ADD_SPI": "On" 
  "AC_ADD_AUTOCLEAN": "On" 
  "AC_FUN_TEMPNOW": "28" 
  "AC_FUN_POWER": "Off" 
  "AC_FUN_POWER": "On" 
  "AC_ADD_SPI": "Off" 
  "AC_FUN_OPMODE": "Cool" 
  "AC_FUN_TEMPSET": "24" 
  "AC_FUN_DIRECTION": "SwingUD" 
  "AC_FUN_COMODE": "Smart" 
  "AC_FUN_DIRECTION": "Fixed" 
  "AC_FUN_COMODE": "Quiet" 
  "AC_FUN_DIRECTION": "SwingUD" 
  "AC_FUN_DIRECTION": "Rotation" 
  "AC_FUN_COMODE": "Off" 
  "AC_FUN_OPMODE": "Dry" 
  "AC_FUN_OPMODE": "Wind" 
  "AC_FUN_WINDLEVEL": "Low" 
  "AC_FUN_WINDLEVEL": "Mid" 
  "AC_FUN_WINDLEVEL": "Low" 
  "AC_FUN_WINDLEVEL": "Mid" 
  "AC_FUN_WINDLEVEL": "Low" 
  "AC_FUN_POWER": "Off"
