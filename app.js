
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

app.get('/login/:userID/:userPW', function(req, res){
  res.contentType('application/json');
  var params = req.params;
  var userID = params.userID;
  var userPW = params.userPW;
  if(userID && userPW){
    userDB.hgetall(userID, function(err, obj){
      if(err){
        console.error(err);
        res.send(JSON.stringify({status:'fail', message:'DB error'}), 500);
        res.end();
        req.session.destroy();
      }else if(! (obj.userPW===userPW && obj.data)){
        res.send(JSON.stringify({status:'fail', message:'no data or wrong userPW'}), 500);
        res.end();
        req.session.destroy();
      }else{
        req.session.regenerate(function(err){
          if(err){
            console.error(err);
            res.send(JSON.stringify({status:'fail', message:'session regenerate error'}), 500);
            res.end();
            req.session.destroy();
          }else{
            req.session.data = JSON.parse(obj.data);
            req.session.userID = userID;
            res.end(JSON.stringify({status:'success'}));
          }
        });
      }
    });
  }else{
    res.send(JSON.stringify({status:'fail', message:'no such a userID or userPW'}), 400);
    res.end();
  }
});

app.get('/logout', function(req, res){
  res.contentType('application/json');
  var session = req.session;
  var userID = session.userID;
  var data = session.data;
  if(data && userID){
    userDB.hset(userID, 'data', JSON.stringify(data), function(err){
      if(err){
        console.error(err);
        res.send(JSON.stringify({status:'fail', message:'DB error'}), 500);
        res.end();
      }else{
        req.session.destroy(function(err){
          if(err){
            console.error(err);
            res.send(JSON.stringify({status:'fail', message:'session destroy error'}), 500);
            res.end();
          }else{
            res.end(JSON.stringify({status:'success'}));
          }
        });
      }
    });
  }else{
    res.send(JSON.stringify({status:'fail', message:'no such a data or userID'}), 400);
    res.end();
  }
});

app.get('/signup/:userID/:userPW', function(req, res){
  res.contentType('application/json');
  var params = req.params;
  var userID = params.userID;
  var userPW = params.userPW;
  var data = {};
  if(userID && userPW){
    userDB.hexists(userID, 'userPW', function(err, obj){
      if(err){
        console.error(err);
        res.send(JSON.stringify({status:'fail', message:'DB error'}), 500);
        res.end();
      }else if(obj===1){
        res.send(JSON.stringify({status:'fail', message:'the account already exists'}), 400);
        res.end();
      }else if(obj===0){
        userDB.hmset(userID, 'userPW', userPW, 'data', JSON.stringify(data), 'history', JSON.stringify([]), function(err){
          if(err){
            console.error(err);
            res.send(JSON.stringify({status:'fail', message:'userPW DB error'}), 500);
            res.end();
          }else{
            req.session.regenerate(function(err){
              if(err){
                console.error(err);
                res.send(JSON.stringify({status:'fail', message:'session regenerate error'}), 500);
                res.end();
                req.session.destroy();
              }else{
                req.session.userID = userID;
                req.session.data = data;
                res.end(JSON.stringify({status:'success'}));
              }
            });
          }
        });
      }else{
        console.error(err);
        res.send(JSON.stringify({status:'fail', message:'unknown error'}), 500);
        res.end();
      }
    });
  }else{
    res.send(JSON.stringify({status:'fail', message:'invalid userID or userPW'}), 400);
    res.end();
  }
});

app.get('/signdown/:userPW', function(req, res){
  res.contentType('application/json');
  var params = req.params;
  var userPW = params.userPW;
  var session = req.session;
  var userID = session.userID;
  if(userID && userPW){
    userDB.hget(userID, 'userPW', function(err, obj){
      if(err){
        console.error(err);
        res.send(JSON.stringify({status:'fail', message:'DB error'}), 500);
        res.end();
      }else if(obj!==userPW){
        res.send(JSON.stringify({status:'fail', message:'invalid password'}), 400);
        res.end();
      }else if(obj===userPW){
        userDB.del(userID, function(err){
          if(err){
            console.error(err);
            res.send(JSON.stringify({status:'fail', message:'userPW DB error'}), 500);
            res.end();
          }else{
            req.session.destroy(function(err){
              if(err){
                console.error(err);
                res.send(JSON.stringify({status:'fail', message:'session destroy error'}), 500);
                res.end();
              }else{
                res.end(JSON.stringify({status:'success'}));
              }
            });
          }
        });
      }else{
        console.error(err);
        res.send(JSON.stringify({status:'fail', message:'the account does not exist?'}), 400);
        res.end();
      }
    });
  }else{
    res.send(JSON.stringify({status:'fail', message:'invalid userID or userPW'}), 400);
    res.end();
  }
});

app.get('/chpw/:oldPW/:newPW', function(req, res){
  res.contentType('application/json');
  var params = req.params;
  var oldPW = params.oldPW;
  var newPW = params.newPW;
  var session = req.session;
  var userID = session.userID;
  var data = session.data;
  if(userID && oldPW && newPW){
    userDB.hget(userID, 'userPW', function(err, obj){
      if(err){
        console.error(err);
        res.send(JSON.stringify({status:'fail', message:'DB error'}), 500);
        res.end();
      }else if(obj!==oldPW){
        res.send(JSON.stringify({status:'fail', message:'invalid password'}), 400);
        res.end();
      }else if(obj===oldPW){
        userDB.hmset(userID, 'userPW', newPW, 'data', JSON.stringify(data), function(err){
          if(err){
            console.error(err);
            res.send(JSON.stringify({status:'fail', message:'userPW DB error'}), 500);
            res.end();
          }else{
            req.session.regenerate(function(err){
              if(err){
                console.error(err);
                res.send(JSON.stringify({status:'fail', message:'session regenerate error'}), 500);
                res.end();
                req.session.destroy();
              }else{
                req.session.userID = userID;
                req.session.data = data;
                res.end(JSON.stringify({status:'success'}));
              }
            });
          }
        });
      }else{
        console.error(err);
        res.send(JSON.stringify({status:'fail', message:'the account does not exist?'}), 400);
        res.end();
      }
    });
  }else{
    res.send(JSON.stringify({status:'fail', message:'invalid userID, old password, new passord'}), 400);
    res.end();
  }
});


app.listen(process.env.NODE_ENV === 'production' ? 80 : 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
