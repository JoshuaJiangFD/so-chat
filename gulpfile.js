var gulp = require('gulp');
var gutil = require('gulp-util');
var plumber = require('gulp-plumber');
var liveReload = require('gulp-livereload');
var browserSync = require('browser-sync');
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



gulp.task('bundle-browserify', function(){
    return browserify({
       //do your config here
        entries: './lib/app.js',
    })
    .bundle()
    .pipe(source('bundle.js')) //this converts to stream, string param is the new name of the file stream
     //do all processing here.
     //like uglification and so on.
     .pipe( cond(proEnv, uglify()) )
    .pipe(gulp.dest('./lib'));
});


gulp.task('bundle-gulp-browserify', function(){
    return gulp.src('./lib/app.js')
        .pipe(plumber({errorHandler: errHandler}))
        .pipe(gbro({
            transform: [reactify, envify]
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

    // browser-sync module always open new tab, i don't like it
    // gulp.watch(file2w, [browserSync.reload]);
});


gulp.task('browser-sync', function() {
    browserSync({
        server: {
            baseDir: "./"
        }
    });
});

gulp.task('default', [ bundleTask ]);

gulp.task('wd', [bundleTask, 'watch']);
















var jade = require('gulp-jade');
gulp.task('jade', function(){
    gulp.src('video/jade/**/*.jade')
        .pipe(jade())
        .pipe(gulp.dest('video'));
});
gulp.task('less', function(){
    return gulp.src('./video/layout/less/**/*.less')
        .pipe(less({comments: 'dumpLineNumbers'}))
        .pipe(gulp.dest('./video/layout/css'));
})
gulp.task('video-bundle', function(){
    return gulp.src('./video/js/app.js')
        .pipe(plumber({errorHandler: errHandler}))
        .pipe(gbro({
            transform: [reactify, envify],
            debug: true
        }))
        .pipe(rename('bundle.js'))
        .pipe( cond(proEnv, uglify()) )
        .pipe(gulp.dest('./video/js'));
});
gulp.task('w-jade', function(){
    gulp.watch('video/jade/**/*.jade', ['jade']);
    gulp.watch(['./video/js/**/*.js', '!./video/js/bundle.js'], ['video-bundle']);
    gulp.watch(['./video/layout/less/**/*.less'], ['less']);
})


gulp.task('video', ['jade', 'less', 'video-bundle', 'w-jade']);