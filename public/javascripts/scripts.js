 $(document).ready(function() {
	
	/* Display existing groups */
	if(myId) {
		var groupUrl = "/users/"+myId+"/groups";
	
		$.getJSON(groupUrl, function(r) {

			for (var i=0; i<r.length; i++) {
				var id = r[i]._id;
				var name = r[i].name;
				var url = r[i].url;
				$("#tabGroupList").append("<li id='"+id+"'><a href=' "+ url +" '>" + name + "</a></li>");
			}
		});
	}

	
	/* "About" Modal */
	$("#about").click(function (e) {
		e.preventDefault();
		
		console.log("about");
		openDialog();
		
		$('.close-dialog-button').click(function (e) {
			e.preventDefault();
			$('#scrim, #dialog').hide();
		});
	});
	
	/* Create a group and send he name of the group */
	$("#createGroupButton").click(function (e) {	
	//$("#groupname").keyup(function () {	
		var groupname = $("#groupname").val();
		console.log(groupname);
		
        $.ajax({
            url: "/groups/create",
            data: "name=" + groupname,
            success: function (r) {
				console.log("Success creating a group!");
				var groupId = r._id;
				console.log(groupId);
				$("#createGroupButton").val("Created");
				$("#createGroupButton").attr("disabled", "true");
               	addMember(groupId);
            }
        });		

	});
	
	/* Adding each member in the group just create */
	function addMember (groupId) {
		
		this.timer = setTimeout(function () {
			$("#addNumber").css("display","block");
		 }, 300);
		
		$("#numPeople").change(function () {	
			var num = $("#numPeople").val();
			
			this.timer2 = setTimeout(function () {
				
				// reset the displayed fields
				$('#memberInputs').empty();
				
				// display fields
				for (var i=0; i<num; i++) {
					var inputValue = (i === 0) ? myId : "";
					
					$('#memberInputs').append('<div class="number-input"><input type="text" value="'+inputValue+'" name="member'+i+'" placeholder="Twitter ID or Email" class="addMemberButton'+i+'input" /> <input type="button" id="addMemberButton'+i+'" value="Add"></div>');
				}
				
				$("#addPeople").css("display","block");
			
				$('input[id^="addMemberButton"]').click(function (e) {
					
					console.log($("#"+this.id));
					console.log(this.id);
					
					//var twitterId = $('input[name^="member"]').val();
					var twitterId = $("."+this.id+"input").val();
					console.log(twitterId);
					
					var url = "/groups/"+groupId+"/users/add";
					var data = "id="+twitterId+"&name="+twitterId+"&amount=0";
					console.log(data);
				
					var thisButton = $("#"+this.id);
				
				// add each person
				 $.ajax({
			            url: url,
			            data: data,
			            success: function () {
			               	thisButton.val("Added");
							thisButton.attr("disabled", "true");

							console.log("Success adding a member!");
			            }
			     });
			
				// go to the created group page
				$("#finalizeGroupButton").click(function () {
					window.location.href ="/groups/"+groupId;
				});
				
				
			});
		});
	});
	}

	function openDialog () {
		// Scrim
		var scrimHeight = $(document).height();
		var scrimWidth = $(window).width();
		$("#scrim").css({"width":scrimWidth, "height":scrimHeight});
		$("#scrim").fadeIn(700);    
		
		var winHeight = $(window).height();
       var winWidth = $(window).width();
		
		$("#dialog").css("top",  winHeight/2 - $("#dialog").height()/2);
		$("#dialog").css("left", winWidth/2 - $("#dialog").width()/2);

		$("#dialog").fadeIn(800);
	}
});
