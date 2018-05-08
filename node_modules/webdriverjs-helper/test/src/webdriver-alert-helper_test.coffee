webdriver = require 'selenium-webdriver'
builder = require './webdriver-builder'

should = require('chai').should()
require '../../lib/webdriverjs-helper'

describe 'webdriver alert helper', ->

  driver = null
  host = 'http://localhost:9001'

  before (done) -> 
    builder.getBrowser (browser) ->
        driver = browser.build()
        done()

  beforeEach -> driver.get host
  after -> driver.quit()

  describe 'alert dialog', ->

    describe '#text', ->

      it 'could return text of alert window', (done) ->
        driver.input('#alert-btn').click()
        driver.dialog().text (text) ->
          driver.dialog().dismiss()
          text.should.equal 'button clicked!!!!'
          done()

    describe '#dismiss', ->

      it 'could cancel the alert dialog', (done) ->
        driver.input('#alert-btn').click()
        driver.dialog().dismiss -> done()

  describe 'confirm dialog', ->

    describe '#accept', ->

      it 'could accept the confirm dialog', (done) ->
        driver.input('#confirm-btn').click()
        driver.dialog().accept()
        driver.element('body').text (text) ->
          text.should.contain 'I am ok!'
          done()

    describe '#dismiss', ->

      it 'could cancel the confirm dialog', (done) ->
        driver.input('#confirm-btn').click()
        driver.dialog().dismiss()
        driver.element('body').text (text) ->
          text.should.not.contain 'I am ok!'
          done()

  describe 'prompt dialog', ->

    describe '#enter', ->

      it 'could enter text', (done) ->
        driver.input('#prompt-btn').click()
        driver.dialog().enter 'your name!'
        driver.dialog().accept()
        driver.element('body').text (text) ->
          text.should.contain 'your name!'
          done()



      
      
        