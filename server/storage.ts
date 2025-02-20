import { Meeting, InsertMeeting, Participant, InsertParticipant } from "@shared/schema";

export interface IStorage {
  createMeeting(meeting: InsertMeeting): Promise<Meeting>;
  getMeeting(id: string): Promise<Meeting | undefined>;
  validateMeeting(id: string, password: string): Promise<boolean>;
  addParticipant(participant: InsertParticipant): Promise<Participant>;
  getParticipants(meetingId: string): Promise<Participant[]>;
  removeParticipant(id: string): Promise<void>;
  deactivateMeeting(id: string): Promise<void>;
}

export class MemStorage implements IStorage {
  private meetings: Map<string, Meeting>;
  private participants: Map<string, Participant>;

  constructor() {
    this.meetings = new Map();
    this.participants = new Map();
  }

  async createMeeting(meeting: InsertMeeting): Promise<Meeting> {
    const newMeeting: Meeting = {
      ...meeting,
      active: true,
      createdAt: new Date()
    };
    this.meetings.set(meeting.id, newMeeting);
    return newMeeting;
  }

  async getMeeting(id: string): Promise<Meeting | undefined> {
    return this.meetings.get(id);
  }

  async validateMeeting(id: string, password: string): Promise<boolean> {
    const meeting = await this.getMeeting(id);
    return meeting?.password === password && meeting.active;
  }

  async addParticipant(participant: InsertParticipant): Promise<Participant> {
    this.participants.set(participant.id, participant);
    return participant;
  }

  async getParticipants(meetingId: string): Promise<Participant[]> {
    return Array.from(this.participants.values()).filter(
      (p) => p.meetingId === meetingId
    );
  }

  async removeParticipant(id: string): Promise<void> {
    this.participants.delete(id);
  }

  async deactivateMeeting(id: string): Promise<void> {
    const meeting = this.meetings.get(id);
    if (meeting) {
      this.meetings.set(id, { ...meeting, active: false });
    }
  }
}

export const storage = new MemStorage();
