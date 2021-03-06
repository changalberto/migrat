var _ = require('lodash');
var assert = require('chai').assert;
var MigratProject = require('../lib/MigratProject.js');
var MigratPlanner = require('../lib/MigratPlanner.js');
var MigratState = require('../lib/MigratState.js');
var MigratPluginSystem = require('../lib/MigratPluginSystem.js');
var runlistVerifier = require('./utils/runlistVerifier.js');
var plugins = new MigratPluginSystem();

describe('MigratPlanner', function() {
	describe('.up()', function(done) {
		it('should return error if migrations cannot be read', function(done) {
			var mockProject = new MigratProject({migrationsDir: __dirname + '/doesnotexist'});
			var mockLocalState = new MigratState({});
			var mockGlobalState = new MigratState({});
			MigratPlanner.up(mockProject, plugins, mockGlobalState, mockLocalState, {}, function(err, runlist) {
				assert.instanceOf(err, Error);
				assert.match(err.message, /ENOENT/);
				done();
			});
		});
		it('should return full runlist for projects w/o any current state', function(done) {
			var mockProject = new MigratProject({migrationsDir: __dirname + '/fixtures/valid'});
			var mockLocalState = new MigratState({});
			var mockGlobalState = new MigratState({});
			MigratPlanner.up(mockProject, plugins, mockGlobalState, mockLocalState, {}, runlistVerifier(done, [
				['up', '1414006573623-first.js'],
				['up', '1414006573678-second.js'],
				['up', '1414006573679-third.all.js'],
				['up', '1414006573700-fourth.js']
			]));
		});
		it('should return empty runlist if all have been run before', function(done) {
			var mockProject = new MigratProject({migrationsDir: __dirname + '/fixtures/valid'});
			var mockLocalState = new MigratState({
				'1414006573679-third.all.js': 1414006573679
			});
			var mockGlobalState = new MigratState({
				'1414006573623-first.js': 1414006573623,
				'1414006573678-second.js': 1414006573678,
				'1414006573700-fourth.js': 1414006573700,
			});
			MigratPlanner.up(mockProject, plugins, mockGlobalState, mockLocalState, {}, runlistVerifier(done, [
				['skip', '1414006573623-first.js'],
				['skip', '1414006573678-second.js'],
				['skip', '1414006573679-third.all.js'],
				['skip', '1414006573700-fourth.js']
			]));
		});
		it('should return correct runlist when a node is partially migrated (simple)', function(done) {
			var mockProject = new MigratProject({migrationsDir: __dirname + '/fixtures/valid'});
			var mockLocalState = new MigratState({});
			var mockGlobalState = new MigratState({
				'1414006573678-second.js': 1414006573678,
				'1414006573700-fourth.js': 1414006573700
			});
			MigratPlanner.up(mockProject, plugins, mockGlobalState, mockLocalState, {}, runlistVerifier(done, [
				['up', '1414006573623-first.js'],
				['skip', '1414006573678-second.js'],
				['up', '1414006573679-third.all.js'],
				['skip', '1414006573700-fourth.js']
			]));
		});
		it('should return correct runlist when a migration has been executed on another node, but not the current', function(done) {
			var mockProject = new MigratProject({migrationsDir: __dirname + '/fixtures/valid'});
			var mockLocalState = new MigratState({});
			var mockGlobalState = new MigratState({
				'1414006573678-second.js': 1414006573678,
				'1414006573700-fourth.js': 1414006573700,
				'1414006573679-third.all.js': 1414006573679 // it should ignore this
			});
			MigratPlanner.up(mockProject, plugins, mockGlobalState, mockLocalState, {}, runlistVerifier(done, [
				['up', '1414006573623-first.js'],
				['skip', '1414006573678-second.js'],
				['up', '1414006573679-third.all.js'],
				['skip', '1414006573700-fourth.js']
			]));
		});
		it('it should return corrent runlist when containing a migration that has already run locally', function(done) {
			var mockProject = new MigratProject({migrationsDir: __dirname + '/fixtures/valid'});
			var mockLocalState = new MigratState({
				'1414006573679-third.all.js': 1414006573679
			});
			var mockGlobalState = new MigratState({
				'1414006573678-second.js': 1414006573678,
				'1414006573700-fourth.js': 1414006573700,
			});
			MigratPlanner.up(mockProject, plugins, mockGlobalState, mockLocalState, {}, runlistVerifier(done, [
				['up', '1414006573623-first.js'],
				['skip', '1414006573678-second.js'],
				['skip', '1414006573679-third.all.js'],
				['skip', '1414006573700-fourth.js']
			]));
		});
		it('should acknowledge "to" argument', function(done) {
			var mockProject = new MigratProject({migrationsDir: __dirname + '/fixtures/valid'});
			var mockLocalState = new MigratState({});
			var mockGlobalState = new MigratState({
				'1414006573678-second.js': 1414006573678
			});
			MigratPlanner.up(mockProject, plugins, mockGlobalState, mockLocalState, {
				to: '1414006573679-third.all.js'
			}, runlistVerifier(done, [
				['up', '1414006573623-first.js'],
				['skip', '1414006573678-second.js'],
				['up', '1414006573679-third.all.js']
			]));
		});
		it('should return error if "to" argument invalid', function(done) {
			var mockProject = new MigratProject({migrationsDir: __dirname + '/fixtures/valid'});
			var mockLocalState = new MigratState({});
			var mockGlobalState = new MigratState({});
			MigratPlanner.up(mockProject, plugins, mockGlobalState, mockLocalState, {to: '1414006573678-doesnotexist.js'}, function(err, runlist) {
				assert.instanceOf(err, Error);
				assert.match(err.message, /was not found/);
				done();
			});
		});
	});
});