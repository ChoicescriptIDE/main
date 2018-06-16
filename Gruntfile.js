'use strict';
module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt); // npm install --save-dev load-grunt-tasks
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.loadNpmTasks('grunt-contrib-compress');
  grunt.loadNpmTasks('grunt-auto-install');
  grunt.loadNpmTasks('grunt-nw-builder');
  grunt.loadNpmTasks('grunt-execute');
  grunt.loadNpmTasks('grunt-string-replace');
  grunt.initConfig({
    "auto_install": {
      local: {},
      build: {
        options: {
          cwd: 'build',
          stdout: true,
          stderr: true,
          failOnError: true,
          npm: 'trash username',
          bower: false
        }
      },
      codemirror_npm: {
        options: {
          cwd: '',
          stdout: true,
          stderr: true,
          failOnError: true,
          npm: 'cside-codemirror',
          bower: false
        }
      },
      codemirror: {
        options: {
          cwd: 'node_modules/cside-codemirror',
          stdout: true,
          stderr: true,
          failOnError: true,
          npm: '',
          bower: false
        }
      },
      choicescript_npm: {
        options: {
          cwd: '',
          failOnError: true,
          npm: 'cside-choicescript',
          bower: false
        }
      }
     },
    "clean": {
      files: ['build/*', 'release/*'],
      folders: ['build/*/', 'node_modules/cside-choicescript', 'node_modules/cside-codemirror']
    },
    "copy": {
      main: {
        files: [
          // includes files within path
          //{expand: true, src: ['source/*'], dest: 'build/', filter: 'isFile'},

          // includes files within path and its sub-directories
          {
            cwd: '.',
            src: ['package.json'],
            dest: 'build/package.json'
          },
          {
            expand: true, cwd: 'source',
            src: [
              'index.html',
              'run_index.html',
              'mods/*',
              'img/*',
              'help/**',
              'cs_examples/**',
              'lib/font-awesome/**',
              'lib/typo/dictionaries/**',
              'lib/typo/wordprocessor.js',       // used by typo.js
              'lib/jquery/jquery-1.11.3.min.js', // for help tab page
              'lib/marked/marked.min.js',        // ...
              'css/font/century_gothic.ttf',     // 'Century Gothic' font
            ],
            dest: 'build'
          },
          {
            flatten: true,
            src: ['source/lib/font-awesome/css/font-awesome.min.css'],
            dest: 'build/css/font-awesome.min.css'
          }
        ]
      },
      choicescript: {
        files: [
          {
            expand:true, cwd: '',
            src: ['node_modules/cside-choicescript/**'],
            dest: 'build'
          }
        ]
      },
      updater: {
        files: [
          {
            expand: true, cwd: 'source',
            src: [ 'node_modules/cside-updater/**'],
            dest: 'build'
          }
        ]
      }
    },
    "concat": {
      options: {
        separator: "\n\n;",
      },
      dist: {
        src: [
          "source/lib/jquery/jquery-1.11.3.min.js",
          "source/lib/jquery/jquery-ui.min.js",
          "node_modules/noty/lib/noty.min.js",

          "node_modules/cside-codemirror/lib/codemirror.js",
          "node_modules/cside-codemirror/mode/choicescript/choicescript-new.js",

            //plugins
            "node_modules/cside-codemirror/addon/dialog/dialog.js",
            "node_modules/cside-codemirror/addon/hint/show-hint.js",
            "node_modules/cside-codemirror/addon/hint/anyword-hint.js",
            "node_modules/cside-codemirror/addon/display/fullscreen.js",
            "node_modules/cside-codemirror/addon/edit/matchbrackets.js",
            "node_modules/cside-codemirror/addon/mode/simple.js",
            "node_modules/cside-codemirror/addon/mode/overlay.js",
            "node_modules/cside-codemirror/addon/search/search.js",
            "node_modules/cside-codemirror/addon/search/searchcursor.js",
            "node_modules/cside-codemirror/addon/scroll/annotatescrollbar.js",
            "node_modules/cside-codemirror/addon/search/matchesonscrollbar.js",
            "node_modules/cside-codemirror/addon/search/jump-to-line.js",
            "node_modules/cside-codemirror/addon/search/match-highlighter.js",

            "node_modules/cside-codemirror/addon/fold/foldcode.js",
            "node_modules/cside-codemirror/addon/fold/foldgutter.js",
            "node_modules/cside-codemirror/addon/fold/indent-fold.js",

            "source/lib/bootstrap/bootbox.min.js",
            "source/lib/bootstrap/bootstrap.min.js",
            "source/lib/bootstrap/bootstrap-contextmenu.js",

          "node_modules/dropbox/dist/Dropbox-sdk.min.js",

          "node_modules/mousetrap/mousetrap.min.js",
          "source/lib/typo/typo.js",

		      "node_modules/knockout/build/output/knockout-latest.js",
          "source/lib/knockout/knockout-jqueryui.min.js",
          "source/lib/knockout/knockout-sortable.min.js",
          "source/js/knockoutCSIDE.js",

          "source/lib/encoding/encoding.js",

          "node_modules/cside-choicescript/web/scene.js",
          "node_modules/cside-choicescript/web/navigator.js",
          "node_modules/cside-choicescript/web/util.js",
          "node_modules/cside-choicescript/web/mygame/mygame.js",
          "node_modules/cside-choicescript/editor/embeddable-autotester.js"

        ],
        dest: 'build/js/all.min.js',
        // Fail on missing files
        filter: function (filepath) {
          if (!grunt.file.exists(filepath)) {
            grunt.fail.warn('Could not find: ' + filepath);
          } else {
            return true;
          }
        },
        nonull: true,
      },
    },
    "uglify": {
      options: {
        beautify: true,
        mangle: false
      },
      my_target: {
        files: {
          'build/js/all.min.js': [  'build/js/all.min.js' ],
          'build/js/win_state.min.js': [  'source/js/win_state.js' ],
          'build/js/cs_override.min.js': [  'source/js/cs_override.js' ],
          'build/js/node_CSIDE.min.js': [  'source/js/node_CSIDE.js' ]
        }
      }
    },
    "cssmin": {
      target: {
        files: {
        "build/css/all.min.css":
          [
            "source/lib/jquery/jqueryui-theme/jquery-ui.theme.css",

          	"node_modules/cside-codemirror/lib/codemirror.css",
          	"node_modules/cside-codemirror/addon/display/fullscreen.css",
          	"node_modules/cside-codemirror/addon/dialog/dialog.css",
            "node_modules/cside-codemirror/addon/hint/show-hint.css",
            "node_modules/cside-codemirror/addon/fold/foldgutter.css",
          	"node_modules/cside-codemirror/theme/cs-light.css",
          	"node_modules/cside-codemirror/theme/cs-dark.css",
          	"node_modules/cside-codemirror/theme/cs-dichromatic.css",

            "node_modules/noty/lib/noty.css",
            "node_modules/noty/lib/themes/bootstrap-v3.css",

          	"source/lib/bootstrap/bootstrap.min.css",

          	"source/css/cside.css"
          ],
        }
      }
    },
    'string-replace': {
      trashPatch: {
        files: {
          'build/node_modules/trash/node_modules/osx-trash/index.js': 'build/node_modules/trash/node_modules/osx-trash/index.js',
        },
        options: {
          replacements: [
            {
              pattern: 'var olderThanMountainLion = ',
              replacement: 'var olderThanMountainLion = true; //'
            }
          ]
        }
      }
    },
    "compress": {
      main: {
        options: {
          mode: 'zip',
          archive: 'release/package.nw'
        },
        files: [
          {cwd:'build', src: ['**'], expand:true}, // includes files in path and its subdirs
        ]
      }
    },
    "execute": {
        target: {
            src: ['create-compile-html.js']
        }
    },
    "nwjs": {
      mac: {
        options: {
          platforms: ['osx64'],
          macIcns: './source/img/cside.icns',
          buildDir: './nwjsBuild',
          cacheDir: './nwjsCache',
          version: '0.21.4'
        },
        src: ['./build/**/*']
      },
      windows: {
        options: {
          platforms: ['win64'],
          winIco: './source/img/cside.ico',
          buildDir: './nwjsBuild',
          cacheDir: './nwjsCache',
          version: '0.21.4',
		  zip: false
        },
        src: ['./build/**/*']
      },
      linux: {
        options: {
          platforms: ['linux64'],
          buildDir: 'nwjsBuild',
          cacheDir: 'nwjsCache',
          version: '0.21.4',
        },
        src: ['./build/**/*']
      }
    }
  });
  var tasks = ["clean", "auto_install:codemirror_npm", "auto_install:codemirror", "auto_install:choicescript_npm", "copy:main", "concat", "uglify", "cssmin", "auto_install:build", "copy:choicescript", "copy:updater", "string-replace", "execute", "compress"];
  grunt.registerTask("default", tasks);
  grunt.registerTask("build-with-nwjs", tasks.concat("nwjs"));
  grunt.registerTask("build-with-windows", tasks.concat("nwjs:windows"));
  grunt.registerTask("build-with-mac", tasks.concat("nwjs:mac"));
  grunt.registerTask("build-with-linux", tasks.concat("nwjs:linux"));
};
