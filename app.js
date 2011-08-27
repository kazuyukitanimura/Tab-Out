
/**
 * Module dependencies.
 */

var nko = require('nko')('jhAZ+nTFXbf2PrWJ');
var config = require('./config');
var winston = require('winston');
var logger = new (winston.Logger)({
  transports: [
    new winston.transports.File({ filename: 'log/all-logs.log' })
  ],
  exceptionHandlers: [
    new winston.transports.File({ filename: 'log/exceptions.log' })
  ]
});
var express = require('express');
var RedisStore = require('connect-redis')(express);
var sessionStore = new RedisStore;
var redis = require('redis');
var userDB = redis.createClient();
var everyauth = require('everyauth')
  , Promise = everyauth.Promise;
everyauth.debug = true;
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId;

var UserSchema = new Schema({})
  , AuthUser;

var mongooseAuth = require('mongoose-auth');

UserSchema.plugin(mongooseAuth, {
  everymodule: {
    everyauth: {
      User: function () {
        return AuthUser;
      }
    }
  }
, twitter: {
    everyauth: {
      myHostname: 'http://69.164.214.192'
      , consumerKey: config.auth.twitter.consumerKey
      , consumerSecret: config.auth.twitter.consumerSecret
      , redirectPath: '/'
    }
  }
});
mongoose.model('AuthUser', UserSchema);
mongoose.connect('mongodb://localhost/tabout');
AuthUser = mongoose.model('AuthUser');

var Troupe = require('./lib/Troupe');
var User = require('./lib/User');

var app = module.exports = express.createServer(
  express.bodyParser(),
  express.static(__dirname + '/public'),
  express.cookieParser(),
  //express.session({ secret: 'test'}),
  express.session({secret: 'himitsu!', fingerprint: function(req){return req.socket.remoteAddress;}, store: sessionStore, key: 'express.sid'}),
  mongooseAuth.middleware(),
  //express.router(routes),
  //app.use(express.methodOverride());
  express.compiler({ src: __dirname + '/public', enable: ['less'] }),
  //app.use(app.router);
  express.logger({ format: ':method :url' })
);

// Configuration

app.configure(function(){
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
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
  res.render('atsuya_test', {layout: false});
});

mongooseAuth.helpExpress(app);
app.listen(process.env.NODE_ENV === 'production' ? 80 : 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
