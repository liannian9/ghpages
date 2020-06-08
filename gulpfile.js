// 实现这个项目的构建任务

const {src, dest, series, parallel, watch, task } = require('gulp');
const del = require('del')

var browserSync = require('browser-sync');
const loadPlugins = require("gulp-load-plugins")
const plugins = loadPlugins()
const ghPages = require('gulp-gh-pages');

// var babel = require("gulp-babel");    
// var swip = require("gulp-swip");    
// var uglify = require("gulp-uglify");  
// var cleanCss = require("gulp-clean-css");
// var rename = require('gulp-rename')
// const sass = require('gulp-sass');
// const imagemin = require('gulp-imagemin')
// const useref = require('gulp-useref')
// const if = require('gulp-if')
// const htmlmin = require('gulp-htmlmin')
const bs = browserSync.create()

const data = {
    menus: [
      {
        name: 'Home',
        icon: 'aperture',
        link: 'index.html'
      },
      {
        name: 'Features',
        link: 'features.html'
      },
      {
        name: 'About',
        link: 'about.html'
      },
      {
        name: 'Contact',
        link: '#',
        children: [
          {
            name: 'Twitter',
            link: 'https://twitter.com/w_zce'
          },
          {
            name: 'About',
            link: 'https://weibo.com/zceme'
          },
          {
            name: 'divider'
          },
          {
            name: 'About',
            link: 'https://github.com/zce'
          }
        ]
      }
    ],
    pkg: require('./package.json'),
    date: new Date()
  }
//temp 是中间文件夹
const clean = () => {
    return del(['dist', 'temp'])
}
const style = () => {
    return src("src/assets/styles/*.scss", {base:'src'})
            // .pipe(plugins.rename({suffix:'.min'}))
            .pipe(plugins.sass())    
            // 浏览器前缀补全    
            // .pipe(plugins.autoprefixer({
            //     overrideBrowserslist: ["last 3 versions"],
            //     cascade: false
            // }))
            // css压缩,因为useref处理时会对所有文件进行压缩处理，因此这里不做重复操作
            // .pipe(plugins.cleanCss({
            //     keepSpecialComments: "*"
            // }))
            .pipe(dest("temp"))
            //每次修改刷新页面 与bs的files用途一样 使用一种即可
            .pipe(bs.reload({stream:true}))
}
const javascript = () => {
    return src("src/assets/scripts/*.js", {base:'src'})
            // .pipe(plugins.rename({suffix:'.min'}))
            .pipe(plugins.babel({
            //# Babel 7
            //npm install --save-dev gulp-babel @babel/core @babel/preset-env
            //# Babel 6
            //npm install --save-dev gulp-babel@7 babel-core babel-preset-env
                presets: ['@babel/preset-env']
            }))
            //js压缩,因为useref处理时会对所有文件进行压缩处理，因此这里不做重复操作
            // .pipe(plugins.uglify())
            .pipe(dest("temp"))
            //每次修改刷新页面 与bs的files用途一样 使用一种即可
            .pipe(bs.reload({stream:true}))

}
const html = () => {
    return src("src/*.html", {base:'src'})
            .pipe(plugins.swig({data, defaults: {
              //不缓存
                cache: false
              }
       }))
            .pipe(dest("temp"))
            //每次修改刷新页面 与bs的files用途一样 使用一种即可
            .pipe(bs.reload({stream:true}))

}
const fonts = () => {
    return src("src/assets/fonts/**", {base:'src'})
            .pipe(plugins.imagemin())//图标压缩
            .pipe(dest("dist"))

}
const images = () => {
    return src("src/assets/images/**", {base:'src'})
    .pipe(plugins.imagemin())//图片压缩
    .pipe(dest("dist"))
}
const extra = () => {
    return src("public/**", {base:'public'})
    .pipe(dest("dist"))
}
const serve = () => {
    //监视文件变化执行相应任务
    watch("src/assets/styles/*.scss", style);
    watch("src/assets/scripts/*.js", javascript);
    watch("src/*.html",html);
    // fonts，images，extra三个文件每次更改都编译没有必要，html，js，css都是需要编译，编译之前为模板
    // watch("src/assets/fonts/**", fonts);
    // watch("src/assets/images/**", images);
    // watch("public/**", extra);

    watch([//三个文件发生变化不重新编译，而是让页面刷新重新请求数据
        "src/assets/fonts/**",
        "src/assets/images/**",
        "public/**"
    ],bs.reload)
    bs.init({
        notify:false, //关闭刷新提示
        port:2000,
        // files:'temp/**', //监视dist目录文件变化自动更新 与html，javascript，style三个任务中.pipe(bs.reload({stream:true}))用途一样，存在一种即可
        server:{
            baseDir:['temp', 'src', 'public'], //按顺序寻找文件，dist(招不到) ===>src ===>public
            routes:{
                '/node_modules':'node_modules' 
            }
        }
    })
}
//因为读写都在dist可能会出现写入不了的问题，因此添加一个中间文件夹temp，将html，css，js文件compile到temp文件夹，useref从temp文件加读取在输出到dist
const useref = () => {
    return src("temp/*.html", {base:'temp'})
    //searchpath 在什么目录下查找文件
    .pipe(plugins.useref({searchPath:['temp', '.']}))//根据html中的构建注释合并生成文件,但是生成的文件并没有进行压缩
    //有三种文件，htnl，css，js 需要根据类型分别处理
    .pipe(plugins.if(/\.js$/, plugins.uglify()))
    .pipe(plugins.if(/\.css$/, plugins.cleanCss()))
    .pipe(plugins.if(/\.html$/, plugins.htmlmin({ 
      collapseWhitespace: true,
      minifyCSS:true,
      minifyJS:true,

     })))//htmlmin只是压缩空白字符，需要指定参数
    .pipe(dest("dist")) 
}
task('deploy',  () => src('dist/**').pipe(ghPages()))



const compile = parallel([style, javascript, html])
const build = series(clean, parallel([series(compile, useref), fonts, images, extra]))
const develop = series(compile, serve)
// const deploy = series(build, deploy);
module.exports = {
    clean,
    build,
    develop,
    // deploy
}