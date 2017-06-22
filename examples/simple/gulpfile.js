const gulp = require("gulp");
const helper = require("../../")({
  tsconfig: ".",
  webpackConfigs: {
    debug: "./scripts/webpack-config-debug.js"
  }
});

gulp.task("ts:debug", helper.tsTask("debug"));
gulp.task("watch:ts:debug", helper.tsTask("debug", { watch: true }));

gulp.task("tsc:debug", helper.tsExecTask("debug"));
gulp.task("watch:tsc:debug", helper.tsExecTask("debug", { watch: true }));

gulp.task("webpack:debug", helper.webpackTask("debug"));
gulp.task("watch:webpack:debug", helper.webpackTask("debug", { watch: true }));
