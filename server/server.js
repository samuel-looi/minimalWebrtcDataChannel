const HTTPS_PORT = 8443

const fs = require('fs')
const https = require('https')
const WebSocket = require('ws')
const WebSocketServer = WebSocket.Server

// Yes, TLS is required
const serverConfig = {
  key: fs.readFileSync('key.pem'),
  cert: fs.readFileSync('cert.pem')
}

// ----------------------------------------------------------------------------------------

// Create a server for the client html page
const handleRequest = function (request, response) {
  // Render the single client html file for any request the HTTP server receives
  console.log('request received: ' + request.url)

  if (request.url === '/') {
    response.writeHead(200, { 'Content-Type': 'text/html' })
    response.end(fs.readFileSync('client/index.html'))
  } else if (request.url === '/webrtc.js') {
    response.writeHead(200, { 'Content-Type': 'application/javascript' })
    response.end(fs.readFileSync('client/webrtc.js'))
  } else if (request.url === '/main.css') {
    response.writeHead(200, { 'Content-Type': 'text/css' })
    response.end(fs.readFileSync('client/main.css'))
  }
}

const httpsServer = https.createServer(serverConfig, handleRequest)
httpsServer.listen(HTTPS_PORT, '0.0.0.0')

const wss = new WebSocketServer({ server: httpsServer })

wss.on('connection', ws => {
	console.log('New Connection')
  ws.on('message', message => {
    console.log('received %s', message)
    wss.broadcast(message)
  })
})

wss.broadcast = data => {
  wss.clients.forEach(ws => {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data)
    }
  })
}
console.log('Server running on port https://localhost:%d', HTTPS_PORT)
