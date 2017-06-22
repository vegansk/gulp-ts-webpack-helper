# gulp-ts-webpack-helper
Helper for the projects that uses gulp, typescript and webpack

There is the problem with the typescripts loaders for webpack. They are executed for
every single source file, and it can be a huge problem when the project is big.

This project aims to fix the problem by using two separate processes. The _tsc_
compiler is used to transpile typescript to javascript. And _webpack_ is used to
bundle the application. And the gulp is the glue for them.

## Usage

First of all, you need to initialize helper:

```js

const config = { /* described later */ };
const helper = require("gulp-ts-webpack-helper");

```

Now you can create low level tasks, for example:

```js

gulp.task("ts:debug", helper.tsTask("debug"));
gulp.task("watch:ts:debug", helper.tsTask("debug", { watch: true }));

gulp.task("tsc:debug", helper.tsExecTask("debug"));
gulp.task("watch:tsc:debug", helper.tsExecTask("debug", { watch: true }));

gulp.task("webpack:debug", helper.webpackTask("debug"));
gulp.task("watch:webpack:debug", helper.webpackTask("debug", { watch: true }));

```

## Configuration

This is the object with the fields:

- **srcDir**: Directory with the sources (default: _src_).
- **tsOutDir**: Temporary directory, where typescript transpiles the sources (default: _build/tmp_).
- **outDir**: The output directory for webpack (default: _build/dist_).
- **tsconfig**: The path to _tsconfig.json_ file, or the typescript configuration object (default: _{}_).
- **webpackConfig**: The path to webpack config or config object. Used as default config for all targets (default: _{}_).
- **webpackConfigs**: The object where keys are the target names and the values are the paths to webpack configs or config objects (optional).
- **allowJs**: Compile javascript with typescript compiler (default: _true_).
