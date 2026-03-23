// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html

const fs = require('fs');

// Prefer existing browser binaries in Linux dev/CI environments when CHROME_BIN is not set
if (!process.env.CHROME_BIN) {
  const fallbackChromePaths = [
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/usr/sbin/chromium'
  ];

  const discoveredChromePath = fallbackChromePaths.find((path) => fs.existsSync(path));

  if (discoveredChromePath) {
    process.env.CHROME_BIN = discoveredChromePath;
  }
}

module.exports = function (config) {
  const isRootUser = typeof process.getuid === 'function' && process.getuid() === 0;
  const localChromeFlags = [
    '--disable-dev-shm-usage',
    '--disable-background-timer-throttling'
  ];

  if (isRootUser) {
    localChromeFlags.unshift('--no-sandbox', '--disable-setuid-sandbox');
  }

  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/client'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'lcovonly' },
        { type: 'text-summary' }
      ],
      check: {
        emitWarning: false,
        global: {
          statements: 80,
          lines: 80,
          branches: 80,
          functions: 80
        }
      }
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['ChromeLocal'],
    customLaunchers: {
      ChromeLocal: {
        base: 'Chrome',
        flags: localChromeFlags
      },
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
          '--disable-gpu'
        ]
      }
    },
    singleRun: false,
    restartOnFileChange: true
  });
};
