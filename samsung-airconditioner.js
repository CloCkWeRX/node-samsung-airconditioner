var events  = require('events')
  , util    = require('util')
  , tls     = require('tls')
  , carrier = require('carrier')
  ;


var DEFAULT_LOGGER = { error   : function(msg, props) { console.log(msg); if (!!props) console.trace(props.exception); }
                     , warning : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
                     , notice  : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
                     , info    : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
                     , debug   : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
                     };


var SamsungAirconditioner = function(options) {
  var k;

  var self = this;

  if (!(self instanceof SamsungAirconditioner)) return new SamsungAirconditioner(options);

  self.options = options;

  self.logger = self.options.logger  || {};
  for (k in DEFAULT_LOGGER) {
    if ((DEFAULT_LOGGER.hasOwnProperty(k)) && (typeof self.logger[k] === 'undefined'))  self.logger[k] = DEFAULT_LOGGER[k];
  }

  self.props = { duid : options.duid };
};
util.inherits(SamsungAirconditioner, events.EventEmitter);



SamsungAirconditioner.prototype._connect = function() {
  var self = this;

  self.callbacks = {};

  self.socket = tls.connect({port: 2878, host: self.options.ip, rejectUnauthorized: false }, function() {  
    self.logger.info('connected', { ipaddr: self.options.ip, port: 2878, tls: true });

    self.socket.setEncoding('utf8');
    carrier.carry(self.socket, function(line) {
      var callback, id;

      if (line === 'DRC-1.00') {
        return;
      }

      if (line === '<?xml version="1.0" encoding="utf-8" ?><Update Type="InvalidateAccount"/>') {
        return self._send('<Request Type="AuthToken"><User Token="' + self.token + '" /></Request>');
      }

      if (line.match(/Response Type="AuthToken" Status="Okay"/)) {
         self.emit('loginSuccess');
      }

      self.logger.debug('read', { line: line });

      // Other events
      if (line.match(/Update Type="Status"/)) {
        if (matches = line.match(/Attr ID="(.*)" Value="(.*)"/)) {
          var state = {};
          state[matches[1]] = matches[2];

          self.emit('stateChange', state);
        }
      }

      if (line.match(/Response Type="DeviceState" Status="Okay"/)) {
          var state = {};

          // line = '<Device DUID="7825AD103D06" GroupID="AC" ModelID="AC" ><Attr ID="AC_FUN_ENABLE" Type="RW" Value="Enable"/><Attr ID="AC_FUN_POWER" Type="RW" Value="Off"/><Attr ID="AC_FUN_SUPPORTED" Type="R" Value="0"/><Attr ID="AC_FUN_OPMODE" Type="RW" Value="NotSupported"/><Attr ID="AC_FUN_TEMPSET" Type="RW" Value="24"/><Attr ID="AC_FUN_COMODE" Type="RW" Value="Off"/><Attr ID="AC_FUN_ERROR" Type="RW" Value="00000000"/><Attr ID="AC_FUN_TEMPNOW" Type="R" Value="29"/><Attr ID="AC_FUN_SLEEP" Type="RW" Value="0"/><Attr ID="AC_FUN_WINDLEVEL" Type="RW" Value="High"/><Attr ID="AC_FUN_DIRECTION" Type="RW" Value="Fixed"/><Attr ID="AC_ADD_AUTOCLEAN" Type="RW" Value="Off"/><Attr ID="AC_ADD_APMODE_END" Type="W" Value="0"/><Attr ID="AC_ADD_STARTWPS" Type="RW" Value="Direct"/><Attr ID="AC_ADD_SPI" Type="RW" Value="Off"/><Attr ID="AC_SG_WIFI" Type="W" Value="Connected"/><Attr ID="AC_SG_INTERNET" Type="W" Value="Connected"/><Attr ID="AC_ADD2_VERSION" Type="RW" Value="0"/><Attr ID="AC_SG_MACHIGH" Type="W" Value="0"/><Attr ID="AC_SG_MACMID" Type="W" Value="0"/><Attr ID="AC_SG_MACLOW" Type="W" Value="0"/><Attr ID="AC_SG_VENDER01" Type="W" Value="0"/><Attr ID="AC_SG_VENDER02" Type="W" Value="0"/><Attr ID="AC_SG_VENDER03" Type="W" Value="0"/></Device>'

          var attributes = line.split("><");
          attributes.forEach(function(attr) {
            if (matches = attr.match(/Attr ID="(.*)" Type=".*" Value="(.*)"/)) {
              state[matches[1]] = matches[2];
            }
          });

          self.emit('stateChange', state);
      }

/* extract CommandID into and then... */
      if (!self.callbacks[id]) return;
      callback = self.callbacks[id];
      delete(self.callbacks[id]);

/* you may want to pass a structure instead, cf., xml2json */
      callback(null, line);
    });
  }).on('end', function() {
    self.emit('end');
  }).on('error', function(err) {
    self.emit('error', err);
  });
};

