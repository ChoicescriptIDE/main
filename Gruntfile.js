'use strict';
module.exports = function(grunt) {
  require('load-grunt-tasks')(grunt); // npm install --save-dev load-grunt-tasks
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-cssmin');
  grunt.initConfig({
    "shell": {
      docs: {
        command: 'mkdocs build',
        options: {
          execOptions: {
              cwd: 'source/help'
          }
        }
      },
      create_html: {
        command: 'node create-compile-html.js'
      },
      tsc: {
        command: 'npx tsc -p .'
      }
    },
    "execute": {
      target: {
        src: ['create-compile-html.js']
      }
    },
    "clean": {
      main: {
        src: ['build/**', 'release/**', 'dist/**']
      },
      package_lock: {
        src: ['build/package-lock.json']
      }
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
              'help/site/**',
              'cs_examples/**',
              'lib/font-awesome/**',
              'lib/jquery/jquery-1.11.3.min.js', // for help tab page
              'lib/marked/marked.min.js',        // ...
              'css/font/century_gothic.ttf',     // 'Century Gothic' font
            ],
            dest: 'build',
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
          {
            flatten: true,
            src: ['source/lib/font-awesome/css/font-awesome.min.css'],
            dest: 'build/css/font-awesome.min.css',
            // Fail on missing files
            filter: function (filepath) {
              if (!grunt.file.exists(filepath)) {
                grunt.fail.warn('Could not find: ' + filepath);
              } else {
                return true;
              }
            },
            nonull: true,
          }
        ]
      },
      choicescript: {
        files: [
          {
            expand:true,
            src: ['node_modules/cside-choicescript/**/*'],
            dest: 'build'
          }
        ]
      },
      username: {
        files: [
          {
            expand: true,
            src: ['node_modules/username/**/*'],
            dest: 'build'
          }
        ]
      },
      trash: {
        files: [
          {
            expand: true,
            src: ['node_modules/trash/**/*'],
            dest: 'build'
          }
        ]
      },
      nodeStatic: {
        files: [
          {
            expand: true,
            src: ['node_modules/node-static/**/*'],
            dest: 'build'
          }
        ]
      },
      asar: {
        files: [
          {
            expand: true,
            src: ['node_modules/asar/**/*'],
            dest: 'build'
          }
        ]
      },
      mkdirp: {
        files: [
          {
            expand: true,
            src: ['node_modules/mkdirp/**/*'],
            dest: 'build'
          }
        ]
      },
      monaco: {
        files: [
          {
            expand: true, cwd: '',
            src: ['node_modules/monaco-editor/release/min/**'],
            dest: 'build'
          }
        ]
      },
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

          "source/lib/bootstrap/bootbox.min.js",
          "source/lib/bootstrap/bootstrap.min.js",
          "source/lib/bootstrap/bootstrap-contextmenu.js",

          "source/lib/uuid/uuidv4.min.js",

          "node_modules/dropbox/dist/Dropbox-sdk.min.js",

          "node_modules/mousetrap/mousetrap.min.js",
          "node_modules/knockout/build/output/knockout-latest.js",
          "source/lib/knockout/knockout-jqueryui.min.js",
          "source/lib/knockout/knockout-sortable.min.js",

          "node_modules/monaco-editor/release/min/vs/loader.js",

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
          'build/js/cs_override.min.js': [  'source/js/cs_override.js' ],
          'build/js/node_CSIDE.min.js': [  'source/js/node_CSIDE.js' ]
        }
      }
    },
    "cssmin": {
      target: {
        dest: "build/css/all.min.css",
        src : [
          "source/lib/jquery/jqueryui-theme/jquery-ui.theme.css",

          "node_modules/noty/lib/noty.css",
          "node_modules/noty/lib/themes/bootstrap-v3.css",

          "source/lib/bootstrap/bootstrap.min.css",

          "source/css/cside.css"
        ],
        // Fail on missing files
        nonull: true,
        filter: function (filepath) {
          if (!grunt.file.exists(filepath)) {
            grunt.fail.warn('Could not find: ' + filepath);
          } else {
            return true;
          }
        },
      }
    },
    'eslint': {
      permissive: {
        src: ['source/**/*.ts', 'actions/**/*.ts']
      },
      strict: {
        src: ['source/**/*.ts', 'actions/**/*.ts'],
        options: {
          maxWarnings: 0
        }      
      }

    }
  });
  grunt.registerTask("create-asar-archive", "Bundles build into an Electron asar.app file", async function() {
    const fs = require('fs');
    const asarPath = './release/app.asar';
    const done = this.async();
    const asar = require('asar');
    try {
      fs.unlinkSync(asarPath);
    } catch (err) {}
    await (async () => {
      try {
        await asar.createPackage('./build/', asarPath);
      } catch (err) {
        console.log(err.message);
        done(false);
      } 
    })();
    const result = fs.existsSync('./release/app.asar'); // asar doesn't handle errors?
    if (!result) {
      console.log("Error: no app.asar created. Reason unknown.");
    }
    done(result);
  });
  var tasks = ["eslint:permissive", "clean", "shell:docs", "copy:main", "concat", "uglify", "cssmin", "clean:package_lock",
    "copy:choicescript", "copy:trash", "copy:username", "copy:nodeStatic", "copy:asar", "copy:mkdirp", "copy:monaco", "shell:tsc", "create-asar-archive"];
  grunt.registerTask("default", tasks);
  grunt.registerTask("lint", ['eslint:strict']);
};
