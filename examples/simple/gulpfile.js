const gulp = require("gulp");
const helper = require("../../")();

gulp.task("ts:debug", helper.tsTask("debug"));
gulp.task("watch:ts:debug", helper.tsTask("debug", { watch: true }));
