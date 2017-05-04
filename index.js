// Declare our needed variables
const express = require('express');
const nunjucks = require('nunjucks');
const stylus = require('stylus');
const path = require('path');
const request = require('request');
const async = require('async');
const fs = require('fs');
const app = express();
const apiKeyPath = path.join(__dirname, '/api.key');
const tmdbJSON = path.join(__dirname, '/moviedb.json');
const rtURL = 'https://www.rottentomatoes.com/search/?search=';

// Set up moviedb
if (!fs.existsSync(apiKeyPath)) {
	console.log(new Error('API key file not found.  Please save your TMDb api key in a file called "api.key" at the root of the project.'));
	process.exit(1);
}
const moviedb = require('moviedb')(fs.readFileSync(apiKeyPath).toString().replace(/\r?\n|\r/g, ''));

async.series([
	(callback) => {
		fs.readFile(tmdbJSON, (err, data) => {
			if (err) {
				callback(err, getTMDbConfig());
			} else {
				data = JSON.parse(data);
				data.stale = true;
				callback(null, data);
			}
		});
	}
], (err, tmdbConfig) => {
	tmdbConfig = tmdbConfig[0];
	// if (err) console.log(new Error(err));

	if (tmdbConfig && tmdbConfig.stale) tmdbConfig = getTMDbConfig() || tmdbConfig;

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

	app.get('/film/:searchTerms', (req, res) => {
		const searchTerms = req.params.searchTerms.replace(/%20/g, ' ');
		async.parallel([
			(callback) => {
				request(rtURL + req.url.substring(6), (err, response, html) => {
					if (!err && response.statusCode === 200) {
						const anchorString = searchTerms + '\', ';
						var searchData = html.substring(html.indexOf(anchorString) + anchorString.length);
						searchData = searchData.substring(0, searchData.indexOf(');'));
						callback(null, JSON.parse(searchData).movies);
					} else {
						callback(err || 'Invalid response from RT: ' + response.statusCode);
					}
				});
			},
			(callback) => {
				moviedb.searchMovie({ query: searchTerms }, (err, data) => {
					if (!err) {
						console.log(JSON.stringify(data.results, null, 2));
						callback(null, data.results.sort((a, b) => {
							if (a.popularity < b.popularity) return -1;
							if (a.popularity > b.popularity) return 1;
							return 0;
						}));
					} else {
						callback(err);
					}
				});
			}
		], (err, results) => {
			if (!err) {
				async.each(results[0], (rtMovie, outerCallback) => {
					async.each(results[1], (dbMovie, innerCallback) => {
						if (dbMovie.release_date.indexOf(rtMovie.year) !== -1) {
						// if (dbMovie.title === rtMovie.name || dbMovie.release_date.indexOf(rtMovie.year) !== -1) {
							rtMovie.posterURL = tmdbConfig.images.base_url + tmdbConfig.images.poster_sizes[2] + dbMovie.poster_path;
							rtMovie.overview = dbMovie.overview;
							rtMovie.popularity = dbMovie.popularity;
						}
						innerCallback();
					}, (err) => {
						outerCallback(err);
					});
				}, (err) => {
					if (!err) {
						res.render('result-list.njk', { movies: results[0] });
					} else {
						res.render('oops.njk');
						console.log(new Error(err));
					}
				});
			}
		});
	});

	app.get('/css/normalize.css', (req, res) => {
		// res.redirect('https://cdnjs.cloudflare.com/ajax/libs/normalize/7.0.0/normalize.min.css');
		require('fs').createReadStream('./node_modules/normalize.css/normalize.css').pipe(res);
	});

	app.get('/:extension(css|js)/materialize.*', (req, res) => {
		require('fs').createReadStream(path.join(__dirname, '/node_modules/materialize-css/bin/materialize.' + req.params.extension)).pipe(res);
	});

	// Turn on listening
	app.listen(3000, function () {
		console.log('Example app listening on port 3000!');
	});
});

function getTMDbConfig () {
	moviedb.configuration((err, config) => {
		if (err) return null;
		fs.writeFile(tmdbJSON, JSON.stringify(config, null, 2), (err) => {
			if (err) console.log(new Error(err));
			return config[0];
		});
	});
}
