/* global $ */

$(document).ready(function () {
	$('input[name=search]').keyup(function (event) {
		if (event.keyCode === 13) {
			$.get('/film/' + $('input[name=search]').val(), function (data) {
				$('main').html(data);
			});
			$('main').html('<div class="row"><p class="center s12 l6 offset-l3">Calling Rotten Tomatoes...</p></div>');
		}
	});
});

$(document).on('load', 'div.card-image img', function () {
	console.log($(this).attr('title'));
});
