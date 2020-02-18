const { spawn } = require("child_process");

module.exports = async router => {
  const audioTransport = await router.createPlainRtpTransport({
    listenIp: "127.0.0.1",
    rtcpMux: false,
    comedia: true
  });

  const videoTransport = await router.createPlainRtpTransport({
    listenIp: "127.0.0.1",
    rtcpMux: false,
    comedia: true
  });

  const audioProducer = await audioTransport.produce({
    kind: "audio",
    rtpParameters: {
      codecs: [
        {
          mimeType: "audio/opus",
          clockRate: 48000,
          payloadType: 101,
          channels: 2,
          rtcpFeedback: [],
          parameters: {}
        }
      ],
      encodings: [{ ssrc: 1 }]
    }
  });

  const videoProducer = await videoTransport.produce({
    kind: "video",
    rtpParameters: {
      codecs: [
        {
          mimeType: "video/H264",
          clockRate: 90000,
          payloadType: 102,
          rtcpFeedback: [],
          parameters: {
            "packetization-mode": 1,
            "profile-level-id": "42e01f"
          }
        }
      ],
      encodings: [{ ssrc: 2 }]
    }
  });

  spawnGstRtpInputSource({
    host: "127.0.0.1",
    audioRtpPort: audioTransport.tuple.localPort,
    audioRtcpPort: audioTransport.rtcpTuple.localPort,
    videoRtpPort: videoTransport.tuple.localPort,
    videoRtcpPort: videoTransport.rtcpTuple.localPort
  });

  return {
    audioProducerId: audioProducer.id,
    videoProducerId: videoProducer.id
  };
};

const spawnGstRtpInputSource = ({
  host,
  audioRtpPort,
  audioRtcpPort,
  videoRtpPort,
  videoRtcpPort
}) => {
  const command = "gst-launch-1.0";
  const args = [
    "-v",
    "rtpbin name=rtpbin",
    "audiotestsrc is-live=true ! opusenc ! rtpopuspay pt=101 ssrc=1 ! rtpbin.send_rtp_sink_0",
    "videotestsrc is-live=true ! x264enc bitrate=1000 key-int-max=60 speed-preset=veryfast tune=zerolatency ! video/x-h264,profile=baseline ! rtph264pay pt=102 ssrc=2 ! rtpbin.send_rtp_sink_1",
    `rtpbin.send_rtp_src_0  ! udpsink host=${host} port=${audioRtpPort}`,
    `rtpbin.send_rtcp_src_0 ! udpsink host=${host} port=${audioRtcpPort} sync=false async=false`,
    `rtpbin.send_rtp_src_1  ! udpsink host=${host} port=${videoRtpPort}`,
    `rtpbin.send_rtcp_src_1 ! udpsink host=${host} port=${videoRtcpPort} sync=false async=false`
  ]
    .map(a => a.split(" "))
    .flat();

  return spawn(command, args);
};
