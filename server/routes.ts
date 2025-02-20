import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { nanoid } from "nanoid";
import { insertMeetingSchema, joinMeetingSchema } from "@shared/schema";
import { z } from "zod";

interface WebSocketMessage {
  type: string;
  payload: any;
}

interface ConnectedClient {
  ws: WebSocket;
  participantId: string;
  meetingId: string;
}

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  const wss = new WebSocketServer({ server: httpServer, path: "/ws" });
  const connectedClients = new Map<string, ConnectedClient>();

  app.post("/api/meetings", async (req, res) => {
    try {
      const meetingData = insertMeetingSchema.parse({
        id: nanoid(6),
        password: req.body.password,
        hostId: nanoid()
      });
      const meeting = await storage.createMeeting(meetingData);
      res.json({ meeting });
    } catch (error) {
      res.status(400).json({ error: "Invalid meeting data" });
    }
  });

  app.post("/api/meetings/join", async (req, res) => {
    try {
      const joinData = joinMeetingSchema.parse(req.body);
      const isValid = await storage.validateMeeting(
        joinData.meetingId,
        joinData.password
      );

      if (!isValid) {
        return res.status(403).json({ error: "Invalid meeting ID or password" });
      }

      const participant = await storage.addParticipant({
        id: nanoid(),
        meetingId: joinData.meetingId,
        name: joinData.name,
        isHost: req.body.isHost || false // Use the isHost parameter from request
      });

      res.json({ participant });
    } catch (error) {
      if (error instanceof z.ZodError) {
        res.status(400).json({ error: "Invalid join data" });
      } else {
        res.status(500).json({ error: "Server error" });
      }
    }
  });

  app.get("/api/meetings/:id/participants", async (req, res) => {
    const participants = await storage.getParticipants(req.params.id);
    res.json({ participants });
  });

  wss.on("connection", (ws) => {
    ws.on("message", async (rawData) => {
      try {
        const message: WebSocketMessage = JSON.parse(rawData.toString());

        switch (message.type) {
          case "join": {
            const { participantId, meetingId } = message.payload;
            connectedClients.set(participantId, { ws, participantId, meetingId });

            // Broadcast to other participants in the meeting
            for (const [_, client] of connectedClients) {
              if (client.meetingId === meetingId && client.participantId !== participantId) {
                client.ws.send(JSON.stringify({
                  type: "participant_joined",
                  payload: { participantId }
                }));
              }
            }
            break;
          }

          case "webrtc_signal": {
            const { to, signal } = message.payload;
            const targetClient = connectedClients.get(to);
            if (targetClient?.ws.readyState === WebSocket.OPEN) {
              targetClient.ws.send(JSON.stringify({
                type: "webrtc_signal",
                payload: {
                  from: message.payload.from,
                  signal
                }
              }));
            }
            break;
          }

          case "chat": {
            const { meetingId, from, message: chatMessage } = message.payload;
            for (const [_, client] of connectedClients) {
              if (client.meetingId === meetingId && client.ws.readyState === WebSocket.OPEN) {
                client.ws.send(JSON.stringify({
                  type: "chat",
                  payload: { from, message: chatMessage }
                }));
              }
            }
            break;
          }
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    });

    ws.on("close", () => {
      for (const [id, client] of connectedClients) {
        if (client.ws === ws) {
          connectedClients.delete(id);
          storage.removeParticipant(id);

          // Notify others in the meeting
          for (const [_, otherClient] of connectedClients) {
            if (otherClient.meetingId === client.meetingId) {
              otherClient.ws.send(JSON.stringify({
                type: "participant_left",
                payload: { participantId: id }
              }));
            }
          }
          break;
        }
      }
    });
  });

  return httpServer;
}