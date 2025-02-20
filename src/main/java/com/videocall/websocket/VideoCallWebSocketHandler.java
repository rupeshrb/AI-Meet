package com.videocall.websocket;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Component
public class VideoCallWebSocketHandler extends TextWebSocketHandler {
    private final Map<String, WebSocketSession> sessions = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public void handleTextMessage(WebSocketSession session, TextMessage message) {
        try {
            Map<String, Object> payload = objectMapper.readValue(message.getPayload(), Map.class);
            String type = (String) payload.get("type");
            Map<String, Object> data = (Map<String, Object>) payload.get("payload");

            switch (type) {
                case "join":
                    handleJoin(session, data);
                    break;
                case "webrtc_signal":
                    handleSignal(data);
                    break;
                case "chat":
                    handleChat(data);
                    break;
            }
        } catch (Exception e) {
            e.printStackTrace();
        }
    }

    private void handleJoin(WebSocketSession session, Map<String, Object> data) {
        String participantId = (String) data.get("participantId");
        sessions.put(participantId, session);
        
        // Notify others about the new participant
        broadcastToMeeting((String) data.get("meetingId"), 
                          "participant_joined", 
                          Map.of("participantId", participantId));
    }

    private void handleSignal(Map<String, Object> data) throws Exception {
        String to = (String) data.get("to");
        WebSocketSession recipientSession = sessions.get(to);
        if (recipientSession != null && recipientSession.isOpen()) {
            recipientSession.sendMessage(new TextMessage(objectMapper.writeValueAsString(data)));
        }
    }

    private void handleChat(Map<String, Object> data) {
        broadcastToMeeting((String) data.get("meetingId"), "chat", data);
    }

    private void broadcastToMeeting(String meetingId, String type, Map<String, Object> data) {
        sessions.values().forEach(session -> {
            try {
                if (session.isOpen()) {
                    session.sendMessage(new TextMessage(
                        objectMapper.writeValueAsString(Map.of(
                            "type", type,
                            "payload", data
                        ))
                    ));
                }
            } catch (Exception e) {
                e.printStackTrace();
            }
        });
    }
}
