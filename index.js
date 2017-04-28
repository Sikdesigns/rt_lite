// Declare our needed variables
const express = require('express');
const nunjucks = require('nunjucks');
const stylus = require('stylus');
const path = require('path');
const request = require('request');
const app = express();

// Turn on stylus autocompiling
app.use(stylus.middleware({
	src: path.join(__dirname, '/resources'),
	dest: path.join(__dirname, '/public'),
	force: false,
	compress: true
}));

// Get nunjucks going
nunjucks.configure('views', {
	autoescape: true,
	noCache: true,
	express: app
});

// Turn on public folder
app.use(express.static('public'));

app.get('/', (req, res) => {
	res.render('index.njk');
});

app.get(/\/film\/.*/, (req, res) => {
	request('https://www.rottentomatoes.com/search/?search=' + req.url.substring(6), (err, response, html) => {
		if (!err && response.statusCode === 200) {
			const anchorString = req.url.substring(6).replace(/%20/g, ' ') + '\', ';
			var searchData = html.substring(html.indexOf(anchorString) + anchorString.length);
			searchData = searchData.substring(0, searchData.indexOf(');'));
			searchData = JSON.parse(searchData);
			res.render('result-list.njk', { movies: searchData.movies });
		}
	});
});

// Turn on listening
app.listen(3000, function () {
	console.log('Example app listening on port 3000!');
});
