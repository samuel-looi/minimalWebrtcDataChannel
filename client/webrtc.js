console.log('webrtc.js loaded')
// WEBRTC CONNECTION

var peerConnection
var uuid
var serverConnection
var sendChannel
const container = document.getElementById('container')
var peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' }
  ]
}
var isHost = false

// GAME VARIABLES

const spawn = {
  x: 10,
  y: 10
}
const player = {
  accel: 1,
  delY: 0,
  delX: 0,
  x: spawn.x,
  xVel: 0,
  y: spawn.y,
  yVel: 0,
  r: 10
}
var otherPlayer = {
  x: spawn.x,
  y: spawn.y
}
const keyPressed = {
  w: false,
  s: false,
  a: false,
  d: false
}
// CANVAS

const canvas = document.createElement('canvas')// document.getElementById('canvasContainer')
canvas.width = 300
canvas.height = 300
const fWidth = canvas.width
const fHeight = canvas.height
document.getElementById('canvasContainer').appendChild(canvas)
const c = canvas.getContext('2d')

const eAngle = 2 * 3.1416// Math.PI

function drawCirlce (x, y, r) {
  c.beginPath()
  c.arc(x, y, r, 0, eAngle)
  c.stroke()
}
// drawCirlce(50, 50, 10)

// MAIN CODE

function pageReady () {
  uuid = createUUID()

  serverConnection = new WebSocket('wss://' + window.location.host)
  serverConnection.onmessage = gotMessageFromServer
}

function start (isCaller) {
  isHost = isCaller
  peerConnection = new RTCPeerConnection(peerConnectionConfig) // needs internet
  peerConnection.onicecandidate = gotIceCandidate
  // peerConnection.ontrack = gotRemoteStream
  // peerConnection.addStream(localStream)

  if (isCaller) {
    sendChannel = peerConnection.createDataChannel('sendDataChannel')
    sendChannel.onopen = sendChannelOnOpen
    sendChannel.onclose = sendChannelOnClose
    sendChannel.onmessage = hostOnMessage

    peerConnection.createOffer()
      .then(createDescription)
      .catch(errorHandler)
  } else {
    peerConnection.ondatachannel = receiveChannelCallback
  }
}

function hostOnMessage (event) {
  // console.log('testing', event)

  otherPlayer = JSON.parse(event.data)
}

function sendChannelOnOpen () {
  tick()
  console.log('sendChannel.readyState', sendChannel.readyState)
}

function sendChannelOnClose () {
  console.log('sendChannel.readyState', sendChannel.readyState)
}

function receiveChannelCallback (event) {
  const receiveChannel = event.channel
  receiveChannel.onopen = () => {
    tick()
    // console.log('IT FUCKING WORKS!!@#!#!@#!@#!#!@#!@#')
  }
  receiveChannel.onmessage = (event) => {
    // console.log('event', event)
    container.innerHTML = event.data

    otherPlayer = JSON.parse(event.data)
    // console.log('adslkasdjklasjd')
    receiveChannel.send(JSON.stringify({ x: player.x, y: player.y }))
  }
}

document.addEventListener('keydown', (e) => {
  const key = e.key.toLowerCase()
  // console.log(key)
  keyPressed[key] = true
  // console.log('keyPressed', keyPressed)
})
document.addEventListener('keyup', (e) => {
  const key = e.key.toLowerCase()
  // console.log(key)
  keyPressed[key] = false
  // console.log('keyPressed', keyPressed)
})

function tick () {
  updatePlayerPos()
  render()

  if (isHost) {
    sendChannel.send(JSON.stringify({ x: player.x, y: player.y }))
  } else {

  }

  requestAnimationFrame(tick)
}

function updatePlayerPos () {
  player.yVel *= 0.9
  player.xVel *= 0.9
  if (keyPressed.w) {
    if (Math.abs(player.yVel) < 2) { player.yVel -= player.accel }
  } else if (keyPressed.s) {
    if (Math.abs(player.yVel) < 2) { player.yVel += player.accel }
  }
  if (keyPressed.a) {
    if (Math.abs(player.xVel) < 2) { player.xVel -= player.accel }
  } else if (keyPressed.d) {
    if (Math.abs(player.xVel) < 2) { player.xVel += player.accel }
  }
  player.y += player.yVel
  player.x += player.xVel
}

function render () {
  c.clearRect(0, 0, fWidth, fHeight)
  // console.log(player)
  drawCirlce(player.x, player.y, player.r)
  drawCirlce(otherPlayer.x, otherPlayer.y, player.r)
}
// message contains:
/*
 uuid, sdp or ice
*/
function gotMessageFromServer (message) {
  console.log('gotMessageFromServer')
  if (!peerConnection) start(false)

  var signal = JSON.parse(message.data)

  if (signal.uuid === uuid) return

  //! !! IDK
  // Only two messages are sent through the signalling server:
  // 1) sdp - description thing
  // 2) ice candidate
  if (signal.sdp) {
    console.log('signal.sdp is true')
    // why do we need this?
    peerConnection.setRemoteDescription(signal.sdp)
      .then(() => {
        // So if peer is OFFERing then we should ANSWER it
        if (signal.sdp.type === 'offer') {
          peerConnection.createAnswer() //
            .then(createDescription)
            .catch(errorHandler)
        }
      })
  } else if (signal.ice) {
    console.log('signal.sdp is false')
    // what do ice candidates do and why are they needed?
    // adds this new remote candidate to the RTCPeerConnection's remote description, which describes the state of the remote end of the connection.
    peerConnection.addIceCandidate(signal.ice)
      .catch(errorHandler)
  }
}

// SET AND SEND SDP
function createDescription (description) {
  // ONLY CREATE BY CALLER
  console.log('got description', description)

  // Get info from ice server and use it
  peerConnection.setLocalDescription(description)
    .then(() => {
      console.log('peerConnection.localDescription', peerConnection.localDescription)
      serverConnection.send(JSON.stringify({ 'sdp': peerConnection.localDescription, 'uuid': uuid }))
    })
    .catch(errorHandler)
}

function gotIceCandidate (event) {
  console.log('gotIceCandidate')
  // If got connection, send
  if (event.candidate != null) {
    //! !! DOESN'T SEND sdp
    // I THINK. So event.candidate is from the stun server, and you're sending that to the other dude
    serverConnection.send(JSON.stringify({ 'ice': event.candidate, 'uuid': uuid }))
  }
}

function errorHandler (error) {
  console.log('error', error)
}

function createUUID () {
  function s4 () {
    return Math.floor((1 + Math.random()) * 0x10000).toString(16).substring(1)
  }
  return s4() + s4() + '-' + s4() + '-' + s4() + '-' + s4() + '-' + s4() + s4() + s4()
}
