const gulp = require("gulp");
const helper = require("../../")();

gulp.task("ts:debug", helper.tsTask("debug"));
