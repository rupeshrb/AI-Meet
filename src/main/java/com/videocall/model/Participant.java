package com.videocall.model;

import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.mapping.Document;

@Document(collection = "participants")
public class Participant {
    @Id
    private String id;
    private String meetingId;
    private String name;
    private boolean isHost;

    // Getters and Setters
    public String getId() { return id; }
    public void setId(String id) { this.id = id; }
    
    public String getMeetingId() { return meetingId; }
    public void setMeetingId(String meetingId) { this.meetingId = meetingId; }
    
    public String getName() { return name; }
    public void setName(String name) { this.name = name; }
    
    public boolean isHost() { return isHost; }
    public void setHost(boolean host) { isHost = host; }
}
