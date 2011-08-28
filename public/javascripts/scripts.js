 $(document).ready(function() {
	
	/* "About" Modal */
	$("#about").click(function(e) {
		e.preventDefault();
		
		openDialog();
		
		$('.close-dialog-button').click(function (e) {
			e.preventDefault();
			$('#scrim, #dialog').hide();
		});
	});
	
	/* Create a group */
	$("#createGroupButton").click(function (e) {	
	//$("#groupname").keyup(function () {	
		var groupname = $("#groupname").val();
		console.log(groupname);
		
        $.ajax({
            url: "/groups/create",
            data: "name=" + groupname,
            //type: "post",
            success: function () {
				console.log("Success!");
               	addMember();
            }
        });		

	});
	
	function addMember () {
		this.timer = setTimeout(function () {
			$("#addNumber").css("display","block");
		 }, 300);
		
		$("#numPeople").change(function () {	
				var num = $("#numPeople").val();
				console.log(num);
				this.timer2 = setTimeout(function () {
				$('#memberInputs').empty();
				for (var i=0; i<num; i++) {
					$('#memberInputs').append('<div class="number-input"><input type="text" id="user_id"' +i+ ' placeholder="Twitter ID or Email" /><input type="submit" id="addMemberButton" value="Add"></div>');
				}
				$("#addPeople").css("display","block");
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