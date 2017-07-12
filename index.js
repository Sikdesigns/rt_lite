// Declare our needed variables
const express = require('express');
const bodyParser = require('body-parser');
const compression = require('compression');
const minify = require('express-minify');
const minifyHTML = require('express-minify-html');
const morgan = require('morgan');
const nunjucks = require('nunjucks');
const stylus = require('stylus');
const fs = require('fs');
const rfs = require('rotating-file-stream');
const path = require('path');
const request = require('request');
const app = express();
const rtURL = 'https://www.rottentomatoes.com/search/?search=';

// Set up caching of new and top box office movies from RT
var openingMovies = JSON.parse(fs.readFileSync('openingMovies.json'));
var topBoxMovies = JSON.parse(fs.readFileSync('topBoxMovies.json'));
function cacheMovies () {
	const cheerio = require('cheerio');
	request('https://www.rottentomatoes.com/', (err, response, body) => {
		if (err) {
			fs.appendFile('logs/cache-error.log', err, (err) => {
				if (err) console.error(new Error(err));
			});
		} else {
			var $ = cheerio.load(body);
			var openingArr = [];
			var topBoxArr = [];
			$('table#Opening.movie_list tbody tr').each(function (i, movie) {
				var name = $('td.middle_col a', this).text();
				var meterScore = $('td.left_col a span.tMeterScore', this).text().replace('%', '');
				var meterClass;
				if (meterScore >= 60) {
					meterClass = 'fresh';
				} else if (meterScore !== '') {
					meterClass = 'rotten';
				} else {
					meterClass = 'no-consensus';
				}
				openingArr[i] = {
					name: name,
					meterScore: meterScore,
					meterClass: meterClass
				};
			});
			$('table#Top-Box-Office.movie_list tbody tr').each(function (i, movie) {
				var name = $('td.middle_col a', this).text();
				var meterScore = $('td.left_col a span.tMeterScore', this).text().replace('%', '');
				var meterClass;
				if (meterScore >= 60) {
					meterClass = 'fresh';
				} else if (meterScore !== '') {
					meterClass = 'rotten';
				} else {
					meterClass = 'no-consensus';
				}
				topBoxArr[i] = {
					name: name,
					meterScore: meterScore,
					meterClass: meterClass
				};
			});
			fs.writeFile('openingMovies.json', JSON.stringify(openingArr), (err) => {
				if (err) fs.appendFile('logs/cache-error.log', err);
			});
			openingMovies = openingArr;
			fs.writeFile('topBoxMovies.json', JSON.stringify(topBoxArr), (err) => {
				if (err) fs.appendFile('logs/cache-error.log', err);
			});
			topBoxMovies = topBoxArr;
		}
	});
}
cacheMovies();
const schedule = require('node-schedule');
schedule.scheduleJob('0 * * * *', cacheMovies);

// Load site configuration
const config = JSON.parse(fs.readFileSync('config.json'));

// Get logging going
const rfsArgs = {
	interval: '1d',
	path: path.join(__dirname, 'logs'),
	compress: true
};
fs.existsSync(rfsArgs.path) || fs.mkdirSync(rfsArgs.path);
const accessLogStream = rfs('access.log', rfsArgs);
const errorLogStream = rfs('error.log', rfsArgs);
// app.use(morgan('combined', { stream: accessLogStream }));
app.use(morgan((tokens, req, res) => {
	return [
		tokens.method(req, res),
		tokens.url(req, res),
		tokens.status(req, res)
	];
}, {
	stream: accessLogStream
}));

// Turn on form processing
app.use(bodyParser.urlencoded({ extended: false }));

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
	noCache: config.site.devMode,
	express: app
});

// Turn on compression, minify, and static folder
app.use(compression());
app.use(minify());
app.use(minifyHTML({
	override: !config.site.devMode,
	exception_url: false,
	htmlMinifer: {
		removeComments: true,
		collapseWhitespace: true,
		collapseBooleanAttributes: true,
		removeAttributeQuotes: true,
		removeEmptyAttributes: true,
		minifyJS: true
	}
}));
app.use(express.static('public'));

app.get('/', (req, res) => {
	res.render('index.njk', {
		site: config.site,
		openingMovies: openingMovies,
		topBoxMovies: topBoxMovies
	});
});

app.post('/', (req, res) => {
	getMovies(req.body.search, (err, movies) => {
		if (err) {
			res.render('no-response.njk', config);
		} else {
			res.render('search-results.njk', {
				site: config.site,
				movies: movies,
				searchTerms: req.body.search
			});
		}
	});
});

app.get('/film/:searchTerms', (req, res) => {
	getMovies(req.params.searchTerms, (err, movies) => {
		if (err) {
			res.render('_messages/dead-line.njk', config);
		} else {
			res.render('_partials/result-list.njk', {
				site: config.site,
				movies: movies
			});
		}
	});
});

app.get('/privacy', (req, res) => {
	res.render('privacy.njk', config);
});

app.all(/.*/, (req, res) => {
	res.status(404).render('404.njk', config);
});

// Turn on listening
app.listen(3000);

function getMovies (searchTerms, callback) {
	searchTerms = searchTerms.trim().replace(/%20/g, ' ');
	request.get(rtURL + searchTerms, { timeout: 5000 }, (err, response, html) => {
		if (response.statusCode === 200 && html.indexOf('Sorry, no results found') === -1) {
			const anchorString = searchTerms + '\', ';
			var searchData = html.substring(html.indexOf(anchorString) + anchorString.length);
			searchData = searchData.substring(0, searchData.indexOf(');'));
			callback(err, JSON.parse(searchData).movies);
		} else {
			callback(err, {});
		}
	});
}
