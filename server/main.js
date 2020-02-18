const http = require("http");
const { createWorker } = require("mediasoup");
const produceRtp = require("./lib/produce-rtp");

const mediaCodecs = [
  {
    kind: "video",
    name: "H264",
    mimeType: "video/H264",
    clockRate: 90000,
    parameters: {
      "packetization-mode": 1,
      "profile-level-id": "42e01f"
    }
  },
  {
    kind: "audio",
    mimeType: "audio/opus",
    clockRate: 48000,
    channels: 2
  }
];
const port = 3000;


(async () => {
  const worker = await createWorker();
  const router = await worker.createRouter({ mediaCodecs });
  console.log("router:", router.id);

  const { audioProducerId, videoProducerId } = await produceRtp(router);
  console.log({ audioProducerId, videoProducerId });

  const transportMap = new Map();
  http
    .createServer(async (req, res) => {
      res.writeHead(200, {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*"
      });

      const [url, qs] = req.url.split("?q=");
      const query = qs ? JSON.parse(decodeURIComponent(qs)) : {};

      console.log(`[req]: ${url}`);
      switch (url) {
        case "/rtpCapabilities": {
          res.end(JSON.stringify(router.rtpCapabilities));
          break;
        }
        case "/createTransport": {
          const transport = await router.createWebRtcTransport({ listenIps: ["127.0.0.1"] });
          transportMap.set(transport.id, transport);

          res.end(
            JSON.stringify({
              id: transport.id,
              iceParameters: transport.iceParameters,
              iceCandidates: transport.iceCandidates,
              dtlsParameters: transport.dtlsParameters
            })
          );
          break;
        }
        case "/transportConnect": {
          const { transportId, dtlsParameters } = query;
          const transport = transportMap.get(transportId);
          await transport.connect({ dtlsParameters });

          res.end(JSON.stringify({}));
          break;
        }
        case "/consume": {
          const { transportId, producerId, rtpCapabilities } = query;
          const transport = transportMap.get(transportId);
          const consumer = await transport.consume({
            producerId,
            rtpCapabilities
          });

          res.end(
            JSON.stringify({
              id: consumer.id,
              producerId,
              kind: consumer.kind,
              rtpParameters: consumer.rtpParameters
            })
          );
          break;
        }
        default:
          console.error("N/A route", url);
      }
    })
    .listen(port);

  console.log("server started at port", port);
})();
