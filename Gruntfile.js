/**
 * when using enketo-core in your own app, you'd want to replace
 * this build file with one of your own in your project root.
 * smap changes
 *  1) remove nodesass
 *  2) set develop task to only compile and not to change style
 */
/*const nodesass = require( 'node-sass' );*/

module.exports = grunt => {
    // show elapsed time at the end
    require( 'time-grunt' )( grunt );
    // load all grunt tasks
    require( 'load-grunt-tasks' )( grunt );

    // project configuration.
    grunt.initconfig( {
        pkg: grunt.file.readjson( 'package.json' ),
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
        concurrent: {
            develop: {
                tasks: [ 'shell:transformer', 'connect:server:keepalive', 'watch' ],
                options: {
                    logconcurrentoutput: true
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
        sass: {
            options: {
                sourcemap: false,
                importer( url, prev, done ) {
                    // fixes enketo-core submodule references.
                    // those references are correct in apps that use enketo-core as a submodule.
                    url = ( /\.\.\/\.\.\/node_modules\//.test( url ) ) ? url.replace( '../../node_modules/', 'node_modules/' ) : url;
                    done( {
                        file: url
                    } );
                },
                // temporary workaround for svg tickmarks in checkboxes in firefox.
                // see https://github.com/enketo/enketo-core/issues/439
                functions: {
                    'base64-url($mimetype, $data)': function( mimetype, data ) {
                        const base64 = new buffer( data.getvalue() ).tostring( 'base64' );
                        const urlstring = `url("data:${mimetype.getvalue()};base64,${base64}")`;
                        return nodesass.types.string( urlstring );
                    }
                }
            },
            compile: {
                cwd: 'src/sass',
                dest: 'build/css',
                expand: true,
                outputstyle: 'expanded',
                src: '**/*.scss',
                ext: '.css',
                flatten: true,
                extdot: 'last'
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

    /*grunt.loadnpmtasks( 'grunt-sass' );*/
    grunt.loadnpmtasks('grunt-contrib-uglify');

    grunt.registertask( 'transforms', 'creating forms.js', function() {
        const forms = {};
        const done = this.async();
        const jsonstringify = require( 'json-pretty' );
        const formsjspath = 'test/mock/forms.js';
        const xformspaths = grunt.file.expand( {}, 'test/forms/*.xml' );
        const transformer = require( 'enketo-transformer' );
        grunt.log.write( 'transforming xforms ' );
        xformspaths
            .reduce( ( prevpromise, filepath ) => prevpromise.then( () => {
                const xformstr = grunt.file.read( filepath );
                grunt.log.write( '.' );

                return transformer.transform( { xform: xformstr } )
                    .then( result => {
                        forms[filepath.substring( filepath.lastindexof( '/' ) + 1 )] = {
                            html_form: result.form,
                            xml_model: result.model
                        };
                    } );
            } ), promise.resolve() )
            .then( () => {
                grunt.file.write( formsjspath, `export default ${jsonstringify( forms )};` );
                done();
            } );
    } );

    grunt.registertask( 'compile', [ 'shell:rollup' ] );
    grunt.registertask( 'develop', [ 'compile' ] );
    grunt.registertask( 'minify', [ 'uglify' ] );

};
