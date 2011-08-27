
/**
 * Module dependencies.
 */

var nko = require('nko')('jhAZ+nTFXbf2PrWJ');
var express = require('express');
var RedisStore = require('connect-redis')(express);
var redis = require('redis');
var userDB = redis.createClient();
var Troupe = require('./lib/Troupe');
var User = require('./lib/User');

var app = module.exports = express.createServer();

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.cookieParser());
  app.use(express.session({secret: 'himitsu!', fingerprint: function(req){return req.socket.remoteAddress;}, store: new RedisStore, key: 'express.sid'}));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(express.compiler({ src: __dirname + '/public', enable: ['less'] }));
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(express.logger({ format: ':method :url' }));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

userDB.on('error', function (err) {
  console.log('Redis connection error to ' + userDB.host + ':' + userDB.port + ' - ' + err);
});

// Routes

app.get('/', function(req, res){
  var A = new User({username:'A', user_id:0});
  var B = new User({username:'B', user_id:1});
  var C = new User({username:'C', user_id:2});
  var D = new User({username:'D', user_id:3});
  var users = [A, B, C, D];

  var numPpl = users.length;
  var total = 0;
  var expenses = []; // index == userID
  for(var i=numPpl; i--;){
    expenses.push(Math.ceil(Math.random()*100)*100); // between $0 and $100
  }
  for(var i=numPpl; i--;){
    total += expenses[i];
  }

  // NO Optimization
  var naiveTable = expenses.map(function(x, i){
    return expenses.map(function(y, j){
      if (i===j){
        return 0;
      }
      else{
        return y / numPpl;
      }
    });
  }); // 2D Array

  var nt = new Troupe(users, naiveTable);
  nt.print();
  var ot = nt.optimize();
  ot.print();

  res.render('index', {
    title: 'Tab-Out',
    expenses : expenses,
    total : total,
    users : users,
    naive : nt.troupTable,
    opt : ot.troupTable
  });
});

app.listen(process.env.NODE_ENV === 'production' ? 80 : 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
