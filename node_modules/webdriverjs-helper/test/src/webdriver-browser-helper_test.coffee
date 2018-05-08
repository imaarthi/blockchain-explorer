webdriver = require 'selenium-webdriver'
builder = require './webdriver-builder'
require('chai').should()
require '../../lib/webdriverjs-helper'

describe 'webdriver browser helper', ->

  driver = null
  host = 'http://localhost:9001'

  before (done) -> 
    builder.getBrowser (browser) ->
        driver = browser.build()
        done()

  beforeEach -> driver.get host
  after -> driver.quit()

  describe '#currentUrl', ->

    it 'could return current url', (done) ->
      driver.currentUrl (currUrl) ->
        currUrl.should.equal 'http://localhost:9001/'
        done()

    it 'could return current url object', (done) ->
      driver.navigateTo '/demo.html?a=1&b=2#c=1'
      driver.currentUrl (currUrl, url) ->
        url.protocol.should.equal 'http:'
        url.slashes.should.equal true
        url.host.should.equal 'localhost:9001'
        url.port.should.equal '9001'
        url.hostname.should.equal 'localhost'
        url.href.should.equal 'http://localhost:9001/demo.html?a=1&b=2#c=1'
        url.hash.should.equal '#c=1'
        url.search.should.equal '?a=1&b=2'
        url.query.should.equal 'a=1&b=2'
        url.pathname.should.equal '/demo.html'
        url.path.should.equal '/demo.html?a=1&b=2'
        done()

  describe '#navigateTo', ->

    it 'could redirect to target by absolute url', (done) ->
      driver.navigateTo '/demo.html'
      driver.element('body').text (text) ->
        text.should.contain 'this is a demo page !'
        done()

    it 'could redirect to target by relative url', (done) ->
      driver.navigateTo 'demo.html'
      driver.element('body').text (text) ->
        text.should.contain 'this is a demo page !'
        done()

  describe '#refresh', ->

    it 'could refresh driver', (done) ->
      selector = 'input[name="textbox"]';
      driver.input(selector).enter 'hello world'
      driver.refresh()
      driver.input(selector).value (val) ->
        val.should.be.empty
        done()

  describe '#sleep', ->

    it 'could sleep for a while', (done) ->
      driver.sleep(2000).then -> done()

  describe '#back', ->

    it 'could go back to the page in history', (done) ->
      selector = '#link'
      driver.element(selector).click()
      driver.back()
      driver.element('body').text (text) ->
        text.should.contain 'Go to demo'
        done()

  describe '#forward', ->

    it 'could go forward to the page in history', (done) ->
      selector = '#link'
      driver.element(selector).click()
      driver.back()
      driver.forward()
      driver.element('body').text (text) ->
        text.should.contain 'this is a demo page !'
        done()

  describe '#title', ->

    it 'could get title of current page', (done) ->
      driver.title (title) ->
        title.should.equal 'THIS IS INDEX'
        done()

  describe '#exec', ->

    it 'should run an executable javascript', (done) ->
      driver.exec 'alert("hello world!");', ->
        driver.dialog().text (text) ->
          text.should.equal 'hello world!'
          driver.dialog().dismiss -> done()

    it 'should run an executable javascript with args', (done) ->
      driver.exec 'alert(arguments[0][0]);', ['hello!'], ->
        driver.dialog().text (text) ->
          text.should.equal 'hello!'
          driver.dialog().dismiss -> done()

    it 'should run an executable javascript with webelement selector', (done) ->
      driver.exec 'alert(arguments[0][0].name)', driver.elements('input[type="checkbox"]')
      driver.dialog().text (text) ->
        text.should.equal 'checkbox'
        driver.dialog().dismiss -> done()

  describe '#execAsync', ->

    it 'should run an executable async javascript', (done) ->
      driver.manage().timeouts().setScriptTimeout(5000);
      driver.execAsync 'var callback = arguments[arguments.length - 1];setTimeout(function(){ callback(10); }, 500);', (num) ->
        num.should.equal 10
        done()

    it 'should run an executable async javascript with args', (done) ->
      driver.manage().timeouts().setScriptTimeout(5000);
      driver.execAsync 'var callback = arguments[arguments.length - 1];var str = arguments[0][0];setTimeout(function(){ callback(str); }, 500);', ['hello world'], (str) ->
        str.should.equal 'hello world'
        done()
    
    it 'should run an executable async javascript with webelement selector', (done) ->
      driver.manage().timeouts().setScriptTimeout(5000);
      driver.execAsync 'var callback = arguments[arguments.length - 1];var elem = arguments[0][0];setTimeout(function(){ callback(elem); }, 500);', driver.elements('input[type="checkbox"]'), (elem) ->
        elem.attr 'name', (name) -> 
          name.should.equal 'checkbox'
          done()   
