var del = require('del');
var gulp = require('gulp');
var gpCoffee = require('gulp-coffee');
var gpRename = require('gulp-rename');
var gpNewer = require('gulp-newer');
require('coffee-script/register');
var gpMocha = require('gulp-mocha');

gulp.task('default', ['build', 'watch']);

gulp.task('clean', function (cb) {
  del(['lib/*','test/**/*.js'], cb);
});

gulp.task('build', ['clean', 'coffee']);

gulp.task('watch', function () {
  gulp.watch('src/**/*.coffee', ['coffee']);
});

gulp.task('coffee', function () {
  var coffee = gpCoffee({bare: false}).on('error', function (err) {
    console.log(err.name + ': ' + err.message);
    console.log(err.stack);
    process.exit(1);
  });
  return gulp.src('src/**/*.coffee')
             .pipe(gpNewer({dest: 'lib', ext: '.js'}))
             .pipe(coffee)
             .pipe(gpRename({extname: '.js'}))
             .pipe(gulp.dest('lib'));
});

gulp.task('test', ['build'], function (cb) {
  return gulp.src('test/test.coffee')
             .pipe(gpCoffee({bare: true}))
             .pipe(gpRename({extname: '.js'}))
             .pipe(gulp.dest('test'))
             .pipe(gpMocha({reporter: 'spec', bail: true, timeout: 60 * 1000}));
});
