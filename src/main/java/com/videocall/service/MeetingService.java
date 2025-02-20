package com.videocall.service;

import com.videocall.model.Meeting;
import com.videocall.model.Participant;
import com.videocall.repository.MeetingRepository;
import com.videocall.repository.ParticipantRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
public class MeetingService {
    @Autowired
    private MeetingRepository meetingRepository;
    
    @Autowired
    private ParticipantRepository participantRepository;

    public Meeting createMeeting(String id, String password, String hostId) {
        Meeting meeting = new Meeting();
        meeting.setId(id);
        meeting.setPassword(password);
        meeting.setHostId(hostId);
        meeting.setActive(true);
        meeting.setCreatedAt(LocalDateTime.now());
        return meetingRepository.save(meeting);
    }

    public boolean validateMeeting(String id, String password) {
        Optional<Meeting> meeting = meetingRepository.findByIdAndPassword(id, password);
        return meeting.map(Meeting::isActive).orElse(false);
    }

    public Participant addParticipant(String id, String meetingId, String name, boolean isHost) {
        Participant participant = new Participant();
        participant.setId(id);
        participant.setMeetingId(meetingId);
        participant.setName(name);
        participant.setHost(isHost);
        return participantRepository.save(participant);
    }

    public List<Participant> getParticipants(String meetingId) {
        return participantRepository.findByMeetingId(meetingId);
    }

    public void removeParticipant(String id) {
        participantRepository.deleteById(id);
    }

    public void deactivateMeeting(String id) {
        meetingRepository.findById(id).ifPresent(meeting -> {
            meeting.setActive(false);
            meetingRepository.save(meeting);
        });
    }
}
