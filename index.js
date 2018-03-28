const {app, protocol} = require('electron')
const fs = require('fs')
const path = require('path')
const mime = require('mime')
const tryEach = require('async').tryEach


/**
 * Returns path for file from given URL.
 *
 * 'url' module is internally used to parse URLs. For *nix file
 * system URLs 'pathname' of parsed object is used. For Window,
 * however, local files start with a slash if no host is given
 * and this functions simply drops that leading slash with no
 * further complicated logic.
 *
 * @param  {String} url URL denoting file
 * @return {String} path to file
 */
function getPath (url) {
  let parsed = require('url').parse(url)
  let result = decodeURIComponent(parsed.pathname)

  // Local files in windows start with slash if no host is given
  if (process.platform === 'win32' && !parsed.host.trim()) {
    result = result.substr(1)
  }

  return result
}

/**
 * Default file handler
 *
 * @param {string} file Path to a local file
 * @param {function} cb Callback to call with file contents
 */
function defaultFileGet (file, cb) {
  fs.readFile(file, function handleFile (err, result) {
    if (err) {
      cb()
    } else {
      cb(result)
    }
  })
}

function createCallbackWrapper (file) {
  return function wrapCallback (fn) {
    return function wrappedCallback (cb) {
      fn(file
        ,function attemptCallback (data) {
          if (data) {
            cb(null, data)
          } else {
            cb(file+' not found')
          }
        }
      )
    }
  }
}

function createFetcher (file, callback) {
  return function fetcher (err, result) {
    if (!err){
      if (typeof result == 'string'){
        result = new Buffer(result)
      }
      callback({data: result, mimeType: mime.lookup(path.extname(file))})
    } else {
      console.error('MIDDLE: File not found: '+file)
    }
  }
}

function interceptor (request, callback) {
  let file = getPath(request.url)
  let wrapper = createCallbackWrapper(file)
  let fetcher = createFetcher(file, callback)
  let tries = stack.concat([defaultFileGet]).map(wrapper)
  tryEach( tries
    , fetcher
  )
}

let stack = []

function init () {
  app.on('ready'
    , function doInterceptBufferProtocol () {
      protocol.interceptBufferProtocol('file'
        , interceptor
        , function handleInterceptBufferProtocolError (error) {
          if (error)
            console.error('MIDDLE: electron-middle interceptor failed:', error)
        }
      )
    }
  )
}

module.exports = {
  get: function addToMiddleWareStack(fn) {stack.push(fn)}
}

init()