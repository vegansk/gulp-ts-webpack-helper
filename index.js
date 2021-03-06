const gulp = require("gulp");
const sourcemaps = require("gulp-sourcemaps");
const ts = require("gulp-typescript");
const webpackStream = require("webpack-stream");
const webpack = require("webpack");
const WebpackDevServer = require("webpack-dev-server");
const gulpWatch = require("gulp-watch");
const clean = require("gulp-dest-clean");
const plumber = require("gulp-plumber");
const spawn = require("child_process").spawn;
const fs = require("fs");
const gutil = require("gulp-util");
const process = require("process");
const path = require("path");

function parseConfig(cfg) {
  const res = {};

  // Source directory
  res.srcDir = cfg.srcDir || "src";
  // Where to place files generated by tsc
  res.tsOutDir = cfg.tsOutDir || "build/tmp";
  // Where to place files generated by webpack
  res.outDir = cfg.webpackOutDir || "build/dist";
  // tsconfig.json location or the object with parameters
  res.tsconfig = cfg.tsconfig || {};
  if(res.tsconfig === ".")
    res.tsconfig = "./tsconfig.json";

  // Single configuration file/object
  res.webpackConfig = cfg.webpackConfig || {};
  // Multiple configuration files/objects for targets
  res.webpackConfigs = cfg.webpackConfigs || {};
  // Port for webpack dev server
  res.devServerPort = cfg.devServerPort || parseInt(process.env.PORT || "8080");
  // Startup timeout
  res.devServerStartupTimeout = cfg.devServerStartupTimeout || 3000;

  // Compile js files with tsc
  res.allowJs = cfg.allowJs === undefined ? true : !!cfg.allowJs;

  return res;
}

function isDirExist(dirName) {
  try {
    return fs.statSync(dirName).isDirectory();
  } catch (e) {
    if(e.code === "ENOENT")
      return false;
    throw e;
  }
}

