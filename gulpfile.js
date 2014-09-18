var gulp = require('gulp');
var gutil = require('gulp-util');
var plumber = require('gulp-plumber');
var liveReload = require('gulp-livereload');
var uglify = require('gulp-uglify');
var cond = require('gulp-cond');

var source = require('vinyl-source-stream');
var browserify = require('browserify');

var gbro = require('gulp-browserify');
var reactify = require('reactify');
var envify = require('envify');


var rename = require('gulp-rename');
var less = require('gulp-less');

function errHandler(err){
    gutil.beep();
    console.log('err reported by: ', err.plugin);
    console.log('\tfile:  ', err.fileName);
    console.log('\tline:  ', err.lineNumber);
    console.log('\tstack: ', err.stack);
}

var productTasks = [undefined, 'default'];
var proEnv = false;

var bundleTask;
bundleTask = 'bundle-gulp-browserify';

var taskName = (process.argv[0] === 'node')? process.argv[2] : process.argv[1];
if( productTasks.indexOf(taskName) >= 0 ){
    proEnv = true;
}



gulp.task('bundle-gulp-browserify', function(){
    return gulp.src('./lib/app.js')
        .pipe(plumber({errorHandler: errHandler}))
        .pipe(gbro({
            transform: [reactify, envify],
            debug: !proEnv
        }))
        .pipe(rename('bundle.js'))
        .pipe( cond(proEnv, uglify()) )
        .pipe(gulp.dest('./lib'));
});

gulp.task('watch', function(){
    // gulp-livereload module updated... 
    liveReload.listen();

    var file2w = ['./lib/**/*.js', '!./lib/bundle.js'];
    gulp.watch(file2w, [bundleTask]);
    // gulp.watch(file2w, function(file){
    //     console.log(file.path);
    // });
    
    var file2r = ['./index.html', './lib/bundle.js'];
    gulp.watch(file2r, liveReload.changed);
});

gulp.task('default', [ bundleTask ]);

gulp.task('wd', [bundleTask, 'watch']);