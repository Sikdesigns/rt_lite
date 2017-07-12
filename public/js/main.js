// @source: https://raw.githubusercontent.com/gabeotisbenson/rt_lite/master/public/js/main.js
// @license magnet:?xt=urn:btih:1f739d935676111cfff4b4693e3816e664797050&dn=gpl-3.0.txt GPL-v3-or-Later

/* global $ */

$(document).ready(function () {
	$('form').on('submit', function (e) {
		$('input[name=search]').blur();
		var searchTerms = $('input[name=search]').val().trim().replace(/\s/g, '-').replace(/'/g, '');
		$.get(document.URL + (document.URL[document.URL.length - 1] === '/' ? '' : '/') + 'film/' + searchTerms, function (data) {
			$('main').html(data);
		});
		$('main').html('<div class="row"><p class="center s12 l6 offset-l3">Calling Rotten Tomatoes...</p></div>');
		return false;
	});
});

// @license-end
