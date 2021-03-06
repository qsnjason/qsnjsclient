/*jshint globalstrict: true*/
/*jshint browser: true*/
/**@preserve
QSN Javascript Websocket client for Node.js and HTML5 Browsers

Copyright (c) 2013 Quantitative Signals Network (https://www.quantsig.net).

Distributed under the terms of the MIT License (http://opensource.org/licenses/MIT).

*/
"use strict";
function QSNClient(conf) {
 var c = this;
 c.name = 'qsn client';
 c.conf = conf || {};
 c.conf.gateway = c.conf.gateway || 'eu.quantsig.net';
 c.conf.cachehours = c.conf.cachehours || 750;
 c.conf.cacheminutes = c.conf.cacheminutes || 1440;
 c.conf.cacheseconds = c.conf.cacheseconds || 600;
 c.state = {
  account: {},
  conf: {},
  instrs: {},
  data: {},
  bbs: [],
  onload: {},
  onboot: null,
  ondown: null,
  onopen: null,
  onquote: {},
  onunsub: {},
  on: {},
  recondelay: 5,
  status: {
   connecting: false,
   booted: false,
   conn: false,
   auth: false,
   upstream: false,
   subscriber: false,
   sysnotice: null,
   pingattempt: 0,
   connects: 0,
   input: 0,
   output: 0,
   quotes: 0,
   resumes: 0,
   pingreply: 0,
   load: 0
  }
 };

 if ( c.conf.minode ) {
  c.crypto = require('crypto');
  require(c.conf.minode).websocket;
 }

 this.getConf = function() {
  return(c.state.conf);
 };

 this.getState = function() {
  return(c.state.status);
 };

 this.getStatus = function() {
  return(c.state.status);
 };

 this.getAccount = function() {
  return(c.state.account);
 };

 this.getModels = function() {
  return(c.state.instrs);
 };

 this.getData = function() {
  return(c.state.data);
 };

 this.getBBS = function() {
  return(c.state.bbs);
 };

 if ( c.conf.on ) {
  c.state.on = c.conf.on;
 }

 this.on = function(ev,cb) {
  c.state.on[ev] = cb;
 };

 this.sendMessage = function(msg) {
  if ( msg ) {
   if ( c.state.socket && c.state.status.conn === true ) {
    try {
     c.state.socket.send(JSON.stringify(msg));
    } catch(er) {
     c.logerr(['sendMessage: error, cannot send message',JSON.stringify(er)]);
     c.socketClose();
    }
    c.state.status.output++;
   } else {
    c.logerr('sendMessage: error, not connected');
   }
  } else {
   c.logerr('sendMessage: error, null message');
  }
 };

 this.receiveUpstream = function(msg) {
  if ( msg ) {
   c.state.status.upstream = msg.body;
   if ( c.state.on.upstream ) {
    c.state.on.upstream(msg.body);
   }
  }
 };

 this.connect_persist = function(cb) {
  if ( ! cb ) {
   c.logerr(['connect_persist: callback required']);
   return;
  } else {
   c.state.onboot = function(m) {
    delete(c.state.onboot);
    cb(m);
   };
  }
  c.state.status.persistent = true;
  c.state.ondown = function(err) {
   c.state.socket = null;
   setTimeout(function() {
    if ( c.state.recondelay < 60 ) {
     c.state.recondelay = 5 + c.state.recondelay;
    }
    c.connect(function() {
      c.startConn();
    });
   }, c.state.recondelay * 1000);
  };
  c.connect(function() {
   c.startConn();
  });
 };

 this.startConn = function() {
  if ( (c.conf.username && c.conf.password) || (c.conf.apikey && c.conf.apisecret) ) {
   c.login();
  } else {
   if ( c.state.onopen ) {
    c.state.onopen();
   } 
  }
  c.state.pinginterval = setInterval(function() {
   c.sendPing();
  }, 10000);
 };

 this.connect = function(cb) {
  var socket;
  if ( c.state.status.connecting === true ) {
   c.logerr(['connect: already connecting']);
   return;
  } else if ( c.state.status.conn === true ) {
   c.logerr(['connect: already connected']);
   return;
  }
  if ( c.conf.debug ) {
   c.logger(['connect: opening ', c.conf.gateway]);
  }
  c.state.status.connecting = true;
  if ( c.conf.gateway.match(/wss/) ) {
   c.state.socket = new WebSocket(c.conf.gateway + '/quote');
  } else {
   c.state.socket = new WebSocket('wss://' + c.conf.gateway + '/quote');
  }
  c.state.socket.onmessage = c.messageSwitch;
  c.state.socket.onopen = function(event) {
   c.logger('connect: connected');
   c.state.status.conn = true;
   c.state.status.connecting = false;
   if ( cb ) {
    cb();
   }
   if ( c.state.on.open ) {
    c.state.on.open();
   }
  };
  c.state.socket.onclose = function() {
   if ( c.state.socket.cleanup ) {
    c.logger('connect: socket closed');
    c.state.socket.cleanup('close');
    if ( c.state.on.close ) {
     c.state.on.close();
    }
   }
  };
  c.state.socket.onerror = function(err) {
   if ( c.state.socket.cleanup ) {
    c.logger('connect: socket error');
    c.state.socket.cleanup('error');
    if ( c.state.on.error ) {
     c.state.on.error(err);
    }
   }
  };
  c.state.status.connects++;

  c.state.socket.cleanup = function(src) {
   c.state.status.conn = false;
   c.state.status.auth = false;
   c.state.status.upstream = false;
   c.state.status.connecting = false;
   clearInterval(c.state.pinginterval);
   if ( c.state.status.conntimeout ) {
    clearTimeout(c.state.status.conntimeout);
    delete(c.state.status.conntimeout);
   }
   delete(c.state.pinginterval);
   delete(c.state.socket);
   if ( c.state.on.down ) {
    c.state.on.down(src);
   }
   if ( c.state.ondown ) {
    c.state.ondown(src);
   }
   if ( c.state.socket && c.state.socket.cleanup ) {
    delete(c.state.socket.cleanup);
   }
  };

  c.state.status.conntimeout = setTimeout(function() {
   if ( c.state.status.connecting === true ) {
    c.state.socket.cleanup('timeout');
   } else {
    delete(c.state.status.conntimeout);
   }
  }, 30000);
 };

 this.socketClose = function() {
  c.state.status.conn = false;
  if ( c.state.socket ) {
   try {
    c.state.socket.close();
   } catch(er) {
    c.logger('socket close error');
   }
  }
 };

 this.receiveError = function(message) {
  c.logerr(['receiveError: QSN error message', message.error]);
  if ( c.state.on.error ) {
   c.state.on.error(message.error);
  }
 };

 this.receiveAccount = function(message) {
  c.state.account = message.body;
  if ( c.state.on.account ) {
   c.state.on.account(message.body);
  }
 };

 this.receiveSubscribe = function(m) {
  if ( m.body.result.ok === false ) {
   if ( c.state.onload[m.body.type + m.body.name]) {
    c.state.onload[m.body.type + m.body.name](m.body);
   }
  }
 };

 this.receiveResume = function(m) {
  if ( c.state.on.resume ) {
   c.state.on.resume(m.body);
  }
 };

 this.subscribe = function(want) {
  var type, name, lcb, qcb, key, instr;
  if ( ! want.type ) {
   c.logerr('subscribe: instrument type required');
   return;
  } else if ( ! want.name ) {
   c.logerr('subscribe: instrument name required');
   return;
  }
  type = want.type;
  name = want.name;
  lcb = want.onload;
  qcb = want.onquote;
  key = type + name;
  if ( c.state.instrs[type][name] ) {
   if ( lcb ) {
    c.state.onload[key] = lcb;
   }
   if ( qcb ) {
    c.state.onquote[key] = qcb;
   }
   instr = c.state.instrs[type][name];
   if ( c.conf.debug ) {
    c.logger(['subscribe:', instr.type, instr.name]);
   }
   c.sendMessage({ type: 'sub', body: { type: instr.type, name: instr.name } });
  } else {
   c.logerr(['subscribe: cannot subscribe', type, name]);
  }
 };

 this.unsubscribe = function(instr,cb) {
  if ( ! instr ) {
   c.logerr('unsubscribe: no instrument to unsubscribe from');
   return;
  }
  var type = instr.type;
  var name = instr.name;
  var key = type + name;
  if ( c.state.data[type][name] ) {
   if ( c.conf.debug ) {
    c.logger(['unsubscribe:', type, name]);
   }
   c.sendMessage({ type: 'unsub', body: { type: type, name: name } });
   if ( cb ) {
    c.state.onunsub[key] = cb;
   }
   if ( c.state.onquote[key] ) {
    delete(c.state.onquote[key]);
   }
   if ( instr.secintid ) {
    clearInterval(instr.secintid);
    delete(instr.secintid);
   }
  } else {
   c.logerr(['unsubscribe: not subscribed', name]);
  }
 };

 this.receiveUnSubscribe = function(msg) {
  var m = msg.body;
  var key = m.type + m.name;
  if ( m.result.ok === true ) {
   c.logger(['unsubscribed from', m.type, m.name]);
   delete(c.state.data[m.type][m.name]);
   if ( c.state.onunsub[key] ) {
    c.state.onunsub[key](m);
    delete(c.state.onunsub[key]);
   }
  }
 };

 this.resume = function(type,name) {
  var instr;
  if ( c.state.instrs[type][name] ) {
   instr = c.state.instrs[type][name];
   if ( c.conf.debug ) {
    c.logger(['resume:', instr.type,  instr.name]);
   }
   c.sendMessage({
    type: 'res',
    body: { type: instr.type, name: instr.name, last: instr.laste }
   });
  } else {
   c.logerr(['resume: not subscribed', type, name]);
  }
 };

 this.receiveInstr = function (message) {
  var instr = message.body;
  var key = instr.type + instr.name;
  c.state.status.subscriber = true;
  if ( instr.hours.dateminute && instr.hours.dateminute.length > 0 ) {
   c.parseInstr(instr);
  }
  if ( instr.refresh && ! c.conf.noseconds ) {
   instr.secintid = setInterval(function() {
    c.updateInstrSec(instr);
   }, 1000);
  }
  c.state.data[instr.type][instr.name] = instr;
  c.state.status.load++;
  if ( c.conf.debug ) {
   c.logger(['receiveInstr:',instr.type,instr.name]);
  }
  if ( c.state.onload[key] ) {
   c.state.onload[key](instr);
   delete(c.state.onload[key]);
  } else if ( c.state.on.load ) {
   c.state.on.load(instr);
  }
 };

 this.receiveSysNotice = function(m) {
  if ( m && m.body ) {
   c.state.status.sysnotice = m.body;
   if ( c.state.on.sysnotice ) {
    c.state.on.sysnotice(c.state.status.sysnotice);
   } else if ( c.conf.debug ) {
    c.logger(['receiveSysNotice:',c.state.status.sysnotice]);
   }
  }
 };

 this.receiveBoot = function(message) {
  var m = message.body;
  c.state.recondelay = 10;
  if ( m.bbs ) {
   c.state.bbs = m.bbs;
  }
  c.state.instrs = m.instrs;
  if ( m.privinstrs ) {
   c.state.privinstrs = m.privinstrs;
  }
  c.state.countries = m.countries;
  Object.keys(c.state.instrs).forEach(function(type) {
   if ( ! c.state.data[type] ) {
    c.state.data[type] = {};
   }
  });
  c.state.conf = m.conf;
  c.state.service = m.service;
  c.state.status.upstream = m.upstream;
  c.state.btcprice = m.btcprice;
  c.state.serviceprice = m.serviceprice;
  if ( m.sysnotice ) {
   c.receiveSysNotice({ body: m.sysnotice });
  }
  if ( c.state.status.booted === true ) {
   Object.keys(c.state.data).forEach(function(type) {
    Object.keys(c.state.data[type]).forEach(function(name) {
     c.resume(type,name);
     c.state.status.resume++;
    });
   });
  } else {
   if ( c.state.onboot ) {
    c.state.onboot(m);
   }
  }
  if ( c.state.on.boot ) {
   c.state.on.boot(m);
  }
  c.state.status.booted = true;
 };

 // Instrument maintenance methods
 this.updateInstrSec = function(instr) {
  var s = instr.seconds;
  var df = c.state.conf.datafields[instr.type];
  var m = instr.minutes;
  var d = new Date();
  var e = d.getTime();
  var hh = d.getUTCHours();
  var mm = d.getUTCMinutes();
  var ss = d.getUTCSeconds();
  var ct = (hh * 3600) + (mm * 60) + ss;
  var midx = instr.minutes.dateminute.length - 1;
  var fo, i;
  s.epoch.push(e);
  s.time.push(ct);
  for ( i=0; i < df.length; i++ ) {
   fo = df[i];
   if ( fo.name !== 'epoch' && fo.name !== 'time' ) {
    s[fo.name].push(m[fo.name][midx]);
   }
  }
  if(s.time.length > c.conf.cacheseconds) {
   for ( i=0; i < df.length; i++ ) {
    fo = df[i];
    s[fo.name].shift();
   }
  }
 };

 this.receiveQuote = function(message) {
  var body = message.body;
  var data = body.data;
  var min = data.min;
  var instr = c.state.data[body.type][body.name];
  if ( ! instr ) {
   return;
  }
  c.state.status.quotes++;
  if ( instr.quotes ) {
   instr.quotes++;
  } else {
   instr.quotes = 1;
  }
  var df = c.state.conf.datafields[instr.type];
  var dfl = df.length;
  var key = body.type + body.name;
  var fo, fld, i, q = { type: body.type, name: body.name };
  for ( i=0; i<dfl; i++ ) {
   fo = df[i];
   if ( fo.type === 'int' ) {
    min[i] = parseInt(min[i], 10);
   } else if ( fo.type === 'float' ) {
    min[i] = parseFloat(min[i]);
   }
   q[fo.name] = min[i];
  }
  c.updateInstrData(instr,data);
  if ( c.state.onquote[key] ) {
   c.state.onquote[key](instr,q);
  } else if ( c.state.on.quote ) {
   c.state.on.quote(instr,q);
  }
  return(true);
 };
 this.parseInstr = function(instr) {
  var loc = [ 'hours', 'minutes', 'seconds' ];
  var ta = c.state.conf.datafields[instr.type];
  var i, data, arr, size, pf;
  loc.forEach(function(l) {
   data = instr[l];
   size = data.dateminute.length;
   ta.forEach(function(t) {
    if ( data[t.name] ) {
     arr = data[t.name];
     if ( t.type === 'int' ) {
      pf = function(v) {
       return(parseInt(v, 10));
      };
     } else if ( t.type === 'float' ) {
      pf = function(v) {
       return(parseFloat(v));
      };
     } else {
      pf = function(v) {
       return(v);
      };
     }
     for ( i=0; i<size; i++ ) {
      arr[i] = pf(arr[i]);
     }
    }
   });
  });
 };
 this.updateInstrData = function(instr,data) {
  var minutes = instr.minutes;
  var hours = instr.hours;
  var min = data.min;
  var df = c.state.conf.datafields[instr.type];
  var dfl = df.length;
  var hfl = c.matchValueAH(df, 'datehour');
  var cfl = c.matchValueAH(df, 'dateminute');
  var mx = c.matchValue(minutes.dateminute,min[cfl]);
  var d = new Date();
  var fo, fld, i, mlen, hlen, hx;
  instr.laste = d.getTime();
  if ( mx ) {
   for ( i=0; i<dfl; i++ ) {
    fo = df[i];
    minutes[fo.name][mx] = min[i];
   }
  } else {
   for ( i=0; i<dfl; i++ ) {
    fo = df[i];
    minutes[fo.name].push(min[i]);
   }
  }
  mlen = minutes.dateminute.length;
  if ( mlen > c.conf.cacheminutes ) {
   for ( i=0; i<dfl; i++ ) {
    fo = df[i];
    minutes[fo.name].shift();
   }
  }
  if ( instr.type === 'net' ) {
   mx = minutes.dateminute.length - 1;
   instr.aclose = minutes.actual[mx];
   instr.oclose = minutes.output[mx];
   instr.dclose = minutes.diverg[mx];
  }
  hlen = hours.datehour.length - 1;
  mlen = minutes.dateminute.length - 1;
  hx = c.matchValue(hours.datehour,minutes.datehour[mlen]);
  if ( hx ) {
   for ( i=0; i<dfl; i++ ) {
    fo = df[i];
    hours[fo.name][hx] = minutes[fo.name][mlen];
   }
  } else {
   for ( i=0; i<dfl; i++ ) {
    fo = df[i];
    hours[fo.name].push(minutes[fo.name][mlen]);
   }
  }
  if ( hlen > c.conf.cachehours ) {
   for ( i=0; i<dfl; i++ ) {
    fo = df[i];
    hours[fo.name].shift();
   }
  }
  return(true);
 };
 this.receiveMinfo = function(message) {
  var m = message.body;
  var type = m.type;
  var name = m.name;
  var minfo = m.data;
  var instr;
  if ( c.state.instrs[type][name] ) {
   instr = c.state.instrs[type][name];
   Object.keys(minfo).forEach(function(fld) {
    c.state.instrs[type][name][fld] = minfo[fld];
   });
  }
  if ( c.state.data[type][name] ) {
   instr = c.state.data[type][name];
   Object.keys(minfo).forEach(function(fld) {
    instr[fld] = minfo[fld];
   });
  }
  if ( c.state.on.minfo ) {
   c.state.on.minfo(m);
  } else if ( c.conf.debug ) {
   c.logger(['receiveMinfo:',type,name]);
  }
 };

 // BBS Messaging
 this.sendBBS = function(m) {
  if ( c.state.status.auth !== true ) {
   c.logerr('sendBBS: must be logged in');
   return false;
  }
  if (m===null || m==="") {
   c.logerr('sendBBS: no message submitted');
   return;
  }
  var msg = {
   type: 'bbs',
   body: {
    message: m
   }
  };
  c.sendMessage(msg);
 };
 this.receiveBBS = function(message) {
  c.state.bbs.push(message.body);
  if ( c.state.bbs.length > 300 ) {
   c.state.bbs.shift();
  }
  if ( c.state.on.bbs ) {
   c.state.on.bbs(message.body,c.state.bbs);
  }
 };

 // Platform BTC price. Used for subscription pricing.
 this.receiveBTCPrice = function(message) {
  c.state.btcprice = message.body;
  if ( c.state.on.btcprice ) {
   c.state.on.btcprice(message.body);
  }
 };

 // Log messages are sent from some services.
 this.receiveLog = function(message) {
  if ( c.state.on.logmessage ) {
   c.state.on.logmessage(message.body);
  }
 };

 // RTT/Pong tracking
 this.receivePong = function(message) {
  var t = new Date().getTime();
  c.state.status.rtt = t - message.body.time;
  c.state.status.pingattempt = 0;
  c.state.status.pingreply = t;
  if ( c.state.on.rtt ) {
   c.state.on.rtt(c.state.status.rtt);
  }
 };

 // Change Replies 
 this.receiveChangeReply = function(message) {
  var m = message.body;
  if ( m.ok === true ) {
   c.logger("receiveChangeReply: change " + m.type + " accepted");
  } else {
   c.logerr("receiveChangeReply: change " + m.type + " not permitted, reason: " + m.reason);
  }
  if ( c.state.on.changereply ) {
   c.state.on.changereply(m);
  }
 };

 // Inbound Message Switch
 this.messageSwitch = function(msg) {
  var message = c.parseJSON(msg.data);
  c.state.status.input++;
  if ( message ) {
   switch(message.type) {
    case "quote":
     c.receiveQuote(message);
     return;
    break;
    case "pong":
     c.receivePong(message);
     return;
    break;
    case "boot":
     c.receiveBoot(message);
     return;
    break;
    case "load":
     c.receiveInstr(message);
     return;
    break;
    case "bbs":
     c.receiveBBS(message);
     return;
    break;
    case "minfo":
     c.receiveMinfo(message);
     return;
    break;
    case "res":
     c.receiveResume(message);
     return;
    break;
    case "changereply":
     c.receiveChangeReply(message);
     return;
    break;
    case "login":
     c.receiveLogin(message);
     return;
    break;
    case "account":
     c.receiveAccount(message);
     return;
    break;
    case "apikey":
     c.receiveApiKey(message);
     return;
    break;
    case "error":
     c.receiveError(message);
     return;
    break;
    case "sub":
     c.receiveSubscribe(message);
     return;
    break;
    case "unsub":
     c.receiveUnSubscribe(message);
     return;
    break;
    case "sysnotice":
     c.receiveSysNotice(message);
     return;
    break;
    case "upstream":
     c.receiveUpstream(message);
     return;
    break;
    case "btcprice":
     c.receiveBTCPrice(message);
     return;
    break;
    case "log":
     c.receiveLog(message);
     return;
    break;
    default:
     if ( c.state.on.umessage ) {
      c.state.on.umessage(message);
     }
     return;
    break;
   }
  }
 };

 // Login methods
 this.login = function(cb) {
  if ( conf.username && conf.password ) {
   c.submitLogin(conf.username,conf.password);
  } else if ( conf.apikey && conf.apisecret ) {
   c.submitApiLogin(conf.apikey,conf.apisecret);
  } else {
   c.logerr('login: invalid credentials, not authenticating');
  }
 };
 this.submitApiLogin = function(key,secret) {
  var d = new Date();
  var ts = d.getTime();
  var tmp = c.hasher256(secret);
  var hash = c.hasher256(tmp + ts.toString());
  var msg = {
   type: 'login',
   body: {
    key: key,
    ts: ts,
    hash: hash
   }
  };
  c.sendMessage(msg);
 };
 this.submitLogin = function(user,pass) {
  var tok = c.createToken(user,pass);
  c.requestLogin(tok);
  return(tok);
 };
 this.requestLogin = function(tok) {
  var msg = {
   type: 'login',
   body: tok
  };
  c.sendMessage(msg);
 };
 this.receiveLogin = function(msg) {
  switch(msg.ok) {
   case true:
    c.logger('receiveLogin: login successful');
    c.state.status.auth = true;
   break;
   case false:
    c.logerr('receiveLogin: login failed');
    c.state.status.auth = false;
   break;
  }
  if ( c.state.on.login ) {
   c.state.on.login(c.state.status.auth);
  }
  return;
 };
 this.getApiKey = function(name,cb) {
  if ( name && cb ) {
   if ( ! c.state.on.apikey ) {
    c.state.on.apikey = cb;
    c.logger('getApiKey: requesting API Key');
    c.sendMessage({
     type: 'getapikey',
     body: {
      label: name
     }
    });
   } else {
    c.logerr('getApiKey: only one outstanding getApiKey request permitted, call clearApiKeyRequest() to reset');
   }
  } else {
   c.logerr('getApiKey: key name and callback required');
  }
 };
 this.clearApiKeyRequest = function() {
  delete(c.state.on.apikey);
 };
 this.receiveApiKey = function(message) {
  c.logger(['receiveApiKey: received API Key ID', message.body.key]);
  if ( c.state.on.apikey ) {
   c.state.on.apikey(message.body);
  }
  delete(c.state.on.apikey);
 };

 //
 // Utility functions
 //

 // Token creation
 this.createToken = function(user,pass) {
  var d = new Date();
  var ts = d.getTime();
  var token = {
   user: user,
   ts: ts
  };
  var tmp = c.hasher256(pass);
  token.hash = c.hasher256(tmp + ts.toString());
  return(token);
 };
 // RTT/Conn detection
 this.sendPing = function() {
  if ( c.state.status.conn === false ) {
   return;
  }
  var t = new Date().getTime();
  var msg = {
   type: "ping",
   time: t
  };
  c.state.status.pingattempt++;
  if ( c.state.status.pingattempt === 10 ) {
   c.logger("sendPing: last reply " + c.epochToDateTimeStr(c.state.status.pingreply) + ' UTC');
   c.state.status.pingattempt = 0;
   c.socketClose();
  } else {
   c.sendMessage(msg);
  }
 };

 // Parse inbound JSON safely
 this.parseJSON = function(str) {
  var m;
  try {
   m = JSON.parse(str);
   return(m);
  } catch (er) {
   c.logerr(['parseJSON: failed to parse', str]);
   if ( c.state.socket ) {
    c.state.socket.close();
   }
  }
 };

 // Hasher required for login
 if ( c.conf.minode ) {
  this.hasher256 = function(string) {
   var hasher = c.crypto.createHash('sha256');
   var hash = hasher.update(string, 'utf8');
   return(hash.digest('hex'));
  };
 } else {
  this.hasher256 = function(string) {
   var sha = new jsSHA(string, 'TEXT');
   return(sha.getHash('SHA-256','HEX'));
  };
 }

 // Time formatter
 this.epochToDateTimeStr = function(e) {
  var dt, ct = new Date();
  ct.setTime(e);
  dt = {
   year: ct.getUTCFullYear(),
   month: ct.getUTCMonth(),
   day: ct.getUTCDate(),
   hour: ct.getUTCHours(),
   minute: ct.getUTCMinutes(),
   second: ct.getSeconds()
  };
  dt.month++;

  if(dt.month <10) {
   dt.month = "0" + dt.month;
  }
  if(dt.day <10) {
   dt.day = "0" + dt.day;
  }
  if(dt.hour <10) {
   dt.hour = "0" + dt.hour;
  }
  if(dt.minute <10) {
   dt.minute = "0" + dt.minute;
  }
  if(dt.second <10) {
   dt.second = "0" + dt.second;
  }
  var dts = dt.year + '-' + dt.month + '-' + dt.day + ' ' + dt.hour + ':' + dt.minute + ':' + dt.second;
  return(dts);
 };

 // Logging subsys
 this.makeLog = function(msg,err) {
  var log = {};
  var cons;
  log.ts = new Date().getTime();
  log.source = c.name;
  if ( Object.prototype.toString.call(msg) === '[object Array]' ) {
   log.message = msg.join(' ');
  } else {
   log.message = msg;
  }
  if ( err ) {
   log.error = true;
  } else {
   log.error = false;
  }
  if ( c.state.on.log ) {
   c.state.on.log(log);
  } else {
   console.log(c.epochToDateTimeStr(log.ts) + ' UTC ' + log.source + ' ' + log.message);
  }
 };
 this.logerr = function(log) {
  c.makeLog(log,true);
 };
 this.logger = function(log) {
  c.makeLog(log);
 };

 // Matching functions for data lookup
 this.matchValue = function(a, val) {
  var found;
  a.some(function(el, index) {
   if ( val === el ) {
    found = index;
    return true;
   }
  });
  return found;
 };
 this.matchValueAH = function(a, val) {
  var found;
  a.some(function(el, index) {
   if ( val === el.name ) {
    found = index;
    return true;
   }
  });
  return found;
 };
 return(c);
}
if ( typeof exports == 'undefined' ) {
 var exports = {};
}
exports.QSNClient = QSNClient;
