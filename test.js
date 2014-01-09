var API = require('./samsung-discovery');

var connecting_to = {};

var known_tokens = {};





new API().on('discover', function(aircon) {

  if (connecting_to[aircon.options.ip]) { 
    return; 
  }

  // Do we need to find get a token?
  if (!known_tokens[aircon.options.ip]) {
    connecting_to[aircon.options.ip] = true;

    aircon.get_token(function(err, token) {
      if (!!err) return console.log('get_token error: ' + err.message);

      console.log('Token is ' + token);
      known_tokens[aircon.options.ip] = token;
      connecting_to[aircon.options.ip] = false;

    }).on('waiting', function() {
      console.log('Please power on the device within the next 30 seconds');
    });

    return;
  }

  connecting_to[aircon.options.ip] = true;
  aircon.login(known_tokens[aircon.options.ip], function() {
    aircon.onoff(true);

    setTimeout(function() { aircon.onoff(false); }, 10 * 1000);
  });


}).on('error', function(err) {
  console.log('discovery error: ' + err.message);
});
