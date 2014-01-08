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
     
      self.logger.debug('read', { line: line });

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
  var socket;

  var self = this;

  if (typeof token === 'function') {
    callback = token;
    token = null;
  }
  if (typeof callback !== 'function') throw new Error('callback is mandatory for login');

  if (!!token) {
    self._connect();
    setTimeout(function() { callback(null, null); }, 0);
    return self;
  }

  socket = tls.connect({port: 2878, host: self.options.ip, rejectUnauthorized: false }, function() {  
    var n = 0;

    self.logger.info('connected', { ipaddr: self.options.ip, port: 2878, tls: true });

    socket.setEncoding('utf8');
    carrier.carry(socket, function(line) {
      if (n++ < 2) {
        if (n < 2) return;

/* write the line that requests the token */

        return self.emit('waiting');
      }
      
      try { socket.close(); } catch(ex) {}

/* examine the line that contains the result */
      if (true /* error */) return callback(new Error('...'));

      self.token = '...';
      callback(null, self.token);
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
  var i, lmodes;

  var modes = ['Auto', 'Cool', 'Dry', 'Wind', 'Heat']
    , self  = this
    ;

  if (!lmodes) for (i = 0; i < modes.length; i++) lmodes.push(modes[i].toLowerCase());
  i = lmodes.indexOf(type.toLowerCase());
  if (i === -1) throw new Error("Invalid mode");

  return self._device_control('AC_FUN_OPMODE', modes[i]);
};

SamsungAirconditioner.prototype.set_temperature = function(temp) {
  return this._device_control('AC_FUN_TEMPSET', temp);
};  

SamsungAirconditioner.prototype.set_convenient_mode = function(mode) {
  var i, lmodes;

  var modes = ['Off', 'Quiet', 'Sleep', 'Smart', 'SoftCool', 'TurboMode', 'WindMode1', 'WindMode2', 'WindMode3']
    , self  = this
    ;

  if (!lmodes) for (i = 0; i < modes.length; i++) lmodes.push(modes[i].toLowerCase());
  i = lmodes.indexOf(mode.toLowerCase());
  if (i === -1) throw new Error("Invalid mode");

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

SamsungAirconditioner.prototype.sleep_mode = function(hours) {
  return this._device_control('AC_FUN_SLEEP', hours);
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
