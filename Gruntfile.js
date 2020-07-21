/**
 * When using enketo-core in your own app, you'd want to replace
 * this build file with one of your own in your project root.
 * Smap changes
 *  1) Remove nodeSass
 *  2) Set develop task to only compile and not to change style
 */
/*const nodeSass = require( 'node-sass' );*/

module.exports = grunt => {
    // show elapsed time at the end
    require( 'time-grunt' )( grunt );
    // load all grunt tasks
    require( 'load-grunt-tasks' )( grunt );

    // Project configuration.
    grunt.initConfig( {
        pkg: grunt.file.readJSON( 'package.json' ),
        concurrent: {
            develop: {
                tasks: [ 'shell:transformer', 'connect:server:keepalive', 'watch' ],
                options: {
                    logConcurrentOutput: true
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
            sass: {
                files: [ 'grid/sass/**/*.scss', 'src/sass/**/*.scss', 'src/widget/**/*.scss' ],
                tasks: [ 'css' ],
                options: {
                    spawn: true,
                    livereload: true,
                }
            },
	    language: {
                files: [ 'app/views/**/*.pug', 'app/controllers/**/*.js', 'app/models/**/*.js', 'public/js/src/**/*.js' ],
                tasks: [ 'shell:translation', 'i18next' ]
            },
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
                singleRun: true,
                configFile: 'test/karma.conf.js',
                customLaunchers: {
                    ChromeHeadlessNoSandbox: {
                        base: 'ChromeHeadless',
                        flags: [ '--no-sandbox' ]
                    }
                }
            },
            headless: {
                browsers: [ 'ChromeHeadlessNoSandbox' ]
            },
            browsers: {
                browsers: [ 'Chrome', 'Firefox', 'Safari' ]
            }
        },
        sass: {
            options: {
                sourceMap: false,
                importer( url, prev, done ) {
                    // Fixes enketo-core submodule references.
                    // Those references are correct in apps that use enketo-core as a submodule.
                    url = ( /\.\.\/\.\.\/node_modules\//.test( url ) ) ? url.replace( '../../node_modules/', 'node_modules/' ) : url;
                    done( {
                        file: url
                    } );
                },
                // Temporary workaround for SVG tickmarks in checkboxes in Firefox.
                // See https://github.com/enketo/enketo-core/issues/439
                functions: {
                    'base64-url($mimeType, $data)': function( mimeType, data ) {
                        const base64 = new Buffer( data.getValue() ).toString( 'base64' );
                        const urlString = `url("data:${mimeType.getValue()};base64,${base64}")`;
                        return nodeSass.types.String( urlString );
                    }
                }
            },
            compile: {
                cwd: 'src/sass',
                dest: 'build/css',
                expand: true,
                outputStyle: 'expanded',
                src: '**/*.scss',
                ext: '.css',
                flatten: true,
                extDot: 'last'
            }
        },
        shell: {
            /*transformer: {
                command: 'node node_modules/enketo-transformer/app.js'
            },*/
            rollup: {
                command: 'npx rollup --config'
            }
        }
    } );

    /*grunt.loadNpmTasks( 'grunt-sass' );*/

    grunt.registerTask( 'transforms', 'Creating forms.js', function() {
        const forms = {};
        const done = this.async();
        const jsonStringify = require( 'json-pretty' );
        const formsJsPath = 'test/mock/forms.js';
        const xformsPaths = grunt.file.expand( {}, 'test/forms/*.xml' );
        const transformer = require( 'enketo-transformer' );
        grunt.log.write( 'Transforming XForms ' );
        xformsPaths
            .reduce( ( prevPromise, filePath ) => prevPromise.then( () => {
                const xformStr = grunt.file.read( filePath );
                grunt.log.write( '.' );

                return transformer.transform( { xform: xformStr } )
                    .then( result => {
                        forms[filePath.substring( filePath.lastIndexOf( '/' ) + 1 )] = {
                            html_form: result.form,
                            xml_model: result.model
                        };
                    } );
            } ), Promise.resolve() )
            .then( () => {
                grunt.file.write( formsJsPath, `export default ${jsonStringify( forms )};` );
                done();
            } );
    } );

    grunt.registerTask( 'compile', [ 'shell:rollup' ] );
    grunt.registerTask( 'test', [ 'eslint:check', 'compile', 'transforms', 'karma:headless', 'css' ] );
    grunt.registerTask( 'css', [ 'sass' ] );
    grunt.registerTask( 'server', [ 'connect:server:keepalive' ] );
    grunt.registerTask( 'develop_orig', [ 'css', 'compile', 'concurrent:develop' ] );
    grunt.registerTask( 'develop', [ 'compile' ] );
    grunt.registerTask( 'default', [ 'css', 'compile' ] );
};
