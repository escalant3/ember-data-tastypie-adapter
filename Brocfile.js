/* jshint node: true */

var es6           = require('broccoli-es6-module-transpiler');
var concat        = require('broccoli-concat');
var uglify        = require('broccoli-uglify-js');
var es3SafeRecast = require('broccoli-es3-safe-recast');
var env           = process.env.EMBER_ENV;
var pickFiles     = require('broccoli-static-compiler');
var merge         = require('broccoli-merge-trees');
var moveFile      = require('broccoli-file-mover');
var wrap          = require('broccoli-wrap');
var jshint        = require('broccoli-jshint');
var defeatureify  = require('broccoli-defeatureify');
var renderTemplate = require('broccoli-render-template');
var yuidoc = require('broccoli-yuidoc');
var replace = require('broccoli-string-replace');

function moveFromLibAndMainJS(packageName, vendored){
  var root = vendored ? 'bower_components/' + packageName + "/packages/" + packageName + '/lib':
    'packages/' + packageName + '/lib';
  var tree = pickFiles(root, {
    srcDir: '/',
    files: [ '**/*.js' ],
    destDir: '/' + packageName
  });
  tree = moveFile(tree, {
    srcFile: packageName + '/main.js',
    destFile: '/' + packageName + '.js'
  });
  tree = es6(tree, {moduleName: true});
  if (env === 'production'){
    tree = es3SafeRecast(tree);
  }
  return tree;
}

function minify(tree, name){
  var config = require('./config/ember-defeatureify');
  tree = defeatureify(tree, {
    debugStatements: config.options.debugStatements,
    enableStripDebug: config.stripDebug
  });
  tree = moveFile(tree, {
    srcFile: name + '.js',
    destFile: '/' + name + '.prod.js'
  });
  var uglified = moveFile(uglify(tree, {mangle: true}),{
    srcFile: name + '.prod.js',
    destFile: '/' + name + '.min.js'
  });
  return merge([uglified, tree]);
}

function testTree(libTree, packageName){
  var test = pickFiles('packages/' + packageName + '/tests', {
    srcDir: '/',
    files: [ '**/*.js' ],
    destDir: '/'
  });
  var jshinted = jshint(libTree);
  jshinted = wrap(jshinted, {
    wrapper: [ "if (!QUnit.urlParams.nojshint) {\n", "\n}"]
  });
  return merge([jshinted, test]);
}

var tastypieAdapterFiles = moveFromLibAndMainJS('ember-data-tastypie-adapter', false);
var loaderJS = pickFiles('bower_components/loader.js', {
  srcDir: '/',
  files: [ 'loader.js' ],
  destDir: '/'
});


var libFiles = tastypieAdapterFiles;

var testFiles = testTree(tastypieAdapterFiles, 'ember-data-tastypie-adapter');

var namedAMDBuild = concat(libFiles, {
  inputFiles: ['**/*.js'],
  separator: '\n',
  outputFile: '/named-amd/ember-data-tastypie-adapter.js'
});

var globalBuild = concat(merge([libFiles, loaderJS]), {
  inputFiles: ['loader.js', '**/*.js'],
  separator: '\n',
  outputFile: '/global/ember-data-tastypie-adapter.js'
});

globalBuild = wrap(globalBuild, {
  wrapper: [ "(function(global){\n", "\n global.DS.DjangoTastypieAdapter = requireModule('ember-data-tastypie-adapter')['DjangoTastypieAdapter'];\n global.DS.DjangoTastypieSerializer = requireModule('ember-data-tastypie-adapter')['DjangoTastypieSerializer'];\n})(this);"]
});

testFiles = concat(testFiles, {
  inputFiles: ['**/*.js'],
  separator: '\n',
  wrapInEval: true,
  wrapInFunction: true,
  outputFile: '/tests/tests.js'
});

//var testRunner = pickFiles('tests', {
//  srcDir: '/',
//  inputFiles: [ '**/*' ],
//  destDir: '/'
//});

//var bower = pickFiles('bower_components', {
//  srcDir: '/',
//  inputFiles: [ '**/*' ],
//  destDir: '/bower_components'
//});

var trees = merge([
  testFiles,
  globalBuild,
  namedAMDBuild,
//  testRunner,
//  bower
]);

if (env === 'production') {
  var minifiedAMD = minify(namedAMDBuild, 'named-amd/ember-data-tastypie-adapter');
  var minifiedGlobals = minify(globalBuild, 'global/ember-data-tastypie-adapter');
  trees = merge([
    trees,
    minifiedAMD,
    minifiedGlobals
  ]);
}

module.exports = trees;
