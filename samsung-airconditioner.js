
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


var SamsungAirconditioner = function(options) {
  var self = this;

  var ip = options["ip"];
  var token = options["token"];
  var duid = options['duid'];

  self.socket = tls.connect({port: 2878, host: ip, rejectUnauthorized: false}, function () {
    console.log("Connected");
  });

  // self.socket.setEncoding('utf8');

  carrier.carry(self.socket, function(line) {
    var as_xml;
    if (line == 'DRC-1.00')   {
      return;
    }

    if (line == '<?xml version="1.0" encoding="utf-8" ?><Update Type="InvalidateAccount"/>') {
      return send('<Request Type="AuthToken"><User Token="' + token + '" /></Request>');
    }

    if (line.match(/<Response Type="AuthToken" Status="Okay" StartFrom=".*"/i)) {
      self.socket.emit('loggedIn');
      return;
    }

    console.log(line);
  });

  self.socket.on('loggedIn', function() {
    console.log("You logged in");
  });


  self.socket.on('end', function() {
    console.log("Bye");
  });

  var send = function(xml) {
    console.log("Sending: " + xml);
    self.socket.write(xml + "\r\n");
  }

  var device_control = function(key, value) {
    send('<Request Type="DeviceControl"><Control CommandID="cmd10000" DUID="' + duid + '"><Attr ID="' + key + '" Value="' + value + '" /></Control></Request>');
  };

  // Public API
  self.on = function() {
    device_control('AC_FUN_POWER', 'On');
  };

  self.off = function() {
    device_control('AC_FUN_POWER', 'Off');
  };

  self.operation_mode = function(type) {
    var modes = ['Auto', 'Cool', 'Dry', 'Wind', 'Heat'];
    if (modex.indexOf(type) == -1) {
      throw "Invalid mode";
    }

    device_control('AC_FUN_OPMODE', mode);
  };

  self.set_temperature = function(temp) {
    device_control('AC_FUN_TEMPSET', temp);
  };  

  self.set_convient_mode = function(mode) {
    var modes = ['Off', 'Quiet', 'Sleep', 'Smart', 'SoftCool', 'TurboMode', 'WindMode1', 'WindMode2', 'WindMode3'];

    if (modex.indexOf(type) == -1) {
      throw "Invalid mode";
    }

    device_control('AC_FUN_COMODE', mode)
  };
  

  self.get_temperature = function() {
    device_control('AC_FUN_TEMPNOW', '');
  };

  self.sleep_mode = function(hours) {
    device_control('AC_FUN_SLEEP', hours);
  }
  /*



//   def wind_level(mode)
//     mode = type.capitalize
//     modes = ['Auto', 'Low', 'Mid', 'High', 'Turbo']
//     if modes.index(mode) == nil
//       throw "Invalid operation mode, " + mode + " is not one of " + modes.inspect
//     end    

//     device_control('AC_FUN_WINDLEVEL', hours)
//   end

//   def wind_level(mode)
//     mode = type.capitalize
//     modes = [
//       'Center', 
//       'Direct', 
//       'Fixed', 
//       'Indirect', 
//       'Left', 
//       'Long', 
//       'Off', 
//       'Right', 
//       'Rotation', 
//       'SwingLR', 
//       'SwingUD', 
//       'Wide'
//     ]

//     if modes.index(mode) == nil
//       throw "Invalid operation mode, " + mode + " is not one of " + modes.inspect
//     end    

//     device_control('AC_FUN_DIRECTION', mode)
//   end

//    def autoclean(mode)
//     mode = type.capitalize
//     modes = [
//       'On',
//       'Off'
//     ]

//     if modes.index(mode) == nil
//       throw "Invalid operation mode, " + mode + " is not one of " + modes.inspect
//     end    

//     device_control('AC_ADD_AUTOCLEAN', mode)
//   end
// end


  */
};

module.exports = SamsungAirconditioner;