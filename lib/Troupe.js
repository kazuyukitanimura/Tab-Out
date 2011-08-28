var util = require('util');
var User = require('./User');

Array.prototype.sum = function(){
  return this.reduce(function(x, y){
    return x + y; 
  });
}

var genSquareZeroTable = function(n){
  var newTable = [];

  for(var i=0; i<n; i++){
    newTable.push([]);
    for(var j=0; j<n; j++){
      newTable[i][j] = 0;
    }
  }

  return newTable;
};

var Troupe = module.exports = function(users, oweTable){
  if(! Array.isArray(users)){
    users = [users];
  }

  var user_ids   = users.map(function(user){return user.user_id;});

  var troupTable = this.troupTable = {};
  // check duplicated users
  for(var i=users.length; i--;){
    troupTable[user_ids[i]] = {data: users[i]};
  }
  
  var numPpl = this.numPpl = Object.keys(troupTable).length;

  if(Array.isArray(oweTable)){
    if(numPpl !== oweTable.length){
      console.error('ERROR: Users-oweTable Missmatch');
      return null;
    }
  }else if(oweTable === undefined){
    oweTable = genSquareZeroTable(numPpl);
  }else{
    console.error('ERROR: Unknown oweTable');
    return null;
  }

  for(var i=numPpl; i--;){
    for(var j=numPpl; j--;){
      troupTable[user_ids[i]][user_ids[j]] = oweTable[i][j];
    }
  }
};

Troupe.prototype.print = function(){
  var numPpl     = this.numPpl;
  var troupTable = this.troupTable;
  var user_ids   = Object.keys(troupTable);

  console.dir(user_ids.map(function(i){
    return user_ids.map(function(j){
      return troupTable[i][j];
    });
  }));

  console.log("subtotals");
  console.dir(user_ids.map(function(i){
    return troupTable[i].data.username + ': ' +  user_ids.map(function(j){return troupTable[i][j];}).sum();
  }));
  console.log('');
};

Troupe.prototype.addUsers = function(users){
  if(! Array.isArray(users)){
    users = [users];
  }

  var troupTable = this.troupTable;
  // check duplicated users
  for(var i=users.length; i--;){
    if(troupTable[users[i].user_id] !== undefined){
      return false;
    }
  }
  for(var i=users.length; i--;){
    troupTable[users[i].user_id] = {data: users[i]};
  }
  
  var user_ids = Object.keys(troupTable);
  var numPpl   = this.numPpl = user_ids.length;

  for(var i=numPpl; i--;){
    for(var j=numPpl; j--;){
      if(troupTable[user_ids[i]][user_ids[j]] === undefined){
        troupTable[user_ids[i]][user_ids[j]] = 0;
      }
    }
  }

  this.numPpl = numPpl;

  return true;
};

Troupe.prototype.delUsers = function(users){
  if(! Array.isArray(users)){
    users = [users];
  }

  var troupTable = this.troupTable;
  var user_ids   = Object.keys(troupTable);
  var numPpl     = user_ids.length;

  var user_idsD  = users.map(function(user){return user.user_id;});
  var numPplD    = user_idsD.length;

  for(var i=numPpl; i--;){
    for(var j=numPplD; j--;){
      if(troupTable[user_ids[i]][user_idsD[j]]!==0 || troupTable[user_idsD[j]][user_ids[i]]!==0){
        return false; // del users still have to pay / receive or users do not exist in the Troupe
      }
    }
  }
  for(var i=numPpl; i--;){
    for(var j=numPplD; j--;){
      delete troupTable[user_ids[i]][user_idsD[j]];
    }
  }
  for(var j=numPplD; j--;){
    delete troupTable[user_idsD[j]];
  }

  this.numPpl = numPpl;

  return true;
};

Troupe.prototype.charge = function(payer, payee, amount){
  if(! (payer instanceof User && payee instanceof User && typeof amount==='number')){
    return false;
  }

  var troupTable = this.troupTable;

  if(troupTable[payer.user_id]===undefined || troupTable[payee.user_id]===undefined){
    return false; // one of payer or payee is not in the Troupe
  }
  
  troupTable[payer.user_id][payee.user_id] += amount;

  return true;
};

Troupe.prototype.pay = function(payer, payee, amount){
  if(! (payer instanceof User && payee instanceof User && typeof amount==='number')){
    return false;
  }

  var troupTable = this.troupTable;

  if(troupTable[payer.user_id]===undefined || troupTable[payee.user_id]===undefined){
    return false; // one of payer or payee is not in the Troupe
  }
  
  if(troupTable[payer.user_id][payee.user_id] < amount){
    return false; // cannot pay more than the charge 
  }

  troupTable[payer.user_id][payee.user_id] -= amount;

  return true;
};

// Optimization: minimize the # of edges O(N**2 *logN)
// optimization guarantees that the graph is a bipartite graph, i.e. the graph diameter is 1
Troupe.prototype.optimize = function(){
  var troupTable = this.troupTable;
  var user_ids   = Object.keys(troupTable);
  var numPpl     = this.numPpl;
  var subTotals  = {};

  var users      = user_ids.map(function(user){return troupTable[user].data});
  var newTroupe  = new Troupe(users);
  var newTable   = newTroupe.troupTable;

  for(var i=0; i<numPpl; i++){
    var subtotal = 0;
    for(var j=0; j<numPpl; j++){
      subtotal += troupTable[user_ids[i]][user_ids[j]] - troupTable[user_ids[j]][user_ids[i]];
    }
    subTotals[user_ids[i]] = subtotal;
  }

  for(;;){
    user_ids.sort(function(i, j){
      return subTotals[i] - subTotals[j];
    });

    var owner = user_ids[numPpl-1]; // pay
    var ownee = user_ids[0]; // receive
    var minOwe = Math.min(subTotals[owner], -subTotals[ownee]);

    if(minOwe === 0){
      break;
    }

    newTable[owner][ownee] =  minOwe;
    subTotals[owner] -= minOwe;
    subTotals[ownee] += minOwe;
  }

  newTroupe.troupTable = newTable;

  return newTroupe;
};
