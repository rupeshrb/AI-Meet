package com.videocall.repository;

import com.videocall.model.Meeting;
import org.springframework.data.mongodb.repository.MongoRepository;
import java.util.Optional;

public interface MeetingRepository extends MongoRepository<Meeting, String> {
    Optional<Meeting> findByIdAndPassword(String id, String password);
    Optional<Meeting> findByIdAndActiveTrue(String id);
}
