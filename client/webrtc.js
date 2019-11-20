console.log('webrtc.js loaded')

var localVideo
var localStream
var remoteVideo
var peerConnection
var uuid
var serverConnection

var peerConnectionConfig = {
  'iceServers': [
    { 'urls': 'stun:stun.stunprotocol.org:3478' },
    { 'urls': 'stun:stun.l.google.com:19302' }
  ]
}

function pageReady () {
  uuid = createUUID()

  localVideo = document.getElementById('localVideo')
  remoteVideo = document.getElementById('remoteVideo')

  serverConnection = new WebSocket('wss://' + window.location.host)
  serverConnection.onmessage = gotMessageFromServer
}

function start (isCaller) {
  peerConnection = new RTCPeerConnection(peerConnectionConfig) // needs internet
  peerConnection.onicecandidate = gotIceCandidate
  // peerConnection.ontrack = gotRemoteStream
  // peerConnection.addStream(localStream)

  if (isCaller) {
		
		sendChannel = peerConnection.createDataChannel('sendDataChannel')
		sendChannel.onopen = handleSendChannelStatusChange
		sendChannel.onclose = handleSendChannelStatusChange

    peerConnection.createOffer()
      .then(createDescription)
			.catch(errorHandler)
			
		setInterval(()=>{
			sendChannel.send('test')
		},1000)
  } else {
		peerConnection.ondatachannel = receiveChannelCallback
  }
}

function handleSendChannelStatusChange () {
  console.log('sendChannel.readyState', sendChannel.readyState)
}

function receiveChannelCallback(event){
	const receiveChannel = event.channel
	receiveChannel.onopen = () => {
		console.log('IT FUCKING WORKS!!@#!#!@#!@#!#!@#!@#')
	}
}

// message contains:
/*
 uuid, sdp or ice
*/
function gotMessageFromServer (message) {
  console.log('gotMessageFromServer')
  if (!peerConnection) start(false)

  var signal = JSON.parse(message.data)

  if (signal.uuid == uuid) return

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
        if (signal.sdp.type == 'offer') {
          peerConnection.createAnswer()	//
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

function gotRemoteStream (event) {
  console.log('got remote stream')
  remoteVideo.srcObject = event.streams[0]
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
