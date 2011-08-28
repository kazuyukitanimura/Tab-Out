
/**
 * Module dependencies.
 */
var nko = require('nko')('jhAZ+nTFXbf2PrWJ');

var fs = require('fs');
var config = require('./config');
var Log = require('log');
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
      myHostname: 'http://' + config.server.host
      , consumerKey: config.auth.twitter.consumerKey
      , consumerSecret: config.auth.twitter.consumerSecret
      , redirectPath: '/'
    }
  }
});
mongoose.model('AuthUser', UserSchema);
mongoose.connect(config.mongodb.url);
AuthUser = mongoose.model('AuthUser');

var GroupUserSchema = new Schema({ 
  name: { type: String },
  id: {type: String},
  amount: Number
});
var GroupSchema = new Schema({
  name:  { type: String },
  users: [GroupUserSchema]
});
mongoose.model('Group', GroupSchema);
var Group = mongoose.model('Group');

var Troupe = require('./lib/Troupe');
var User = require('./lib/User');

var log = new Log(Log.DEBUG, fs.createWriteStream('./logs/log.log'));
var app = module.exports = express.createServer(
  express.bodyParser(),
  express.static(__dirname + '/public'),
  express.cookieParser(),
  express.session({ secret: config.session.secret}),
  //express.session({secret: 'himitsu!', fingerprint: function(req){return req.socket.remoteAddress;}, store: sessionStore, key: 'express.sid'}),
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
  app.set('view engine', 'ejs');
  app.set('view options', {layout: false});
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true })); 
});

app.configure('production', function(){
  app.use(express.errorHandler()); 
});

function checkAuthenticated(req, res, next) {
  if(req.loggedIn) {
    if (req.session.url) {
      console.log('redirecting to %s', req.session.url);
      redirectUrl = req.session.url;
      delete req.session.url;

      res.redirect(redirectUrl);
    } else {
      next();
    }
  } else {
    console.log(req);

    req.session.url = req.url;
    res.redirect('/login');
  }
}

// Routes

app.get('/', checkAuthenticated, function(req, res){
  /*
  Group.findById("4e59ba1c2605b4d12c000003", function(err, result) {
    console.log(result.name);
    result.users.forEach(function(user) {
      console.log(user.name);
    });
  });
  */

  /*
  console.log('here i come!');
  Group.findOne({users: {$elemMatch : {name: "Unko"}}}, function(err, doc) {
    if (err) {
      console.log(err);
    }
    console.log(doc);
  });
  */
  /*
  var group = new Group();
  group.name = 'Group1';
  group.users = [
    {
      id: '135591363',
      name: 'Kazu',
      amount: 10
    },
    {
      id: '7103272',
      name: 'Tomomi',
      amount: 20
    }
  ];
  group.save(function(err) {
    if (err) {
      console.log(err);
    }
  });
  */
  /*
  var group = new Group();
  group.name = 'Group2';
  group.users = [
    {
      id: '135591363',
      name: 'Kazu',
      amount: 40
    },
    {
      name: 'Unko',
      amount: 200
    },
    {
      name: 'Shikko',
      amount: 198
    }
  ];
  group.save(function(err) {
    if (err) {
      console.log(err);
    }
  });
  */

  res.render('index');
});

app.get('/login', function(req, res) {
  res.render('login', {auth_url: config.server.host});
});

app.get('/users/:user_id/groups', checkAuthenticated, function(req, res) {
  Group.find({users: {$elemMatch : {id: req.params.user_id}}}, function(err, docs) {
    res.send(JSON.stringify(docs), {'ContentType': 'application/json'}, 200)
  });
});

app.get('/groups/:group_id', checkAuthenticated, function(req, res) {
  Group.findById(req.params.group_id, function(err, doc) {
    res.send(JSON.stringify(doc), {'ContentType': 'application/json'}, 200)
  });
});

