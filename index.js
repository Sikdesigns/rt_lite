// Declare our needed variables
const express = require('express');
const nunjucks = require('nunjucks');
const stylus = require('stylus');
const path = require('path');
const request = require('request');
const async = require('async');
const fs = require('fs');
const app = express();

// Set up themoviedb
const apiKey = fs.readFileSync('api.key').toString().replace(/\r?\n|\r/g, '');
const moviedbConfig = JSON.parse(fs.readFileSync('moviedb.json'));
request('https://api.themoviedb.org/3/configuration?api_key=' + apiKey, (err, response, data) => {
	if (!err && response.statusCode === 200) {
		fs.writeFile('moviedb.json', data, (err) => {
			if (err) console.log(new Error(err));
		});
	}
});

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
			searchData = JSON.parse(searchData).movies;
			async.each(searchData, (movie, callback) => {
				const movieURL = 'https://api.themoviedb.org/3/search/movie?api_key=' + apiKey + '&language=en-US&page=1&include_adult=false' + '&query=';
				request.get(movieURL + movie.name, (err, response, movieData) => {
					movieData = JSON.parse(movieData).results[0];
					if (!err && response.statusCode === 200) {
						if (movieData) {
							movie.image = moviedbConfig.images.secure_base_url + moviedbConfig.images.backdrop_sizes[0] + movieData.backdrop_path;
							movie.overview = movieData.overview;
						}
						callback();
					}
				});
			}, (err) => {
				if (err) console.log(new Error(err));
				res.render('result-list.njk', { movies: searchData });
			});
		}
	});
});

app.get('/css/normalize.css', (req, res) => {
	require('fs').createReadStream('./node_modules/normalize.css/normalize.css').pipe(res);
});

app.get('/:extension(css|js)/materialize.*', (req, res) => {
	require('fs').createReadStream(path.join(__dirname, '/node_modules/materialize-css/bin/materialize.' + req.params.extension)).pipe(res);
});

// Turn on listening
app.listen(3000, function () {
	console.log('Example app listening on port 3000!');
});
