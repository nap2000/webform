module.exports = grunt => {
    // show elapsed time at the end
    require( 'time-grunt' )( grunt );
    // load all grunt tasks
    require( 'load-grunt-tasks' )( grunt );

    // project configuration.
    grunt.initConfig( {
        pkg: grunt.file.readJSON( 'package.json' ),
        uglify: {
          options: {
            mangle: true,
            compress: true
          },
          my_target: {
            files: {
              'build/js/bundle.min.js': ['build/js/enketo-bundle.js']
            }
          }
        },
        connect: {
            server: {
                options: {
                    port: 8005,
                    base: [ 'test/forms', 'test/temp', 'build' ]
                }
            },
            test: {
                options: {
                    port: 8000
                }
            }
        },
        eslint: {
            check: {
                src: [ '*.js', 'src/**/*.js' ]
            },
            fix: {
                options: {
                    fix: true,
                },
                src: [ '*.js', 'src/**/*.js' ]
            }
        },
        watch: {
            js: {
                files: [ 'config.json', '*.js', 'src/**/*.js' ],
                tasks: [ 'shell:rollup' ],
                options: {
                    spawn: false,
                    livereload: true
                }
            }
        },
        karma: {
            options: {
                singlerun: true,
                configfile: 'test/karma.conf.js',
                customlaunchers: {
                    chromeheadlessnosandbox: {
                        base: 'chromeheadless',
                        flags: [ '--no-sandbox' ]
                    }
                }
            },
            headless: {
                browsers: [ 'chromeheadlessnosandbox' ]
            },
            browsers: {
                browsers: [ 'chrome', 'firefox', 'safari' ]
            }
        },
        shell: {
            rollup: {
                command: 'npx rollup --config'
            }
        }
    } );

    // Sass compilation is handled separately — run: sass src/sass/theme.scss build/css/theme.css
    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask( 'compile', [ 'shell:rollup' ] );
    grunt.registerTask( 'develop', [ 'compile' ] );
    grunt.registerTask( 'minify', [ 'uglify' ] );

};
