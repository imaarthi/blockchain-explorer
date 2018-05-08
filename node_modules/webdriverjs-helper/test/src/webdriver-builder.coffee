webdriver = require 'selenium-webdriver'

getBrowser = (done) ->
    SeleniumServer = require('selenium-webdriver/remote').SeleniumServer
    server = new SeleniumServer 'test/resources/selenium-server-standalone-2.43.1.jar', { port: 4444 }
    server.start().then () ->
        builder = new webdriver.Builder().usingServer server.address()
        builder = builder.withCapabilities { browserName: 'firefox' }
        done builder

exports.getBrowser = getBrowser