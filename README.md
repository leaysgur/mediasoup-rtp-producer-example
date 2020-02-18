# mediasoup-rtp-producer-example

See also https://mediasoup.org/documentation/v3/communication-between-client-and-server/#producing-media-from-an-external-endpoint

## Strategy

- Use GStreamer as input source
  RTP endpoint
- Produce it on `PlainRtpTransport`
- Consume it from browser

## Try
```sh
cd server && npm start

# copy audio and video producer IDs

cd client && npm start
```

You may need to install several `gst-*` dependencies before started.
