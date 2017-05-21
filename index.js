// Declare our needed variables
const express = require('express');
const morgan = require('morgan');
const nunjucks = require('nunjucks');
const stylus = require('stylus');
const fs = require('fs');
const rfs = require('rotating-file-stream');
const path = require('path');
const request = require('request');
const app = express();
const rtURL = 'https://www.rottentomatoes.com/search/?search=';

// Get logging going
const logDirectory = path.join(__dirname, 'logs');
fs.existsSync(logDirectory) || fs.mkdirSync(logDirectory);
const accessLogStream = rfs('access.log', {
	interval: '1d',
	path: logDirectory
});
app.use(morgan('combined', { stream: accessLogStream }));

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

// Load site configuration
const config = JSON.parse(fs.readFileSync('config.json'));

app.get('/', (req, res) => {
	res.render('index.njk', config);
});

app.get('/film/:searchTerms', (req, res) => {
	const searchTerms = req.params.searchTerms.replace(/%20/g, ' ');
	request.get(rtURL + req.url.substring(6), { timeout: 5000 }, (err, response, html) => {
		if (err || response.statusCode !== 200) {
			res.render('oops.njk', config);
			console.log(new Error(err));
		} else if (response.statusCode === 200 && html.indexOf('Sorry, no results found') === -1) {
			const anchorString = searchTerms + '\', ';
			var searchData = html.substring(html.indexOf(anchorString) + anchorString.length);
			searchData = searchData.substring(0, searchData.indexOf(');'));
			res.render('result-list.njk', {
				site: config.site,
				movies: JSON.parse(searchData).movies
			});
		} else {
			res.render('nothing-found.njk', config);
		}
	});
});

app.get('/css/normalize.min.css', (req, res) => {
	// res.redirect('https://cdnjs.cloudflare.com/ajax/libs/normalize/7.0.0/normalize.min.css');
	res.sendFile(path.join(__dirname, '/node_modules/normalize.css/normalize.css'));
});

app.get('/js/jquery.min.js', (req, res) => {
	res.sendFile(path.join(__dirname, '/node_modules/jquery/dist/jquery.min.js'));
});

app.get('/:extension(css|js)/materialize.*', (req, res) => {
	res.sendFile(path.join(__dirname, '/node_modules/materialize-css/bin/materialize.' + req.params.extension));
	// require('fs').createReadStream(path.join(__dirname, '/node_modules/materialize-css/bin/materialize.' + req.params.extension)).pipe(res);
});

// Turn on listening
app.listen(3000, function () {
	console.log('Example app listening on port 3000!');
});
