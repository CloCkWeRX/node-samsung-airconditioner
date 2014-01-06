
var util    = require('util'),
    tls     = require('tls'),
    carrier = require('carrier')
  ;


var DEFAULT_LOGGER = { error   : function(msg, props) { console.log(msg); if (!!props) console.trace(props.exception); }
                     , warning : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
                     , notice  : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
                     , info    : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
                     , debug   : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
                     };


var SamsungAirconditionerAuthenticator = function(options) {
  var self = this;

  var ip = options["ip"];
  var duid = options['duid'];

  var send = function(xml) {
    // console.log("Sending: " + xml);
    self.socket.write(xml + "\r\n");
  }
  
  self.socket = tls.connect({port: 2878, host: ip, rejectUnauthorized: false}, function () {
    // console.log("Connected");
  });

  carrier.carry(self.socket, function(line) {
    if (line == 'DRC-1.00')   {
      return;
    }

    if (line == '<?xml version="1.0" encoding="utf-8" ?><Update Type="InvalidateAccount"/>') {
      return send('<Request Type="GetToken" />');
    }

    if (line == '<?xml version="1.0" encoding="utf-8" ?><Response Type="GetToken" Status="Ready"/>') {
      self.socket.emit('physicallyAuthenticating');
      return;
    }

    if (line == '<?xml version="1.0" encoding="utf-8" ?><Response Status="Fail" Type="Authenticate" ErrorCode="301" />') {
      self.socket.emit('failedAuthentication');
      return;
    }

    var matches = line.match(/Token="(.*)"/)
    if (matches) {
      self.socket.emit('authenticated', matches[1]);
      return;
    }

    // console.log(line);
  });




};

module.exports = SamsungAirconditionerAuthenticator;