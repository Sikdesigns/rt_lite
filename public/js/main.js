/* global $ */

$(document).ready(function () {
	$('input[name=search]').keyup(function (event) {
		if (event.keyCode === 13) {
			$.get('/film/' + $('input[name=search]').val(), function (data) {
				$('main').html(data);
			});
			$('main').html('<p>Fetching...</p>');
		}
	});
});
