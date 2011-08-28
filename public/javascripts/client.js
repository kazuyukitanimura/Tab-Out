$(function(){
  var socket = io.connect();
  $('#signup input.submit').live('vclick', function(event){
    var username         = $('#signup input.username').val();
    var password         = $('#signup input.password').val();
    var first_name       = $('#signup input.first_name').val();
    var last_name        = $('#signup input.last_name').val();
    var twitter_username = $('#signup input.twitter_username').val();
    var email            = $('#signup input.email').val();
    var data = {username: username, password: password, first_name: first_name, last_name: last_name, twitter_username: twitter_username, email: email};
    socket.json.emit('signup', data);
  });

  $('#signdown input.submit').live('vclick', function(event){
    var password = $('#signdown input.password').val();
    var data = {password: password};
    socket.json.emit('signdown', data);
  });

  $('#login input.submit').live('vclick', function(event){
    var username = $('#login input.username').val();
    var password = $('#login input.password').val();
    var data = {username: username, password: password};
    socket.json.emit('login', data);
  });

  $('#logout input.submit').live('vclick', function(event){
    var data = {};
    socket.json.emit('logout', data);
  });

  $('#chpw input.submit').live('vclick', function(event){
    var password      = $('#chpw input.password').val();
    var new_password  = $('#chpw input.new_password').val();
    var new_password2 = $('#chpw input.new_password2').val();
    var data = {password: password, new_password: new_password};
    if(new_password === new_password2){
      socket.json.emit('chpw', data);
    }else{
      console.error('?');
    }
  });

  socket.on('fail', function(data){
    console.log(data);
  });

  socket.on('success', function(data){
    console.log(data);
    $.mobile.changePage('#index');
  });
});

$(document).bind("mobileinit", function(){
  //apply overrides here
});
