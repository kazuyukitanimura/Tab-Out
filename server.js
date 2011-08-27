// server.js
var http = require('http')
, nko = require('nko')('jhAZ+nTFXbf2PrWJ');

var app = http.createServer(function (req, res) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end('Hello, World');
    });

app.listen(parseInt(process.env.PORT) || 80);
console.log('Listening on ' + app.address().port);
