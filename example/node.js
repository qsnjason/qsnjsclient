var QSNClient = require("../client").QSNClient;

// Prepare config
var config = {
 //debug: true,
 minode: './minode',
 gateway: 'www.quantsig.net',
 // Login via Username/Password
 //username: 'Username',
 //password: 'Password',
 // Login via API key
 //apikey: 'API KEY',
 //apisecret: 'API Secret',
 // Use private gateway
 //gateway: 'eu.quantsig.net',
 on: {
  quote: function(instr,quote) {
   console.log('instr',instr.type,instr.name,quote.diverg,quote.dsdev,quote.actual);
  },
  subscribe: function(m) {
   console.log('subscribe',m);
  },
  load: function(m) {
   console.log('loaded',m.type,m.name);
  },
  bbs: function(m) {
   console.log('bbs message',m.handle,m.message);
  }
 }
};

// Instance.
var qsn = new QSNClient(config);

function connect() {
 qsn.connect_persist(function() {
  var repl = require("repl").start({
   prompt: "qsncon> ",
   input: process.stdin,
   output: process.stdout
  });
  repl.context.qsn = qsn;
  // Add depth interface
  qsn.subscribe({ type: 'net', name: 'com_gold_a' });
 });
}

connect();

