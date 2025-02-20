package com.videocall.repository;

import com.videocall.model.Participant;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.List;

public interface ParticipantRepository extends MongoRepository<Participant, String> {
    List<Participant> findByMeetingId(String meetingId);
    void deleteByMeetingId(String meetingId);
}
