qsnjsclient
===

The QSN Javascript Client implements the QSN messaging API in Javascript over Websocket. Supported methods include limited account access, realtime model data, BBS messaging, and platform notifications. The client implements an asynchronous messaging model and data caching system, providing realtime access to the QSN platform.

This client requires the jsSHA library. https://github.com/Caligatio/jsSHA.git

Client Configuration
---

The default QSN gateway is Europe (eu). Available choices are 'am' (Americas), 'eu' (Europe), 'as', (Asia).

	var config = {
		gateway = 'eu'
	};

Access to the QSN private network is restricted. A valid account is required to login to QSN. A requesting client can chose access method by providing either username and password or apikey and apisecret.

	config.username = 'username';
	config.password = 'password';

API Key is the preferred login method. It provides access without using the account's username and password. An automated mechanism for request and receipt of API Keys is provided by the client. The client does not provide for storage of the API Key.

	config.apikey = 'apikey';
	config.apisecret = 'apisecret';

Client Management
---

Instantiation uses the standard drill.

	var qsn = new QSNClient(config);

The `connect()` method will start a QSN connection and execute the supplied callback once complete. This requires login details provided in `config` via API Key or username/password. The client will maintain state as well as manage any reconnections necessary. The provided callback will only be called once at startup.

	qsn.on('login',function(return) {
  if ( return === false ) {
   alert('login failed');
  }
	});

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

To receive socket error events, set a `error` handler. The provided `err` contains the encountered error.

	qsn.on('error',function(err) {
		console.log('socket error',err);	
	});

Logs
---

Log messages may be captured by configuring a log handler. Adding a log handler will disable console logging. Here `msg` is an object containing logged parameters and data.

	qsn.on('log',function(msg) {
		console.log(msg);
	});

QSN Client caches and will return the latest 300 log entries in an array object.

	console.log(qsn.getLogs());

API Keys
---

An API Key can be requested once a connection is established. When received, it should be used for client authentication. The key request must contain a name for the requesting application. The name will be used for application identification and key management purposes in the QSN Console.

	qsn.getApiKey("Bob's Slack Trader", function(key) {
		// In chrome, you may want to store the key in localStorage.
		localStorage.apikey = JSON.stringify(key);
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

A list of all instrument types and names along with their current stats will be returned by the `getInstrs()` method after a client has logged in. All currently available models are located within the 'net' key.

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

SysNotice Data
---

Minfo messages contain updates to model stats. Messages are distributed as objects containing model parameters and data.

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


