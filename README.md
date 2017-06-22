# gulp-ts-webpack-helper
Helper for the projects that uses gulp, typescript and webpack

There is the problem with the typescripts loaders for webpack. They are executed for
every single source file, and it can be a huge problem when the project is big.

This project aims to fix the problem by using two separate processes. The _tsc_
compiler is used to transpile typescript to javascript. And _webpack_ is used to
bundle the application. And the gulp is the glue for them.
