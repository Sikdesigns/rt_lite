// Declare our needed variables
const express = require('express');
const cheerio = require('cheerio');
const request = require('request');
const async = require('async');
const app = express();

app.get('/', (req, res) => {
	request('https://www.rottentomatoes.com/', (err, response, body) => {
		var $ = cheerio.load(body);
		var openingArr = [];
		var topBoxArr = [];
		$('table#Opening.movie_list tbody tr').each(function (i, movie) {
			openingArr[i] = {
				title: $(this).find('td.middle_col a').text(),
				score: $(this).find('td.left_col a span.tMeterScore').text().replace('%', '')
			};
		});
		$('table#Top-Box-Office.movie_list tbody tr').each(function (i, movie) {
			topBoxArr[i] = {
				title: $('td.middle_col a', this).text(),
				score: $('td.left_col a span.tMeterScore', this).text().replace('%', '')
			};
		});
		res.send('<pre>' + JSON.stringify(openingArr, null, 2) + JSON.stringify(topBoxArr, null, 2) + '</pre>');
	});
});

// Turn on listening
app.listen(3000);
