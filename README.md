qsnjsclient
===

Javascript QSN API client by Quantitative Signals Network. https://www.quantsig.net

This client implements the QSN websocket messaging API. Access to model data, BBS messaging, and platform notifications are provided. The client exposes an event model with internal caching, providing realtime access to the QSN platform within HTML5 browsers.

This client requires the jsSHA library. https://github.com/Caligatio/jsSHA.git

Client Configuration
---

The default QSN gateway is Europe (eu.quantsig.net). Also available are 'am.quantsig.net' (Americas) and 'as.quantsig.net' (Asia).

	var config = {
		gateway = 'eu.quantsig.net'
	};

Access to the QSN private network is restricted. A valid account is required to login to QSN. A requesting client can select access method by providing either `username` and `password` or `apikey` and `apisecret`.

	config.username = 'username';
	config.password = 'password';

API Key is the preferred login method. It provides access without the need for username and password caching. An automated mechanism for request and receipt of API Keys is provided by the client. The client does not provide for storage of the API Key. The application utilizing the QSN Client should make a reasonable attempt to secure the API Key.

	config.apikey = 'apikey';
	config.apisecret = 'apisecret';

Model data is maintained by the client. Default values for caching are the QSN settings shown below. Note that larger values may not be provided by QSN.

	config.cacheseconds = 600;
	config.cacheminutes = 1440;
	config.cachehours = 750;

The client will maintain a cache of model seconds data by default. This can be disabled by setting `noseconds` in the client `config`. This will result in a reduced workload for the client.

	config.noseconds = true;

Debug mode may be specified to increase logging verbosity.

	config.debug = true;

Client Management
---

Instantiation by the normal means. The `config` object is created in *Client Configuration*.

	var qsn = new QSNClient(config);

Two connection methods are provided. The `connect()` method will simply open a socket. It requires the client application to manage authentication and reconnection where necessary. The `connect_persist()` method will manage the socket connection, any authentication, and emit 'error', 'close', and a combined 'down' event. Do not attempt to manage the connection when using `connect_persist()`.

	// We may want to look out for login failures.
	qsn.on('login', function(return,reply) {
		if ( return === false ) {
			alert('login failed');
		}
	});

	// Connect, get model list.
	qsn.connect_persist(function() {
		var instrs = qsn.getModels();
		console.log(instrs);
	});

To receive open events, set an `open` handler.

	qsn.on('open', function() {
		console.log('connected');	
	});

To receive socket close events, set a `closed` handler.

	qsn.on('closed', function() {
		console.log('socket closed');	
	});

To receive socket error events, set an `error` handler. The provided `err` object contains the encountered error.

	qsn.on('error', function(err) {
		console.log('socket error',err);	
	});

To receive combined `close` and `error` events, set a `down` handler. The provided `src` argument is the origin of the event.

	qsn.on('down', function(src) {
		console.log('socket down',src);	
	});

Client Status
---

The client maintains running status and metric data. The `getStatus()` method will return an object containing the status data.

	console.log(qsn.getStatus());

Logs
---

Log events are emitted by the client. Adding a log handler will disable internal console logging. The `msg` argument is an object containing logged parameters and data.

	// Disable logging of non-errors.
	qsn.on('log', function(msg) {
		if ( msg.error === true ) {
			console.log('error',msg);
		} else {
			return;
		}
	});

API Keys
---

An API Key can be requested by an application once a user has logged in with their username/password pair. When the key is received, it should be cached and used for all future authentication for this user. The key request must contain a `name` for the requesting application. The `name` will be used for application identification and key management purposes in the QSN Console. API Keys can be revoked by the user at any time. They provide restricted access to account data, but full access to all other platform components.

	// Request Key
	qsn.getApiKey("bobTrad version 1.0 codename traDbob", function(key) {
		console.log(key);
	});

	// Use Key -- Set debug if required.
	var config = {
		debug: true,
		gateway: 'eu',
		apikey: key.key,
		apisecret: key.secret
	};
	var qsn = new QSNClient(config);
	qsn.connect_persist(function() {
		console.log('connected');
	});	

Listing Models
---

An object containing all available models along with their current stats will be returned by the `getModels()` method after a client has connected.

	qsn.connect(function() {
		// All currently published models are within the 'net' type.
		var models = qsn.getModels().net;
		console.log(models);
	});

Subscribe
---

A subscription request must have a minimum of `type` and `name` specified. The `onload` event will emit only once, when the model has been loaded. The `onquote` event will emit for every quote received on that model. The `onload` and `onquote` callbacks provided here will override global `load` and `quote` events.

	var subto = {
		type: 'net',
		name: 'fx_gbpusd_a',
		onload: function(instr) {
			console.log(instr.name + ' loaded');
		},
		onquote: function(instr,quote) {
			console.log('model quote for ' + instr.name + ' ' + quote.diverg);
		}
	};
	qsn.subscribe(subto);

Unsubscribe
---

Unsubscribe will disable events and cleanly shutdown the model. Provide either the model object or an object containing the model `type` and `name` to be unsubscribed from.

	qsn.unsubscribe(model, function(result) {
  console.log('unsubscribed from model', model.name);
 });

BBS Messaging
---

BBS messages are distributed immediately upon receipt. Messages are distributed as objects containing message parameters and data.

	qsn.on('bbs', function(msg) {
		console.log(msg);
	});

The client caches and will return the latest 300 BBS messages in an array object.

	var bbs = qsn.getBBS();

Minfo Data
---

Minfo messages contain updates to model stats. Messages are distributed as objects containing model parameters and data.

	qsn.on('minfo', function(msg) {
		console.log(msg);
	});

SysNotice Messages
---

SysNotice Messages contain platform wide notifications. They are used during some holidays and platform issues. Messages are distributed as a singular string. They can be captured using the `sysnotice` event.

	qsn.on('sysnotice', function(msg) {
		console.log(msg);
	});

Send Raw Message
---

The `sendMessage()` method will send a raw message on the QSN socket. It should not be used by an application under most circumstances. Message will be encoded into JSON before sending.

	var msg = {
		type: 'sub',
		body: {
			type: 'net',
			name: 'fx_gbpusd_a'
		}
	};
	qsn.sendMessage(msg);

License
===

Copyright (c) 2013 (Quantitative Signals Network) <support@quantsig.net>

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.


