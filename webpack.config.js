const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const CopyPlugin = require('copy-webpack-plugin');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const fs = require('fs');

module.exports = {
  mode: 'production',
  entry: {
    bookmarklet: './assets/js/bookmarklet.js',
    loader: './assets/js/loader.js',
    bootstrap: './assets/js/bootstrap.js',
    core: './assets/js/core.js',
    'utils/parser': './assets/js/utils/parser.js',
    'utils/observer': './assets/js/utils/observer.js',
    'utils/analyzer': './assets/js/utils/analyzer.js'
  },
  output: {
    filename: '[name].min.js',
    path: path.resolve(__dirname, 'dist/assets/js'),
    clean: true
  },
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          format: {
            comments: false,
          },
          compress: {
            drop_console: false, // Keep console logs for troubleshooting
            pure_funcs: ['console.debug'], // Remove only debug logs
            arrows: true,
            collapse_vars: true, 
            conditionals: true,
            dead_code: true,
            booleans: true,
            if_return: true,
            inline: true,
            join_vars: true,
            keep_infinity: true,
            loops: true,
            negate_iife: false,
            properties: true,
            reduce_funcs: true,
            reduce_vars: true,
            sequences: true,
            side_effects: true,
            switches: true,
            typeofs: false,
            unused: true,
            booleans_as_integers: true,
            passes: 3, // Multiple optimization passes
          },
          mangle: {
            safari10: true,
            properties: {
              // Mangle property names to reduce size further
              keep_quoted: true,
              reserved: ['arguments', 'module', 'exports', 'KoreanWebAnalyzer']
            },
          },
          module: true,
          toplevel: true, // Better optimization for modern JS
        },
        extractComments: false
      }),
    ],
    splitChunks: {
      chunks: 'all',
      maxInitialRequests: Infinity,
      minSize: 0, // Always split regardless of size
      cacheGroups: {
        // Common utility code
        utils: {
          test: /[\\/]utils[\\/]/,
          name: 'utils',
          priority: 20
        },
        // Core functionality
        core: {
          test: /core\.js$/,
          name: 'core',
          priority: 30
        },
        // Analyzer modules
        analyzers: {
          test: /[\\/]analyzer[\\/]/,
          name: 'analyzers',
          priority: 10
        },
        // UI components
        ui: {
          test: /[\\/]ui[\\/]/,
          name: 'ui',
          priority: 15
        },
        // Vendor code
        vendors: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          priority: 5
        }
      }
    },
    // Ensure tree shaking is aggressive
    usedExports: true,
    providedExports: true,
    sideEffects: true,
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        { 
          from: 'assets/css', 
          to: '../css',
          noErrorOnMissing: true
        },
        { 
          from: 'assets/images', 
          to: '../images',
          noErrorOnMissing: true
        },
        { 
          from: 'assets/js/utils',
          to: 'utils',
          noErrorOnMissing: true
        },
        { 
          from: 'assets/js/analyzer',
          to: 'analyzer',
          noErrorOnMissing: true
        },
        { 
          from: 'assets/js/ui',
          to: 'ui',
          noErrorOnMissing: true
        }
      ],
    }),
    {
      apply: (compiler) => {
        compiler.hooks.afterEmit.tap('CopyHtmlPlugin', (compilation) => {
          const source = path.join(__dirname, 'index.html');
          const destination = path.join(__dirname, 'dist/index.html');
          fs.mkdirSync(path.dirname(destination), { recursive: true });
          fs.copyFileSync(source, destination);
          console.log('HTML file copied successfully');
        });
      }
    }
  ],
  devServer: {
    static: {
      directory: path.join(__dirname, 'dist'),
    },
    compress: true,
    port: 3000,
  },
};