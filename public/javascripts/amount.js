$(function() {
  getUsers(groupId);
});

function getUsers(groupId) {
  $.ajax({
    url: '/groups/'+groupId+'/users',
    success: function( data ) {
      data.users.forEach(function(user) {
        var label = $(document.createElement('label'));
        label.text(user.name+' ('+user.id+')');
        $('#groupUsers').append(label);

        $('#groupUsers').append($('<span>$</span>'));

        var input = $(document.createElement('input'));
        var inputId = user.id+'-amount';
        console.log(inputId);
        input.attr('id', inputId);
        input.attr('type', 'text');
        input.val(user.amount);
        $('#groupUsers').append(input);

        input.keyup(function(e){
          var amount = $('#'+inputId).val();
          if(isNumber(amount)){
            updateAmount(groupId, user._id, user.name, amount);
          }
        });

        //var updateButton = $(document.createElement('button'));
        //updateButton.text('Update');
        //updateButton.click(function() {
        //  var amount = $('#'+inputId).val();
        //  updateAmount(groupId, user._id, user.name, amount);
        //});
        //$('#groupUsers').append(updateButton);
      });

      getTabOut(groupId);
    }
  });
}

function isNumber(n) {
  return !isNaN(parseFloat(n)) && isFinite(n);
}

function updateAmount(groupId, userId, userName, userAmount) {
  $.ajax({
    url: '/groups/'+groupId+'/users/update',
    data: 'user_id='+userId+'&amount='+userAmount,
    success: function( data ) {
      getTabOut(groupId);
    }
  });
}

function getTabOut(groupId) {
  $.ajax({
    url: '/groups/'+groupId+'/tabout',
    success: function( data ) {
      console.log(data);

      $('#tabout').empty();

      var table = $(document.createElement('table'));
      table.attr('id', 'taboutTable');
      $('#tabout').append(table);

      var thead = $(document.createElement('thead'));
      table.append(thead);

      var tr = $(document.createElement('tr'));
      thead.append(tr);

      var th = $(document.createElement('th'));
      th.text('');
      tr.append(th);

      var headers = Object.keys(data);
      headers.forEach(function(header) {
        var th = $(document.createElement('th'));
        th.text('to '+header);
        tr.append(th);
      });

      var tbody = $(document.createElement('tbody'));
      table.append(tbody);

      for(var i = 0; i < headers.length; i++) {
        var tr = $(document.createElement('tr'));
        tbody.append(tr);
        var row = headers[i];

        var td = $(document.createElement('td'));
        td.text('from '+row);
        tr.append(td);

        for(var j = 0; j < headers.length; j++) {
          var column = headers[j];
          var td = $(document.createElement('td'));
          td.text('$'+data[row][column].toFixed());
          tr.append(td);
        }
      }
    }
  });
}
