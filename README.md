qsnjsclient
===

The QSN Javascript Client implements the QSN messaging API in Javascript over Websocket. Supported methods include access to model data, BBS messaging, and platform notifications. This client implements an asynchronous messaging model and data caching system, providing realtime access to the QSN platform within HTML5 browsers.

This client requires the jsSHA library for login methods. https://github.com/Caligatio/jsSHA.git

Client Configuration
---

The default QSN gateway is Europe (eu). Also available are 'am' (Americas) and 'as' (Asia).

	var config = {
		gateway = 'eu'
	};

Access to the QSN private network is restricted. A valid account is required to login to QSN. A requesting client can select access method by providing either `username` and `password` or `apikey` and `apisecret`.

	config.username = 'username';
	config.password = 'password';

API Key is the preferred login method. It provides access without the need for username and password caching. An automated mechanism for request and receipt of API Keys is provided by the client. The client does not provide for storage of the API Key. The application utilizing the QSN Client should make a reasonable attempt to secure the API Key.

	config.apikey = 'apikey';
	config.apisecret = 'apisecret';

Data caching is maintained by the client. Default values for data caching are the QSN settings. Note that larger values may not be provided by QSN.

	config.cacheseconds = 600;
	config.cacheminutes = 1440;
	config.cachehours = 750;

Client Management
---

Instantiation by the normal means. The `config` object is created in *Client Configuration*.

	var qsn = new QSNClient(config);

The `connect()` method will start a QSN connection and execute the supplied callback when complete. This requires login details provided in `config`. The client will maintain state and handle all reconnections. The provided callback will be executed once at startup only.

	// We may want to look out for login failures.
	qsn.on('login',function(return) {
		if ( return === false ) {
			alert('login failed');
		}
	});

	// Connect, get instrument list.
	qsn.connect(function() {
		var instrs = qsn.getInstrs();
		console.log(instrs);
	});

To receive reconnect events, set a `reconnect` handler.

	qsn.on('reconnect',function() {
		console.log('reconnected');	
	});

To receive socket close events, set a `closed` handler.

	qsn.on('closed',function() {
		console.log('socket closed');	
	});

To receive socket error events, set an `error` handler. The provided `err` object contains the encountered error.

	qsn.on('error',function(err) {
		console.log('socket error',err);	
	});

Client Status
---

The Client maintains running status and metric data. The `getStatus` method will return an object containing the status data.

	console.log(qsn.getStatus());

Logs
---

Log messages may be captured by configuring a log handler. Adding a log handler will disable internal console logging. The `msg` argument is an object containing logged parameters and data.

	// Disable logging of non-errors.
	qsn.on('log',function(msg) {
		if ( msg.error === true ) {
			console.log('error',msg);
		} else {
			return;
		}
	});

The Client caches and will return the latest 300 log entries in an array object.

	console.log(qsn.getLogs());

API Keys
---

An API Key can be requested when a connection is established using the username/password options above. When received, it should be used and cached for client authentication. The key request must contain a `name` for the requesting application. The `name` will be used for application identification and key management purposes in the QSN Console. API Keys can be revoked by the user at any time. They provide restricted access to account data, but full access to all other platform components.

	qsn.getApiKey("Bob's Slack Trader", function(key) {
  console.log(key);
	});

	// Read Key from localStorage
	var apikey = JSON.parse(localStorage.apikey);
	var config = {
		gateway: 'eu',
		apikey: apikey.key,
		apisecret: apikey.secret
	};
	var qsn = new QSNClient(config);
	qsn.connect(function() {
		console.log('connected');
`});

Listing Models
---

A list of all instrument types and names along with their current stats will be returned by the `getInstrs()` method after a client has connected. All currently available models are located within the 'net' key.

	qsn.connect(function() {
		var models = qsn.getInstrs().net;
		console.log(models);
	});

Subscribe
---

A subscription request must always have a minimum of `type` and `name` specified. The onload event will execute once when the model has been loaded. The onquote event will execute once for each quote received.

	qsn.connect(function() {
		var subto = {
			type: 'net',
			name: 'fx_gbpusd_a',
			onload: function(instr) {
				console.log(instr.name + ' loaded')
			},
			onquote: function(instr,quote) {
				console.log('quote for ' + instr.name + ' ' + quote.diverg);
			}
		};
		qsn.subscribe(subto);
	});

Unsubscribe
---

Unsubscribe will disable events and cleanly shutdown the provided model.

	qsn.unsubscribe(instr);

BBS Messaging
---

BBS messages are distributed immediately upon receipt. Messages are distributed as objects containing message parameters and data.

	qsn.on('bbs',function(msg) {
		console.log(msg);
	});

QSN Client caches and will return the latest 300 BBS messages in an array object.

	console.log(qsn.getBBS());

Minfo Data
---

Minfo messages contain updates to model stats. Messages are distributed as objects containing model parameters and data.

	qsn.on('minfo',function(msg) {
		console.log(msg);
	});

SysNotice Messages
---

SysNotice Messages contain platform wide notifications. They are used during some holidays and platform issues. Messages are distributed as a singular string. They can be captured using the `sysnotice` event.

	qsn.on('sysnotice',function(msg) {
		console.log(msg);
	});

License
===

This software is distributed under the MIT License.

The MIT License (MIT)

Copyright (c) 2013 Jason Ihde (Quantitative Signals Network) <jason@quantsig.net>

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