module.exports = function(userConfig = {}) {

  const config = parseConfig(userConfig);

  const srcGlob = [
    `${config.srcDir}/**/*.ts`,
    `${config.srcDir}/**/*.tsx`
  ].concat(
    config.allowJs
      ? [
        `${config.srcDir}/**/*.js`,
        `${config.srcDir}/**/*.jsx`
      ]
      : []
  );

  const resourcesGlob = [
    `${config.srcDir}/**/*`
  ].concat(
    srcGlob.map(v => "!" + v)
  );

  const tsOutDir = (target) => path.join(config.tsOutDir, target);

  const tsOutGlob = (target) => `${tsOutDir(target)}/**/*`;

  const outDir = (target) => path.join(config.outDir, target);

  const scriptName = (name) => path.normalize(process.platform === 'win32' ? `${name}.cmd` : name);

  const webpackConfig = (target) => {
    const cfg = config.webpackConfigs[target] || config.webpackConfig;
    return cfg;
  };

  const resourcesTask = (target, { watch = false } = {}) => () => {
    const task = () => gulp.src(resourcesGlob)
          .pipe(gulp.dest(tsOutDir(target)));
    if(watch)
      return gulpWatch(resourcesGlob, task);
    else
      return task();
  };

  const tsTask = (target, { watch = false } = {}) => () => {
    const cfg = typeof config.tsconfig === "string"
          ? require(path.join(process.cwd(), config.tsconfig))
          : config.tsconfig;
    const tsProject = ts.createProject(cfg);
    const task = () => gulp.src(srcGlob)
          .pipe(plumber())
          .pipe(sourcemaps.init())
          .pipe(tsProject())
          .pipe(sourcemaps.write(".", {
            includeContent: false,
            sourceRoot: path.relative(tsOutDir(target), config.srcDir)
          }))
          .pipe(gulp.dest(tsOutDir(target)));

    if(watch) {
      return gulpWatch(srcGlob, { verbose: true }, task);
    } else
      return task;
  };

  const tsExecTask = (target, { watch = false } = {}) => (cb) => {
    if(typeof config.tsconfig !== "string") {
      cb(new Error("tsconfig property must be the path when using tsExecTask"));
      return;
    }
    const args = ["--outDir", tsOutDir(target), "-p", config.tsconfig].concat(
      watch ? ["--watch"] : []
    );
    const tsc = spawn(scriptName("./node_modules/.bin/tsc"), args, { stdio: "inherit", shell: true });
    tsc.on("close", (code) => {
      if(code !== 0)
        cb(new Error(`tsc exited with the code ${code}`));
      else
        cb();
    });
  };

  const webpackTask = (target, { watch = false } = {}) => () => {
    const task = () => gulp.src(tsOutGlob(target))
          .pipe(plumber())
          .pipe(clean(outDir(target)))
          .pipe(webpackStream(
            Object.assign({}, webpackConfig(target), {
              watch
            }),
            webpack
          ))
          .pipe(gulp.dest(outDir(target)));
    return task();
  };

  const buildBeforeWatch = (taskName, target) => {
    return new Promise((resolve, reject) => {
      if(isDirExist(tsOutDir(target))) {
        resolve();
      } else {
        gutil.log("Perform intial build...");
        gulp.start(taskName, (err) => {
          if(err)
            reject(err);
          else
            resolve();
        });
      }
    });
  };

  const resTaskName = (name) => `${name}:resources`;
  const tsTaskName = (name) => `${name}:typescript`;
  const createBuildTask = (name, target, { fork = false } = {}) => (gulp) => {
    gulp.task(resTaskName(name), resourcesTask(target));
    gulp.task(tsTaskName(name), fork ? tsExecTask(target) : tsTask(target));
    gulp.task(name, [resTaskName(name), tsTaskName(name)], webpackTask(target));
  };

  const buildTaskName = (name) => `${name}:build`;
  const webpackTaskName = (name) => `${name}:webpack`;
  const createWatchTask = (name, target, { fork = false } = {}) => (gulp) => {
    createBuildTask(buildTaskName(name), target, { fork })(gulp);
    gulp.task(resTaskName(name), resourcesTask(target, { watch: true }));
    gulp.task(tsTaskName(name), (fork ? tsExecTask : tsTask)(target, { watch: true }));
    gulp.task(webpackTaskName(name), webpackTask(target, { watch: true }));

    gulp.task(name, () => {
      buildBeforeWatch(buildTaskName(name), target).then(() => {
        gulp.start(webpackTaskName(name));
        gulp.start(resTaskName(name));
        gulp.start(tsTaskName(name));
      });
    });
  };

  const webpackDevServerExecTask = (target) => () => {
    const cfgPath = webpackConfig(target);
    if(typeof cfgPath !== "string") {
      console.dir(cfgPath);
      throw new Error("webpack config patameter must be the path when using forked version of dev server");
    }
    const args = ["--config", path.join(process.cwd(), cfgPath)];
    const devServer = spawn(scriptName("./node_modules/.bin/webpack-dev-server"), args, { stdio: "inherit", shell: true });
    devServer.on("close", (code) => {
      if(code !== 0)
        cb(new Error(`devServer exited with the code ${code}`));
      else
        cb();
    });
  };

  const devServerTaskName = (name) => `${name}:devserver`;
  const createDevServerTask = (name, target, { fork = false } = {}) => (gulp) => {
    createBuildTask(buildTaskName(name), target, { fork })(gulp);
    gulp.task(resTaskName(name), resourcesTask(target, { watch: true }));
    gulp.task(tsTaskName(name), (fork ? tsExecTask : tsTask)(target, { watch: true }));
    gulp.task(devServerTaskName(name), webpackDevServerExecTask(target));

    gulp.task(name, () => {
      buildBeforeWatch(buildTaskName(name), target).then(() => {
        gulp.start(devServerTaskName(name));
        setTimeout(() => {
          gulp.start(resTaskName(name));
          gulp.start(tsTaskName(name));
        }, config.devServerStartupTimeout);
      });
    });
  };

  return {
    resourcesTask,
    tsTask,
    tsExecTask,
    webpackTask,
    createBuildTask,
    createWatchTask,
    createDevServerTask
  };

};
