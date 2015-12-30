var http = require('http');
var spawn = require('child_process').spawn;
var path = require('path');
var accesslog = require('access-log');
var GitHttp = require('git-http');
var path = require('path');
var filewalker = require('filewalker');

var opts = {
	host: process.env.GIT_HTTP_HOST || 'localhost',
	port: process.env.GIT_HTTP_PORT || 5000,
	readonly: process.env.GIT_HTTP_READONLY || true,
	repoDir: process.env.REPO_DIR || path.join(__dirname, '/repos')
};

var gitServer = new GitHttp();

populateRepos();

gitServer.on('pull', function(event){
	event.allow();
});

gitServer.on('push', function(event){
	if(readonly) {
		event.deny();
	} else {
		event.allow();
	}
});

function httpServerStart() {
	var server = http.createServer(onrequest).listen(opts.port, opts.host, started);
}

function started() {
	console.log('Listening on http://%s:%d in %s', opts.host, opts.port, process.cwd());
}

function onrequest(req, res) {
	accesslog(req, res);

	var repo = req.url.split('/')[1];
	var dir = path.join(__dirname, 'repos', repo);

	gitServer.handle(req, res);
}

function populateRepos() {
	console.log('Poulating repositories.');
	filewalker(opts.repoDir, { maxPending: 10, recursive: false })
	.on('dir', function(dirname) {
		var repo = '/' + dirname;
		var fsPath = path.join(__dirname, '/repos', repo);
		console.log('Adding repo ', repo + ' -> ' + fsPath);
		gitServer.addRepo(repo, fsPath);		
	})
	.on('error', function(err) {
		console.error(err);
	})
	.on('done', function() {
		console.log('Done poulating repositories. Found %d repositories.', this.dirs);
		httpServerStart();
	})
	.walk();
}