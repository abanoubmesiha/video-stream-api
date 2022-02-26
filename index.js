const express = require('express');

const app = express();
const cors = require('cors');
const bodyParser = require('body-parser');
const webrtc = require('wrtc');

let senderStream;
const comments = [];

app.use(cors({
  origin: '*',
}));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

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

app.post('/comments', async ({ body }, res) => {
  const remoteConnection = new webrtc.RTCPeerConnection();
  remoteConnection.ondatachannel = (e) => {
    remoteConnection.dataChannel = e.channel;
    remoteConnection.dataChannel.onopen = () => console.log('Connection Opened');
    remoteConnection.dataChannel.onmessage = (ev) => console.log(`Just got a message${ev.data}`);
  };
  const offerDesc = new webrtc.RTCSessionDescription(body.offer);
  await remoteConnection.setRemoteDescription(offerDesc);
  const answer = await remoteConnection.createAnswer();
  await remoteConnection.setLocalDescription(answer);

  res.json({ answer: remoteConnection.localDescription });
});

app.listen(8000, () => console.log('Listening on port 8000...'));
