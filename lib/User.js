var User = module.exports = function(userObj){
  if(userObj===undefined || userObj.username===undefined || userObj.user_id===undefined){
    console.error('ERROR: Some User Properties Are Missing');
    return null;
  }

  this.username         = userObj.username;
  this.first_name       = userObj.first_name;
  this.last_name        = userObj.last_name;
  this.user_id          = userObj.user_id;
  this.twitter_id       = userObj.twitter_id;
  this.email            = userObj.email;
  this.twitter_username = userObj.twitter_username;
  this.full_name        = userObj.full_name;
  this.facebook_id      = userObj.facebook_id;
  this.img_url          = userObj.img_url;
};
