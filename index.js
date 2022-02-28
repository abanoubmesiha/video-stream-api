const express = require('express');

const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const webrtc = require('wrtc');

let senderStream;
const remoteConnections = [];

app.use(cors({ origin: '*' }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const sendToAllRemoteConnections = (message) => {
  remoteConnections.forEach((rc) => {
    rc.dataChannel.send(message);
  });
};

app.post('/consumer', async ({ body }, res) => {
  const peer = new webrtc.RTCPeerConnection({
    iceServers: [
      {
        urls: 'stun:stun.stunprotocol.org',
      },
    ],
  });
  const desc = new webrtc.RTCSessionDescription(body.sdp);
  await peer.setRemoteDescription(desc);
  senderStream?.getTracks().forEach((track) => peer.addTrack(track, senderStream));
  peer.ondatachannel = (e) => {
    peer.dataChannel = e.channel;
    peer.dataChannel.onopen = () => {
      remoteConnections.push(peer);
      peer.dataChannel.send(JSON.stringify({
        body: 'Hi from server',
        timestamp: new Date(),
        id: Math.random().toString().slice(2, -1),
        connectionOwnerId: 'Server',
      }));
    };
    peer.dataChannel.onmessage = (ev) => {
      sendToAllRemoteConnections(ev.data);
    };
  };
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  const payload = {
    sdp: peer.localDescription,
  };

  res.json(payload);
});

app.post('/broadcast', async ({ body }, res) => {
  const peer = new webrtc.RTCPeerConnection({
    iceServers: [
      {
        urls: 'stun:stun.stunprotocol.org',
      },
    ],
  });
  peer.ontrack = (e) => { [senderStream] = e.streams; };
  const desc = new webrtc.RTCSessionDescription(body.sdp);
  await peer.setRemoteDescription(desc);
  const answer = await peer.createAnswer();
  await peer.setLocalDescription(answer);
  const payload = {
    sdp: peer.localDescription,
  };

  res.json(payload);
});

app.listen(8000, () => console.log('Listening on port 8000...'));
