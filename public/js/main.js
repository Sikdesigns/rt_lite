// @source: https://raw.githubusercontent.com/gabeotisbenson/rt_lite/master/public/js/main.js
// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later

/* global $ */

$(document).ready(function () {
	$('input[name=search]').keyup(function (event) {
		if (event.keyCode === 13) {
			$(this).blur();
			$.get(document.URL + (document.URL[document.URL.length - 1] === '/' ? '' : '/') + 'film/' + $('input[name=search]').val().replace(/\s/g, '-'), function (data) {
				$('main').html(data);
			});
			$('main').html('<div class="row"><p class="center s12 l6 offset-l3">Calling Rotten Tomatoes...</p></div>');
		}
	});
});

// @license-end
