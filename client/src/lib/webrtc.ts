import { VideoFrame } from 'mediasoup-client';

export class WebRTCConnection {
  private peerConnection: RTCPeerConnection;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private eyeCorrectionCanvas: HTMLCanvasElement;
  private isEyeCorrectionEnabled: boolean = true;

  constructor(
    private onSignal: (signal: any) => void,
    private onStream: (stream: MediaStream) => void
  ) {
    this.peerConnection = new RTCPeerConnection({
      iceServers: [{ urls: "stun:stun.l.google.com:19302" }]
    });

    this.peerConnection.ontrack = ({ streams: [stream] }) => {
      this.remoteStream = stream;
      this.onStream(stream);
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.onSignal({
          type: "candidate",
          candidate: event.candidate
        });
      }
    };

    // Create canvas for eye correction processing
    this.eyeCorrectionCanvas = document.createElement('canvas');
    this.eyeCorrectionCanvas.width = 640;
    this.eyeCorrectionCanvas.height = 480;
  }

  async initializeLocalStream(video: boolean = true, audio: boolean = true) {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video,
        audio
      });

      if (video) {
        const videoTrack = this.localStream.getVideoTracks()[0];
        const processedTrack = await this.createProcessedVideoTrack(videoTrack);
        this.localStream.removeTrack(videoTrack);
        this.localStream.addTrack(processedTrack);
      }

      this.localStream.getTracks().forEach((track) => {
        if (this.localStream) {
          this.peerConnection.addTrack(track, this.localStream);
        }
      });

      return this.localStream;
    } catch (error) {
      console.error("Error initializing stream:", error);
      throw error;
    }
  }

  private async createProcessedVideoTrack(videoTrack: MediaStreamTrack): Promise<MediaStreamTrack> {
    const ctx = this.eyeCorrectionCanvas.getContext('2d')!;
    const frameRate = 30;
    const processFrame = async () => {
      try {
        if (!videoTrack.readyState === 'live') {
          return;
        }

        // Capture frame to canvas
        const imageCapture = new ImageCapture(videoTrack);
        const frame = await imageCapture.grabFrame();

        if (this.isEyeCorrectionEnabled) {
          // Draw frame to canvas for processing
          ctx.drawImage(frame, 0, 0, this.eyeCorrectionCanvas.width, this.eyeCorrectionCanvas.height);
          // Convert canvas to base64
          const base64Image = this.eyeCorrectionCanvas.toDataURL('image/jpeg', 0.8).split(',')[1];
          
          // Send to Java eye correction service
          const response = await fetch('/api/eye-correction/process-frame', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify(base64Image)
          });

          if (response.ok) {
            const correctedBase64 = await response.text();
            const correctedImage = await createImageBitmap(
              await fetch(`data:image/jpeg;base64,${correctedBase64}`).then(r => r.blob())
            );
            ctx.clearRect(0, 0, this.eyeCorrectionCanvas.width, this.eyeCorrectionCanvas.height);
            ctx.drawImage(correctedImage, 0, 0);
          }
        }
      } catch (error) {
        console.error('Error processing frame:', error);
      }
    };

    // Create output stream from canvas
    const stream = this.eyeCorrectionCanvas.captureStream(frameRate);
    const processedTrack = stream.getVideoTracks()[0];

    // Start frame processing loop
    const processFrameLoop = async () => {
      await processFrame();
      requestAnimationFrame(processFrameLoop);
    };
    processFrameLoop();

    // Return the processed track
    return processedTrack;
  }

  async setEyeCorrectionEnabled(enabled: boolean) {
    this.isEyeCorrectionEnabled = enabled;
    // Notify Java service about eye correction toggle
    await fetch('/api/eye-correction/toggle', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(enabled)
    });
  }

  async createOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.onSignal({
      type: "offer",
      offer
    });
  }

  async handleOffer(offer: RTCSessionDescriptionInit) {
    await this.peerConnection.setRemoteDescription(offer);
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.onSignal({
      type: "answer",
      answer
    });
  }

  async handleAnswer(answer: RTCSessionDescriptionInit) {
    await this.peerConnection.setRemoteDescription(answer);
  }

  async handleCandidate(candidate: RTCIceCandidateInit) {
    await this.peerConnection.addIceCandidate(candidate);
  }

  toggleVideo(enabled: boolean) {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  toggleAudio(enabled: boolean) {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = enabled;
    });
  }

  async startScreenShare() {
    try {
      const screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: true
      });

      // Replace video track
      const [videoTrack] = screenStream.getVideoTracks();
      const senders = this.peerConnection.getSenders();
      const videoSender = senders.find((sender) => 
        sender.track?.kind === "video"
      );

      if (videoSender) {
        videoSender.replaceTrack(videoTrack);
      }

      return screenStream;
    } catch (error) {
      console.error("Error sharing screen:", error);
      throw error;
    }
  }

  cleanup() {
    this.localStream?.getTracks().forEach((track) => track.stop());
    this.peerConnection.close();
  }
}