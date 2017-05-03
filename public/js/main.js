/* global $ */

$(document).ready(function () {
	$('input[name=search]').keyup(function (event) {
		if (event.keyCode === 13) {
			$.get('/film/' + $('input[name=search]').val(), function (data) {
				$('main').html(data);
			});
			$('main').html('<p class="fetching">Calling Rotten Tomatoes...</p>');
		}
	});
});

$(document).on('load', 'div.card-image img', function () {
	console.log($(this).attr('title'));
});
