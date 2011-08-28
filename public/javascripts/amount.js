$(document).ready(function() {
  getUsers(groupId);
});

function getUsers(groupId) {
  $.ajax({
    url: '/groups/'+groupId+'/users',
    success: function( data ) {
      data.users.forEach(function(user) {
        $label = $(document.createElement('label'));
        $label.text(user.name+' ('+user.id+')');
        $('#groupUsers').append($label);

        $input = $(document.createElement('input'));
        var inputId = user.id+'-amount';
        console.log(inputId);
        $input.attr('id', inputId);
        $input.attr('type', 'text');
        $input.val(user.amount);
        $('#groupUsers').append($input);

        $updateButton = $(document.createElement('button'));
        $updateButton.text('Update');
        $updateButton.click(function() {
          var amount = $('#'+inputId).val();
          updateAmount(groupId, user._id, user.name, amount);
        });
        $('#groupUsers').append($updateButton);
      });

      getTabOut(groupId);
    }
  });
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

      $table = $(document.createElement('table'));
      $table.attr('id', 'taboutTable');
      $('#tabout').append($table);

      $thead = $(document.createElement('thead'));
      $table.append($thead);

      $tr = $(document.createElement('tr'));
      $thead.append($tr);

      $th = $(document.createElement('th'));
      $th.text('');
      $tr.append($th);

      headers = Object.keys(data);
      headers.forEach(function(header) {
        $th = $(document.createElement('th'));
        $th.text(header);
        $tr.append($th);
      });

      $tbody = $(document.createElement('tbody'));
      $table.append($tbody);

      for(var i = 0; i < headers.length; i++) {
        $tr = $(document.createElement('tr'));
        $tbody.append($tr);
        var row = headers[i];

        $td = $(document.createElement('td'));
        $td.text(row);
        $tr.append($td);

        for(var j = 0; j < headers.length; j++) {
          var column = headers[j];
          $td = $(document.createElement('td'));
          $td.text(data[row][column]);
          $tr.append($td);
        }
      }
    }
  });
}
