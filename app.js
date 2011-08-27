
/**
 * Module dependencies.
 */

var nko = require('nko')('jhAZ+nTFXbf2PrWJ');
var config = require('./config');
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
      , callbackPath : '/auth/twitter/callback/path'
      , redirectPath: '/'
    }
  }
});
mongoose.model('AuthUser', UserSchema);
mongoose.connect('mongodb://tabout:tabout@staff.mongohq.com:10036/tabout');
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

var io = require('socket.io').listen(app);
// Based on http://www.danielbaulig.de/socket-ioexpress/
io.set('authorization', function (data, accept){
  if(data.headers.cookie){
    var parseCookie = require('connect').utils.parseCookie;
    data.cookie = parseCookie(data.headers.cookie);
    data.sessionID = data.cookie['express.sid'];
    // save the session store to the data object 
    // (as required by the Session constructor)
    data.sessionStore = sessionStore;
    sessionStore.get(data.sessionID, function (err, session){
      if(err){
        accept(err.message, false);
      }else{
        // create a session object, passing data as request and our
        // just acquired session data
        var Session = require('connect').middleware.session.Session;
        data.session = new Session(data, session);
        accept(null, true);
      }
    });
  } else {
    return accept('No cookie transmitted.', false);
  }
});

io.sockets.on('connecttion', function(socket){
  // Based on http://www.danielbaulig.de/socket-ioexpress/
  var hs = client.handshake;
  var session = hs.session;
  var sessionID = hs.sessionID;
  console.log('A client with sessionID '+sessionID+' connected!');
  // setup an inteval that will keep our session fresh

  socket.on('signup', function(data){
    var username         = data.username;
    var password         = data.password;
    var first_name       = data.first_name;
    var last_name        = data.last_name;
    var twitter_username = data.twitter_username;
    var email            = data.email;
    if(username && password && first_name && last_name && email){
      userDB.hexists(username, 'password', function(err, obj){
        if(err){
          console.error(err);
          socket.emit('fail', {action:'signup', message:'DB error'});
        }else if(obj===1){
          socket.emit('fail', {action:'signup', message:'the account already exists'});
        }else if(obj===0){
          userDB.hset(username, 'password', password, function(err){
            if(err){
              console.error(err);
              socket.emit('fail', {action:'signup', message:'DB error'});
            }else{
              session.regenerate(function(err){
                if(err){
                  console.error(err);
                  socket.emit('fail', {action:'signup', message:'session error'});
                  session.destroy();
                }else{
                  socket.emit('success', {action:'login', message:''});
                  session.username = username;
                }
              });
            }
          });
        }else{
          console.error(err);
          socket.emit('fail', {action:'signup', message:'unknown error'});
        }
      });
    }else{
      socket.emit('fail', {action:'login', message:'some info is missing'});
    }
  });

  socket.on('signdown', function(data){
    var password = data.password;
    var username = session.username;
    if(username && password){
      userDB.hget(username, 'password', function(err, obj){
        if(err){
          console.error(err);
          socket.emit('fail', {action:'signdown', message:'DB error'});
        }else if(obj !== password){
          socket.emit('fail', {action:'signdown', message:'invalid password'});
        }else if(obj === password){
          userDB.del(username, function(err){
            if(err){
              console.error(err);
              socket.emit('fail', {action:'signdown', message:'DB error'});
            }else{
              session.destroy(function(err){
                if(err){
                  console.error(err);
                  socket.emit('fail', {action:'signdown', message:'session error'});
                }else{
                  socket.emit('success', {action:'signdown', message:''});
                }
              });
            }
          });
        }else{
          console.error(err);
          socket.emit('fail', {action:'signdown', message:'the account does not exist?'});
        }
      });
    }else{
      socket.emit('fail', {action:'signdown', message:'not logged-in or blank password'});
    }
  });

  socket.on('login', function(data){
    var username = data.username;
    var password = data.password;
    if(username && password){
      userDB.hgetall(username, function(err, obj){
        if(err){
          console.error(err);
          socket.emit('fail', {action:'login', message:'DB error'});
          session.destroy();
        }else if(obj.password !== password){
          socket.emit('fail', {action:'login', message:'Wrong password'});
          session.destroy();
        }else{
          session.regenerate(function(err){
            if(err){
              console.error(err);
              socket.emit('fail', {action:'login', message:'session error'});
              session.destroy();
            }else{
              socket.emit('success', {action:'login', message:''});
              session.username = username;
            }
          });
        }
      });
    }else{
      socket.emit('fail', {action:'login', message:'missing username or password'});
    }
  });

  socket.on('logout', function(data){
    var username = session.username;
    if(username){
      session.destroy(function(err){
        if(err){
          console.error(err);
          socket.emit('fail', {action:'logout', message:'session error'});
        }else{
          socket.emit('success', {action:'login', message:''});
        }
      });
    }else{
      socket.emit('fail', {action:'logout', message:'not logged-in'});
    }
  });

  socket.on('chpw', function(data){
    var password = data.password;
    var new_password = data.new_password;
    var username = session.username;
    if(username && password && new_password){
      userDB.hget(username, 'password', function(err, obj){
        if(err){
          console.error(err);
          socket.emit('fail', {action:'chpw', message:'DB error'});
        }else if(obj !== password){
          socket.emit('fail', {action:'chpw', message:'invalid password'});
        }else if(obj === password){
          userDB.mset(username, 'password', password, function(err){
            if(err){
              console.error(err);
              socket.emit('fail', {action:'chpw', message:'DB error'});
            }else{
              session.regenerate(function(err){
                if(err){
                  console.error(err);
                  socket.emit('fail', {action:'chpw', message:'session error'});
                  req.session.destroy();
                }else{
                  socket.emit('success', {action:'chpw', message:''});
                  session.username = username;
                }
              });
            }
          });
        }else{
          console.error(err);
          socket.emit('fail', {action:'chpw', message:'the account does not exist?'});
        }
      });
    }else{
      socket.emit('fail', {action:'chpw', message:'missing info?'});
    }
  });

  // Based on http://www.danielbaulig.de/socket-ioexpress/
  var intervalID = setInterval(function(){
    // reload the session (just in case something changed,
    // we don't want to override anything, but the age)
    // reloading will also ensure we keep an up2date copy
    // of the session with our connection.
    session.reload(function(){ 
      // "touch" it (resetting maxAge and lastAccess)
      // and save it back again.
      session.touch().save();
    });
  }, 60*1000);
  client.on('disconnect', function(){
    console.log('A client with sessionID '+sessionID+' disconnected!');
    // clear the client interval to stop refreshing the session
    clearInterval(intervalID);
  });
});

mongooseAuth.helpExpress(app);
app.listen(process.env.NODE_ENV === 'production' ? 80 : 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