SamsungAirconditioner.prototype._device_control = function(key, value, callback) {
  var id;

  var self = this;

  if (!self.socket) throw new Error('not logged in');

  id = Math.round(Math.random() * 10000);
  if (!!callback) self.callbacks[id] = callback;

  return self._send('<Request Type="DeviceControl"><Control CommandID="cmd' + id + '" DUID="' + self.options.duid
                    + '"><Attr ID="' + key + '" Value="' + value + '" /></Control></Request>');
};

SamsungAirconditioner.prototype._send = function(xml) {
  var self = this;

  self.logger.debug('write', { line: xml });
  self.socket.write(xml + "\r\n");

  return self;
};


// Public API

SamsungAirconditioner.prototype.login = function(token, callback) {
  var self = this;

  self.token = token;
  self._connect();

  setTimeout(function() { callback(null, null); }, 0);
  return self;
}

SamsungAirconditioner.prototype.get_token = function(callback) {
  var socket;

  var self = this;

  if (typeof callback !== 'function') throw new Error('callback is mandatory for get_token');



  socket = tls.connect({port: 2878, host: self.options.ip, rejectUnauthorized: false }, function() {  
    var n = 0;

    self.logger.info('connected', { ipaddr: self.options.ip, port: 2878, tls: true });

    socket.setEncoding('utf8');
    carrier.carry(socket, function(line) {
      self.logger.debug('read', line);
      if (line == 'DRC-1.00') {
        return;
      }

      if (line == '<?xml version="1.0" encoding="utf-8" ?><Update Type="InvalidateAccount"/>') {
        return socket.write('<Request Type="GetToken" />' + "\r\n");
      }

      if (line == '<?xml version="1.0" encoding="utf-8" ?><Response Type="GetToken" Status="Ready"/>') {
        return self.emit('waiting');
      }

      /* examine the line that contains the result */
      if (line == '<?xml version="1.0" encoding="utf-8" ?><Response Status="Fail" Type="Authenticate" ErrorCode="301" />') {
         return callback(new Error('Failed authentication'));
      }


      var matches = line.match(/Token="(.*)"/)
      if (matches) {
         self.emit('authenticated');
        self.token =  matches[1];
        return callback(null, self.token);
      }


      // Other events
      if (line.match(/Update Type="Status"/)) {
        if (matches = line.match(/Attr ID="(.*)" Value="(.*)"/)) {
          var state = {};
          state[matches[1]] = matches[2];

          self.emit('stateChange', state);
        }
      }

      if (line.match(/Response Type="DeviceState" Status="Okay"/)) {
          var state = {};

          // line = '<Device DUID="7825AD103D06" GroupID="AC" ModelID="AC" ><Attr ID="AC_FUN_ENABLE" Type="RW" Value="Enable"/><Attr ID="AC_FUN_POWER" Type="RW" Value="Off"/><Attr ID="AC_FUN_SUPPORTED" Type="R" Value="0"/><Attr ID="AC_FUN_OPMODE" Type="RW" Value="NotSupported"/><Attr ID="AC_FUN_TEMPSET" Type="RW" Value="24"/><Attr ID="AC_FUN_COMODE" Type="RW" Value="Off"/><Attr ID="AC_FUN_ERROR" Type="RW" Value="00000000"/><Attr ID="AC_FUN_TEMPNOW" Type="R" Value="29"/><Attr ID="AC_FUN_SLEEP" Type="RW" Value="0"/><Attr ID="AC_FUN_WINDLEVEL" Type="RW" Value="High"/><Attr ID="AC_FUN_DIRECTION" Type="RW" Value="Fixed"/><Attr ID="AC_ADD_AUTOCLEAN" Type="RW" Value="Off"/><Attr ID="AC_ADD_APMODE_END" Type="W" Value="0"/><Attr ID="AC_ADD_STARTWPS" Type="RW" Value="Direct"/><Attr ID="AC_ADD_SPI" Type="RW" Value="Off"/><Attr ID="AC_SG_WIFI" Type="W" Value="Connected"/><Attr ID="AC_SG_INTERNET" Type="W" Value="Connected"/><Attr ID="AC_ADD2_VERSION" Type="RW" Value="0"/><Attr ID="AC_SG_MACHIGH" Type="W" Value="0"/><Attr ID="AC_SG_MACMID" Type="W" Value="0"/><Attr ID="AC_SG_MACLOW" Type="W" Value="0"/><Attr ID="AC_SG_VENDER01" Type="W" Value="0"/><Attr ID="AC_SG_VENDER02" Type="W" Value="0"/><Attr ID="AC_SG_VENDER03" Type="W" Value="0"/></Device>'

          var attributes = line.split("><");
          attributes.forEach(function(attr) {
            if (matches = attr.match(/Attr ID="(.*)" Type=".*" Value="(.*)"/)) {
              state[matches[1]] = matches[2];
            }
          });

          self.emit('stateChange', state);
      }


    });
  }).on('end', function() {
    if (!self.token) callback(new Error('premature eof'));
  }).on('error', function(err) {
    if (!self.token) callback(err);
  });

  return self;
};

