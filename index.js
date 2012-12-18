// index.js

var telnet = require('telnet'),
    repl = require('repl'),
    util = require('util'),
    events = require('events'),
    ansi = require('ansi'),
    port = Number(process.argv[2]) || 23;

var SubRepl = function() {
    this.clients = [];

    this.addClient = function(client) {
        this.clients.push(client);
    };
};

util.inherits(SubRepl, events.EventEmitter);

var Engine = new SubRepl();
Engine.on('foo', function(args, client) {
    var engine = this;
    client.cyan().bold().underline().write('bar! [' + engine.clients.length + ']\r\n').reset();
    client.white().bold().write('yayer> ').reset();
});

var server = telnet.createServer(function (client) {
    var prompt = ansi(client, {enabled: true});

    Engine.addClient(client);

  client.on('window size', function (e) {
    if (e.command === 'sb') {
      // a real "resize" event; 'readline' listens for this
      client.columns = e.columns;
      client.rows = e.rows;
      client.emit('resize');
    }
  });

  client.on('suppress go ahead',  console.log);
  client.on('echo', console.log);
  client.on('window size', console.log);
  client.on('x display location', console.log);
  client.on('terminal speed', console.log);
  client.on('environment variables', console.log);
  client.on('transmit binary', console.log);
  client.on('status', console.log);
  client.on('linemode', console.log);
  client.on('authentication', console.log);

  // 'readline' will call `setRawMode` when it is a function
  client.setRawMode = setRawMode;

  // make unicode characters work properly
  client['do'].transmit_binary();

  // emit 'window size' events
  client['do'].window_size();

  client.on('data', function(data) {
    var input = data.toString().trim();
    var args = input.split(' ');
    if(input !== '') {
        Engine.emit(args.shift(), args, prompt);
    }
  });

  client.on('foo', function() { client.write('socket bar!\r\n'); });

  /*

  // create the REPL
    var r = repl.start({
        input: client,
        output: client,
        prompt: 'telnet repl> ',
        terminal: true,
        useGlobal: false
    }).on('exit', function () {
        client.end();
    });

  r.context.r = r;
  r.context.client = client;
  r.context.socket = client;*/

});

server.on('error', function (err) {
  if (err.code == 'EACCES') {
    console.error('%s: You must be "root" to bind to port %d', err.code, port);
  } else {
    throw err;
  }
});

server.on('listening', function () {
  console.log('node repl telnet(1) server listening on port %d', this.address().port);
  console.log('  $ telnet localhost' + (port != 23 ? ' ' + port : ''));
});

server.listen(port);

/**
 * The equivalent of "raw mode" via telnet option commands.
 * Set this function on a telnet `client` instance.
 */

function setRawMode (mode) {
  if (mode) {
    this['do'].suppress_go_ahead();
    this.will.suppress_go_ahead();
    this.will.echo();
  } else {
    this.dont.suppress_go_ahead();
    this.wont.suppress_go_ahead();
    this.wont.echo();
  }
}