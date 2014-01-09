var API = require('./samsung-discovery');

new API().on('discover', function(aircon) {
  aircon.login(function(err, token) {
    if (!!err) return console.log('login error: ' + err.message);

    console.log('token is ' + token);

    aircon.onoff(true);
    setTimeout(function() { aircon.onoff(false); }, 10 * 1000);
  }).on('waiting', function() {
    console.log('please power on the device within the next 30 seconds');
  });
}).on('error', function(err) {
  console.log('discovery error: ' + err.message);
});
