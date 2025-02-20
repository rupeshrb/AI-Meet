package com.videocall.controller;

import com.videocall.model.Meeting;
import com.videocall.model.Participant;
import com.videocall.service.MeetingService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import java.util.List;

@RestController
@RequestMapping("/api/meetings")
public class MeetingController {
    
    @Autowired
    private MeetingService meetingService;

    @PostMapping
    public ResponseEntity<?> createMeeting(@RequestBody Map<String, String> request) {
        Meeting meeting = meetingService.createMeeting(
            request.get("id"),
            request.get("password"),
            request.get("hostId")
        );
        return ResponseEntity.ok(Map.of("meeting", meeting));
    }

    @PostMapping("/join")
    public ResponseEntity<?> joinMeeting(@RequestBody Map<String, Object> request) {
        String meetingId = (String) request.get("meetingId");
        String password = (String) request.get("password");
        
        if (!meetingService.validateMeeting(meetingId, password)) {
            return ResponseEntity.status(403)
                               .body(Map.of("error", "Invalid meeting ID or password"));
        }

        Participant participant = meetingService.addParticipant(
            java.util.UUID.randomUUID().toString(),
            meetingId,
            (String) request.get("name"),
            (Boolean) request.get("isHost")
        );

        return ResponseEntity.ok(Map.of("participant", participant));
    }

    @GetMapping("/{id}/participants")
    public ResponseEntity<?> getParticipants(@PathVariable String id) {
        List<Participant> participants = meetingService.getParticipants(id);
        return ResponseEntity.ok(Map.of("participants", participants));
    }
}
