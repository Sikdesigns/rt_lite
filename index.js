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
const util = require('util');

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
	res.render('page.njk', config);
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
