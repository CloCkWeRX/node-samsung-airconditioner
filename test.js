var SamsungAirconditioner = require('./samsung-airconditioner');


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
