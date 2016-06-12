/*jslint node: true */
"use strict";
var Emitter        = require('events').EventEmitter,
    os             = require('os'),
    util           = require('util'),
    SSDP           = require('node-ssdp'),
    netmask        = require('netmask'),
    Device         = require('./samsung-airconditioner');


var DEFAULT_LOGGER = {
  error   : function(msg, props) { console.log(msg); if (!!props) console.trace(props.exception); },
  warning : function(msg, props) { console.log(msg); if (!!props) console.log(props);             },
  notice  : function(msg, props) { console.log(msg); if (!!props) console.log(props);             },
  info    : function(msg, props) { console.log(msg); if (!!props) console.log(props);             },
  debug   : function(msg, props) { console.log(msg); if (!!props) console.log(props);             }
};


var SamsungDiscovery = function(options) {
  var ifa, ifaces, ifaddrs, ifname, k;

  var self = this;

  if (!(self instanceof SamsungDiscovery)) return new SamsungDiscovery(options);

  self.options = options || {};

  self.logger = self.options.logger || {};
  for (k in DEFAULT_LOGGER) {
    if ((DEFAULT_LOGGER.hasOwnProperty(k)) && (typeof self.logger[k] === 'undefined'))  self.logger[k] = DEFAULT_LOGGER[k];
  }

  self.devices = {};

  ifaces = os.networkInterfaces();
  for (ifname in ifaces) {
    if ((!ifaces.hasOwnProperty(ifname)) ||
        (ifname.indexOf('vmnet') === 0)  ||
        (ifname.indexOf('vboxnet') === 0)  ||
        (ifname.indexOf('vnic') === 0)   ||
        (ifname.indexOf('tun') !== -1)) {
      continue;
    }

    ifaddrs = ifaces[ifname];
    if (ifaddrs.length === 0) continue;

    for (ifa = 0; ifa < ifaddrs.length; ifa++) {
      if ((ifaddrs[ifa].internal) || (ifaddrs[ifa].family !== 'IPv4')) continue;

      self.logger.debug('listening', {
        network_interface: ifname,
        ipaddr: ifaddrs[ifa].address,
        portno: 1900
      });

      self.ifname = ifname;
      self.ipaddr = ifaddrs[ifa].address;
      self.portno = 1900;
      self.listen();
    }
  }
};
util.inherits(SamsungDiscovery, Emitter);

SamsungDiscovery.prototype.listen = function() {
  var self = this;

  if (self.ssdp) {
    self.logger.error('discovery', {
      event: 'listen',
      diagnostic: 'error',
      exception: 'already listening'
    });
    //self.emit('error', 'already listening');
    return;
  }

  var notify = function() {
    ssdp.notify(self.ifname, self.ipaddr, self.portno, 'AIR CONDITIONER',
                { SPEC_VER: 'MSpec-1.00', SERVICE_NAME: 'ControlServer-MLib', MESSAGE_TYPE: 'CONTROLLER_START' });
  };

  var ssdp = self.ssdp = new SSDP({
    addMembership     : false,
    responsesOnly     : true,
    multicastLoopback : false,
    noAdvertisements  : true
  }).on('response', function(msg, rinfo) {
    var i, info, j, lines, mac;

    lines = msg.toString().split("\r\n");
    info = {};
    for (i = 1; i < lines.length; i++) {
      j = lines[i].indexOf(':');
      if (j <= 0) break;
      info[lines[i].substring(0, j)] = lines[i].substring(j + 1).trim();
    }

    mac = info.MAC_ADDR;
    self.devices[mac] = new Device({
      logger : self.logger,
      ip     : rinfo.address,
      duid   : mac,
      info   : info
    });

    self.emit('discover', self.devices[mac]);
  });
  ssdp.logger = self.logger;

  ssdp.server('0.0.0.0');
  ssdp.sock.on('listening', function() {
    self.timer = setInterval(notify, 30 * 1000);
    notify();
  });
};

SamsungDiscovery.prototype.close = function() {
  var self = this;

  if (self.ssdp) {
    self.ssdp.close();
    clearTimeout(self.timer);
    delete self.timer;
    delete self.ssdp;
  }
}

SSDP.prototype.notify = function(ifname, ipaddr, portno, signature, vars) {/* jshint unused: false */
  var out;

  var self = this;

  if (!self.listening) return;

  Object.keys(self.usns).forEach(function (usn) {
    var bcast, mask, quad0;

    var udn   = self.usns[usn],
        heads ={
          HOST            : '239.255.255.250:1900',
          'CACHE-CONTROL' : 'max-age=20',
          SERVER          : signature
        };

    out = self.getSSDPHeader('NOTIFY', heads);
    Object.keys(vars).forEach(function (n) { out += n + ': ' + vars[n] + '\r\n'; });

    quad0 = parseInt(ipaddr.split('.')[0], 10);
    mask = ((quad0 & 0x80) === 0) ? 8 : ((quad0 & 0xc0) === 0xf0) ? 16 : 24;

// TBD: use the (obsolete) class A/B/C netmasks
    bcast = new netmask.Netmask(ipaddr + '/' + mask).broadcast;
    self.logger.debug('multicasting', {
      network_interface: ifname,
      ipaddr: bcast,
      portno: 1900
    });

    out = new Buffer(out);
    self.sock.setBroadcast(true);
    self.sock.send(out, 0, out.length, 1900, bcast);
  });
};


module.exports = SamsungDiscovery;