app.get('/groups/:group_id/users/delete', checkAuthenticated, function(req, res) {
  var user_id = req.param('user_id') || null;
  if (user_id) {
    Group.findById(req.params.group_id, function(err, doc) {
      if (err) {
        res.send(JSON.stringify({}), {'ContentType': 'application/json'}, 400)
      } else {
        var users = [];
        for(var i = 0; i < doc.users.length; i++) {
          var user = doc.users[i];
          if (user._id != user_id) {
            users.push(user);
          }
        }
        doc.users = users;
        doc.save(function(err) {
          if (err) {
            res.send(JSON.stringify({}), {'ContentType': 'application/json'}, 400)
          } else {
            res.send(JSON.stringify(doc), {'ContentType': 'application/json'}, 200)
          }
        });
      }
    });
  } else {
    res.send(JSON.stringify({}), {'ContentType': 'application/json'}, 400)
  }
});

app.get('/groups/:group_id/users/add', checkAuthenticated, function(req, res) {
  var user_id = req.param('id') || null;
  var user_name = req.param('name') || null;
  var user_amount = req.param('amount') || null;

  if (user_id && user_name && user_amount) {
    Group.findById(req.params.group_id, function(err, doc) {
      if (err) {
        res.send(JSON.stringify({}), {'ContentType': 'application/json'}, 400)
      } else {
        var exists = false;
        for(var i = 0; i < doc.users.length; i++) {
          var user = doc.users[i];
          if ((user._id == user_id) || (user.name == user_name)) {
            exists = true;
          }
        }
        if (!exists) {
          doc.users.push({id: user_id, name: user_name, amount: user_amount});
        }
        doc.save(function(err) {
          if (err) {
            res.send(JSON.stringify({}), {'ContentType': 'application/json'}, 400)
          } else {
            res.send(JSON.stringify(doc), {'ContentType': 'application/json'}, 200)
          }
        });
      }
    });
  } else {
    res.send(JSON.stringify({}), {'ContentType': 'application/json'}, 400)
  }
});

app.get('/groups/:group_id/users/update', checkAuthenticated, function(req, res) {
  var user_user_id = req.param('user_id') || null;
  var user_id = req.param('id') || null;
  var user_name = req.param('name') || null;
  var user_amount = req.param('amount') || null;

  if (user_user_id) {
    Group.findById(req.params.group_id, function(err, doc) {
      if (err) {
        res.send(JSON.stringify({}), {'ContentType': 'application/json'}, 400)
      } else {
        var users = [];
        for(var i = 0; i < doc.users.length; i++) {
          var user = doc.users[i];
          if (user._id == user_user_id) {
            if (user_id) {
              user.id = user_id;
            }
            if (user_name) {
              user.name = user_name;
            }
            if (user_amount) {
              user.amount = user_amount;
            }
          }
          //users.push(user);
        }
        //doc.users = users;
        doc.save(function(err) {
          if (err) {
            console.log(err);
            res.send(JSON.stringify({}), {'ContentType': 'application/json'}, 400)
          } else {
            res.send(JSON.stringify(doc), {'ContentType': 'application/json'}, 200)
          }
        });
      }
    });
  } else {
    res.send(JSON.stringify({}), {'ContentType': 'application/json'}, 400)
  }
});

app.get('/groups/:group_id/tabout', checkAuthenticated, function(req, res) {
  Group.findById(req.params.group_id, function(err, doc) {
    if (err) {
      res.send(JSON.stringify({}), {'ContentType': 'application/json'}, 400)
    } else {
      var users = [];
      var expenses = [];
      doc.users.forEach(function(user) {
        users.push(new User({username: user.name, user_id: user.id}));
        expenses.push(user.amount);
      });

      for(var i = 0; i < users.length; i++) {
        console.log('user: %s, expense: %d', users[i].username, expenses[i]);
      }

      /*
      var A = new User({username:'A', user_id:0});
      var B = new User({username:'B', user_id:1});
      var C = new User({username:'C', user_id:2});
      var D = new User({username:'D', user_id:3});
      var users = [A, B, C, D];
      */

      var numPpl = users.length;
      var total = 0;
      /*
      var expenses = []; // index == userID
      for(var i=numPpl; i--;){
        expenses.push(Math.ceil(Math.random()*100)*100); // between $0 and $100
      }
      */
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

      res.send(JSON.stringify(ot.troupTable), {'ContentType': 'application/json'}, 200);
    }
  });
});

process.on('uncaughtException', function(err) {
  log.error(err);
});

mongooseAuth.helpExpress(app);
app.listen(process.env.NODE_ENV === 'production' ? 80 : 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
