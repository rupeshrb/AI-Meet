import { useEffect, useRef, useState } from "react";
import { useParams, useLocation } from "wouter";
import { WebRTCConnection } from "@/lib/webrtc";
import { WebSocketConnection } from "@/lib/websocket";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import {
  Video, VideoOff, Mic, MicOff, MonitorUp,
  MessageSquare, PhoneOff
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";

interface ChatMessage {
  from: string;
  message: string;
}

interface Stream {
  camera: MediaStream | null;
  screen: MediaStream | null;
}

export default function MeetingRoom() {
  const { id: meetingId } = useParams();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const queryParams = new URLSearchParams(window.location.search);
  const participantId = queryParams.get("participantId");
  const [name, setName] = useState("");
  const [streams, setStreams] = useState<Stream>({
    camera: null,
    screen: null
  });
  const [isAudioEnabled, setIsAudioEnabled] = useState(true);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessage, setChatMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isEyeCorrectionEnabled, setIsEyeCorrectionEnabled] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const pipVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideosRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const wsRef = useRef<WebSocketConnection>();
  const rtcConnectionsRef = useRef<Map<string, WebRTCConnection>>(new Map());

  const { data: participants } = useQuery({
    queryKey: [`/api/meetings/${meetingId}/participants`]
  });

  useEffect(() => {
    const currentParticipant = participants?.participants.find(
      (p: any) => p.id === participantId
    );
    if (currentParticipant) {
      setName(currentParticipant.name);
    }
  }, [participants, participantId]);

  const initializeCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      setStreams(prev => ({ ...prev, camera: stream }));
      return stream;
    } catch (error) {
      console.error("Failed to access camera:", error);
      toast({
        title: "Error",
        description: "Failed to access camera",
        variant: "destructive"
      });
      return null;
    }
  };

  const updateVideoStreams = () => {
    if (localVideoRef.current && streams.camera) {
      localVideoRef.current.srcObject = streams.camera;
    }

    if (streams.screen) {
      // When screen sharing is active, show screen in main video and camera in PiP
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = streams.screen;
      }
      if (pipVideoRef.current && streams.camera) {
        pipVideoRef.current.srcObject = streams.camera;
      }
    } else {
      // When only camera is active, show camera in main video
      if (localVideoRef.current && streams.camera) {
        localVideoRef.current.srcObject = streams.camera;
      }
      if (pipVideoRef.current) {
        pipVideoRef.current.srcObject = null;
      }
    }
  };

  // Effect to update video streams whenever streams change
  useEffect(() => {
    updateVideoStreams();
  }, [streams.camera, streams.screen]);

  const toggleCamera = async () => {
    if (!streams.camera) {
      const newStream = await initializeCamera();
      if (newStream) {
        setStreams(prev => ({ ...prev, camera: newStream }));
      }
    } else {
      streams.camera.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      setStreams(prev => ({ ...prev, camera: null }));
    }
  };

  const toggleAudio = () => {
    if (streams.camera) {
      streams.camera.getAudioTracks().forEach(track => {
        track.enabled = !isAudioEnabled;
      });
      setIsAudioEnabled(!isAudioEnabled);
    }
  };

  const toggleScreenShare = async () => {
    try {
      if (!streams.screen) {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({
          video: true
        });

        // Handle when user stops sharing through browser controls
        screenStream.getVideoTracks()[0].onended = () => {
          setStreams(prev => ({ ...prev, screen: null }));
        };

        setStreams(prev => ({ ...prev, screen: screenStream }));
      } else {
        streams.screen.getTracks().forEach(track => track.stop());
        setStreams(prev => ({ ...prev, screen: null }));
      }
    } catch (error) {
      if (error instanceof Error && error.name === "NotAllowedError") {
        return;
      }
      console.error("Screen share error:", error);
      toast({
        title: "Error",
        description: "Failed to share screen",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    if (!participantId || !meetingId) {
      setLocation("/");
      return;
    }

    const ws = new WebSocketConnection();
    wsRef.current = ws;

    ws.send("join", { participantId, meetingId });

    ws.onMessage("webrtc_signal", async ({ from, signal }) => {
      let connection = rtcConnectionsRef.current.get(from);

      if (!connection) {
        connection = createRTCConnection(from);
        rtcConnectionsRef.current.set(from, connection);
      }

      if (signal.type === "offer") {
        await connection.handleOffer(signal.offer);
      } else if (signal.type === "answer") {
        await connection.handleAnswer(signal.answer);
      } else if (signal.type === "candidate") {
        await connection.handleCandidate(signal.candidate);
      }
    });

    ws.onMessage("participant_joined", async ({ participantId: newParticipantId }) => {
      const connection = createRTCConnection(newParticipantId);
      rtcConnectionsRef.current.set(newParticipantId, connection);
      await connection.createOffer();
    });

    ws.onMessage("participant_left", ({ participantId }) => {
      const connection = rtcConnectionsRef.current.get(participantId);
      if (connection) {
        connection.cleanup();
        rtcConnectionsRef.current.delete(participantId);
      }
    });

    ws.onMessage("chat", ({ from, message }) => {
      setMessages((prev) => [...prev, { from, message }]);
    });

    initializeCamera();

    return () => {
      Object.values(streams).forEach(stream => {
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      });
      setStreams({ camera: null, screen: null });
      ws.close();
      rtcConnectionsRef.current.forEach((connection) => connection.cleanup());
    };
  }, [meetingId, participantId]);

  const createRTCConnection = (peerId: string) => {
    const connection = new WebRTCConnection(
      (signal) => {
        wsRef.current?.send("webrtc_signal", {
          to: peerId,
          from: participantId,
          signal
        });
      },
      (stream) => {
        const videoEl = remoteVideosRef.current.get(peerId);
        if (videoEl) {
          videoEl.srcObject = stream;
        }
      }
    );
    return connection;
  };

  const sendChatMessage = () => {
    if (chatMessage.trim()) {
      wsRef.current?.send("chat", {
        meetingId,
        from: name,
        message: chatMessage
      });
      setMessages((prev) => [...prev, { from: "You", message: chatMessage }]);
      setChatMessage("");
    }
  };

  const leaveMeeting = () => {
    Object.values(streams).forEach(stream => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    });
    setStreams({ camera: null, screen: null });
    rtcConnectionsRef.current.forEach((connection) => connection.cleanup());
    wsRef.current?.close();
    setLocation("/");
  };

  const toggleEyeCorrection = () => {
    setIsEyeCorrectionEnabled(!isEyeCorrectionEnabled);
    // Update eye correction in WebRTC connections
    rtcConnectionsRef.current.forEach((connection) => {
      connection.setEyeCorrectionEnabled(!isEyeCorrectionEnabled);
    });
  };

  return (
    <div className="h-screen bg-background flex">
      <div className="flex-1 flex flex-col">
        <div className="flex-1 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
          <Card className="relative aspect-video col-span-2">
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover rounded-lg"
            />
            {/* Show PiP when screen sharing is active and camera is available */}
            {streams.screen && streams.camera && (
              <div className="absolute bottom-4 right-4 w-48 aspect-video bg-black rounded-lg overflow-hidden shadow-lg border-2 border-white">
                <video
                  ref={pipVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
              {name || "You"}
            </div>
            {/* Always show eye correction button when camera is available */}
            {streams.camera && (
              <Button
                variant={isEyeCorrectionEnabled ? "destructive" : "secondary"}
                size="sm"
                onClick={toggleEyeCorrection}
                className="absolute top-2 right-2"
              >
                Eye Correction: {isEyeCorrectionEnabled ? "On" : "Off"}
              </Button>
            )}
          </Card>

          {participants?.participants
            .filter((participant: any) => participant.id !== participantId)
            .map((participant: any) => (
              <Card key={participant.id} className="relative aspect-video">
                <video
                  ref={(el) => {
                    if (el) remoteVideosRef.current.set(participant.id, el);
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover rounded-lg"
                />
                <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-white text-sm">
                  {participant.name}
                </div>
              </Card>
            ))}
        </div>

        <div className="h-16 border-t flex items-center justify-center gap-4 px-4">
          <Button
            variant={!streams.camera ? "destructive" : "default"}
            size="icon"
            onClick={toggleCamera}
          >
            {streams.camera ? (
              <Video className="h-5 w-5" />
            ) : (
              <VideoOff className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant={isAudioEnabled ? "default" : "destructive"}
            size="icon"
            onClick={toggleAudio}
          >
            {isAudioEnabled ? (
              <Mic className="h-5 w-5" />
            ) : (
              <MicOff className="h-5 w-5" />
            )}
          </Button>
          <Button
            variant={streams.screen ? "destructive" : "default"}
            size="icon"
            onClick={toggleScreenShare}
          >
            <MonitorUp className="h-5 w-5" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setIsChatOpen(!isChatOpen)}
          >
            <MessageSquare className="h-5 w-5" />
          </Button>
          <Button
            variant="destructive"
            size="icon"
            onClick={leaveMeeting}
          >
            <PhoneOff className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {isChatOpen && (
        <div className="w-80 border-l bg-card flex flex-col">
          <div className="p-4 border-b flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            <h2 className="font-semibold">Chat</h2>
          </div>
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.map((msg, i) => (
                <div key={i} className="space-y-1">
                  <div className="font-medium text-sm">{msg.from}</div>
                  <div className="bg-muted p-2 rounded-lg text-sm">
                    {msg.message}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          <div className="p-4 border-t">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendChatMessage();
              }}
              className="flex gap-2"
            >
              <Input
                value={chatMessage}
                onChange={(e) => setChatMessage(e.target.value)}
                placeholder="Type a message..."
              />
              <Button type="submit">Send</Button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}