// can't use ".on" (it's used by emitters)
SamsungAirconditioner.prototype.onoff = function(onoff) {
  return this._device_control('AC_FUN_POWER', onoff ? 'On' : 'Off');
};

SamsungAirconditioner.prototype.off = function() {
  return this._device_control('AC_FUN_POWER', 'Off');
};

SamsungAirconditioner.prototype.mode = function(type) {
  var i, lmodes = [];

  var modes = ['Auto', 'Cool', 'Dry', 'Wind', 'Heat']
    , self  = this
    ;

  for (i = 0; i < modes.length; i++) lmodes[i] = modes[i].toLowerCase();
  i = lmodes.indexOf(type.toLowerCase());
  if (i === -1) throw new Error("Invalid mode: " + type);

  return self._device_control('AC_FUN_OPMODE', modes[i]);
};

SamsungAirconditioner.prototype.set_temperature = function(temp) {
  return this._device_control('AC_FUN_TEMPSET', temp);
};  

SamsungAirconditioner.prototype.set_convenient_mode = function(mode) {
  var i, lmodes = [];

  var modes = ['Off', 'Quiet', 'Sleep', 'Smart', 'SoftCool', 'TurboMode', 'WindMode1', 'WindMode2', 'WindMode3']
    , self  = this
    ;

  for (i = 0; i < modes.length; i++) lmodes[i] = modes[i].toLowerCase();
  i = lmodes.indexOf(mode.toLowerCase());
  if (i === -1) throw new Error("Invalid mode: " + mode);

  return self._device_control('AC_FUN_COMODE', mode);
};
  

SamsungAirconditioner.prototype.get_temperature = function(callback) {
  return this._device_control('AC_FUN_TEMPNOW', '', function(err, line) {
    var celcius;

    if (!!err) callback(err);

/* parse line and invoke */
     callback(null, celcius);
  });
};

SamsungAirconditioner.prototype.sleep_mode = function(minutes) {
  return this._device_control('AC_FUN_SLEEP', minutes);
};

SamsungAirconditioner.prototype.status = function() {
  var self = this;
  return self._send('<Request Type="DeviceState" DUID="' + self.options.duid+ '"></Request>');
};


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

module.exports = SamsungAirconditioner;
