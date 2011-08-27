 $(document).ready(function() {
	$("#authButton").click(function() {
		console.log("auth button clicked");
	    // Open a modal to login on twitter
	
		// Scrim
		var scrimHeight = $(document).height();
		var scrimWidth = $(window).width();
		$("#scrim").css({"width":scrimWidth, "height":scrimHeight});
		$("#scrim").fadeIn(700);    
		
		var winHeight = $(window).height();
       var winWidth = $(window).width();
		
		$("#dialog").css('top',  winHeight/2 - $("#dialog").height()/2);
		$("#dialog").css('left', winWidth/2 - $("#dialog").width()/2);

		$("#dialog").fadeIn(800);

		$('.close-dialog-button').click(function (e) {
			e.preventDefault();
			$('#scrim, #dialog').hide();
		});
	});
});