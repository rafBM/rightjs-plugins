/**
 * An abstract interface to process source files
 *
 * Copyright (C) 2011 Nikolay Nemshilov
 */
var RightJS = require('./right-server.js');
var Linter  = require('./linter').Linter;
var fs      = require('fs');

exports.Source = new RightJS.Class({

  /**
   * The Source constructor
   *
   * @param {Object} options
   * @return void
   */
  initialize: function(options) {
    this.files   = options.files   || [];
    this.styles  = options.styles  || [];
    this.layout  = options.layout  || null;
    this.header  = options.header  || null;
    this.holders = options.holders || null;

    this.compile();
  },

  /**
   * Runs the Source compilation process
   *
   * @return {Srouce} this
   */
  compile: function() {
    // compiling the basic source code
    this.source = this.files.map(function(filename) {
      return this.read(
        filename.endsWith('.js') ? filename :
          ('src/' + filename + '.js')
      );
    }, this).join("\n\n");

    // trying to embedd styles
    if (!this.styles.empty()) {
      this.source += this.embedStyles(this.styles);
    }

    // placing everything in a layout
    if (this.layout) {
      var layout = this.read(this.layout).split('%{source_code}');
      this.source = layout[0] + this.source + layout[1];
    }

    // filling in the placeholders
    for (var key in this.holders) {
      this.source = this.source
        .replace('%{'+ key +'}', this.holders[key]);
    }

    // reading the header content
    this.header  = this.read(this.header);

    // trying to embed the version number into the header
    var match = this.source.match(/version\s*(:|=)\s*('|")(.+?)\2/i);
    if (match) {
      this.header = this.header.replace('%{version}', match[3]);
    }
  },

  /**
   * An interface to patch the compiled files manually
   *
   * @param {Function} callback
   * @return {Source} this
   */
  patch: function(callback) {
    this.source = callback.call(this, this.source);
    return this;
  },

  /**
   * Writes the compiled Source down in the filename
   *
   * @param {String} filename (relative to the build directory)
   * @return {Source} this
   */
  write: function(filename) {
    if (!filename.includes('-server')) {
      filename += '-src';
    }

    this.filename = filename + '.js';

    fs.writeFileSync(this.filename, this.header + this.source);
    return this;
  },

  /**
   * Checks this source against with the JSLint
   *
   * @param {String} lint options file
   * @return {Linter} with the results
   */
  check: function(lintfile) {
    return this.linter(lintfile).run().report();
  },

  /**
   * Returns a linter object
   *
   * @param {String} lint options file
   * @return {Linter} no-executed linter
   */
  linter: function(lintfile) {
    return new Linter(this.filename, lintfile);
  },

  /**
   * Compresses the source code and writes it down into the file
   *
   * @return {Source} this
   */
  compress: function() {
    var jsp = require('./ugly/parse-js');
    var pro = require('./ugly/process');
    var ast = jsp.parse(this.source);

    ast = pro.ast_mangle(ast);
    ast = pro.ast_squeeze(ast);

    var filename = this.filename.replace('-src', '');

    fs.writeFileSync(filename, this.header + pro.gen_code(ast));

    // making a GZIP to check the compression
    try { // ain't gonna work on win
      require('child_process').exec(
        'gzip -c ' + filename + ' > '+ filename + '.gz'
      );
    } catch(e) {};


    return this;
  },

  /**
   * Embedds the stylesheets into the main source
   *
   * @param {Array} sources list
   * @return {Source} this
   */
  embedStyles: function(styles) {
    styles = styles.map(this.read).join("\n");

    // preserving IE hacks
    styles = styles
      .replace(/\/\*\\\*\*\/:/g, '_ie8_s:')
      .replace(/\\9;/g, '_ie8_e;')

    // compacting the styles
      .replace(/\/\*[\S\s]*?\*\//img, '')
      .replace(/\n\s*\n/mg, "\n")
      .replace(/\s+/img, ' ')
      .replace(/\s*(\+|>|\||~|\{|\}|,|\)|\(|;|:|\*)\s*/img, '$1')
      .replace(/;\}/g, '}')
      .replace(/\)([^;}\s])/g, ') $1')
      .trim()

    // getting IE hacks back
      .replace(/([^\s])\*/g,   '$1 *')
      .replace(/_ie8_s:/g,     '/*\\\\**/:')
      .replace(/_ie8_e(;|})/g, '\\\\9$1')

    // escaping the quotes
      .replace(/"/, '\"');


    // making the JavaScript embedding script
    return "\n\n"+
      "var embed_style = document.createElement('style'),                 \n"+
      "    embed_rules = document.createTextNode(\""+ styles + "\");      \n"+
      "                                                                   \n"+
      "embed_style.type = 'text/css';                                     \n"+
      "document.getElementsByTagName('head')[0].appendChild(embed_style); \n"+
      "                                                                   \n"+
      "if(embed_style.styleSheet) {                                       \n"+
      "  embed_style.styleSheet.cssText = embed_rules.nodeValue;          \n"+
      "} else {                                                           \n"+
      "  embed_style.appendChild(embed_rules);                            \n"+
      "}                                                                  \n";
  },

// protected

  /**
   * Shortcut for the Node's crappy fs-read
   *
   * @param {String} filename
   * @return {Strng} file content
   */
  read: function(filename) {
    return fs.readFileSync(filename).toString();
  }

});