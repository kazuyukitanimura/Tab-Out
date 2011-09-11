
/**
 * Module dependencies.
 */

var fs = require('fs');
var config = require('./config');
var Log = require('log');
var log = new Log(Log.DEBUG, fs.createWriteStream('./log/log.log'));
var express = require('express');
var RedisStore = require('connect-redis')(express);
var redis = require('redis');
var userDB = redis.createClient();
var everyauth = require('everyauth')
  , Promise = everyauth.Promise;
everyauth.debug = true;
var mongoose = require('mongoose')
  , Schema = mongoose.Schema
  , ObjectId = mongoose.SchemaTypes.ObjectId;
var mongooseAuth = require('mongoose-auth');
var Troupe = require('./lib/Troupe');
var User = require('./lib/User');
var RandomURLString = require('./lib/RandomURLString');

var UserSchema = new Schema({})
  , AuthUser;

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
  url: {type: String},
  users: [GroupUserSchema]
});
mongoose.model('Group', GroupSchema);
var Group = mongoose.model('Group');

var log = new Log(Log.DEBUG, fs.createWriteStream('./log/log.log'));

var sessionConfig = {secret: config.session.secret};
if (process.env.NODE_ENV === 'production') {
  //sessionConfig['store'] = new RedisStore;
}
var app = module.exports = express.createServer(
  express.bodyParser(),
  express.static(__dirname + '/public'),
  express.cookieParser(),
  express.session(sessionConfig),
  //express.session({secret: config.session.secret, store: new RedisStore}),
  mongooseAuth.middleware(),
  express.compiler({ src: __dirname + '/public', enable: ['less'] }),
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

var checkAuthenticated = function(req, res, next) {
  if(req.loggedIn) {
    if (req.session.url) {
      console.log('redirecting to %s', req.session.url);
      redirectUrl = req.session.url;
      delete req.session.url;
      delete req.session.guest;

      res.redirect(redirectUrl);
    } else {
      next();
    }
  } else if(req.session.guest) {
    next();
  } else {
    req.session.url = req.url;
    res.redirect('/login');
  }
};

// Routes

app.get('/', checkAuthenticated, function(req, res){
  res.render('index');
});

app.get('/guest', function(req, res){
  req.session.guest = true;
  res.render('index', {guestID: RandomURLString(6)});
});

app.get('/login', function(req, res) {
  res.render('login', {auth_url: config.server.host});
});

app.get('/users/:user_id/groups', checkAuthenticated, function(req, res) {
  Group.find({users: {$elemMatch : {id: req.params.user_id}}}, function(err, docs) {
    res.json(docs, 200);
  });
});

app.get('/groups/create', checkAuthenticated, function(req, res) {
  var group_name = req.param('name') || null;
  if (group_name) {
    var group = new Group();
    group.name = group_name;
    group.save(function(err) {
      if (err) {
        res.json({}, 400);
      } else {
        group.url = 'http://'+config.server.host+'/groups/'+group._id;
        group.save(function(err) {
          if (err) {
            res.json({}, 400);
          } else {
            res.json(group, 200);
          }
        });
      }
    });
  } else {
    res.json({}, 400);
  }
});

app.get('/groups/delete', checkAuthenticated, function(req, res) {
  var group_id = req.param('group_id') || null;
  if (group_id) {
    Group.remove({_id: group_id}, function(err) {
      var code = err ? 400 : 200;
      res.json({}, code);
    });
  } else {
    res.json({}, 400);
  }
});

app.get('/groups/update', checkAuthenticated, function(req, res) {
  var group_id = req.param('group_id') || null;
  var group_name = req.param('name') || null;
  if (group_id) {
    Group.findById(group_id, function(err, doc) {
      if (!err) {
        if (group_name) {
          doc.name = group_name;
        }
        doc.save(function(err) {
          res.json(doc, 200);
        });
      } else {
        res.json({}, 400);
      }
    });
  }
});

app.get('/groups/:group_id', checkAuthenticated, function(req, res) {
  res.render('amount', {group_id: req.params.group_id});
});

app.get('/groups/:group_id/users', checkAuthenticated, function(req, res) {
  Group.findById(req.params.group_id, function(err, doc) {
    res.json(doc, 200);i
  });
});

app.get('/groups/:group_id/users/delete', checkAuthenticated, function(req, res) {
  var user_id = req.param('user_id') || null;
  if (user_id) {
    Group.findById(req.params.group_id, function(err, doc) {
      if (err) {
        res.json({}, 400);
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
            res.json({}, 400);
          } else {
            res.json(doc, 200);
          }
        });
      }
    });
  } else {
    res.json({}, 400);
  }
});

app.get('/groups/:group_id/users/add', checkAuthenticated, function(req, res) {
  var user_id = req.param('id') || null;
  var user_name = req.param('name') || null;
  var user_amount = req.param('amount') || null;

  if (user_id && user_name && user_amount) {
    Group.findById(req.params.group_id, function(err, doc) {
      if (err) {
        res.json({}, 400);
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
            res.json({}, 400);
          } else {
            res.json(doc, 200);
          }
        });
      }
    });
  } else {
    res.json({}, 400);
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
        res.json({}, 400);
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
            res.json({}, 400);
          } else {
            res.json(doc, 200);
          }
        });
      }
    });
  } else {
    res.json({}, 400);
  }
});

app.get('/groups/:group_id/tabout', checkAuthenticated, function(req, res) {
  Group.findById(req.params.group_id, function(err, doc) {
    if (err) {
      res.json({}, 400);
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

      var numPpl = users.length;
      var total = 0;
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

      res.json(ot.troupTable, 200);
    }
  });
});

app.get('/amount', checkAuthenticated, function(req, res){
});

process.on('uncaughtException', function(err) {
  log.error(err);
});

mongooseAuth.helpExpress(app);
app.listen(process.env.NODE_ENV === 'production' ? 80 : 3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
