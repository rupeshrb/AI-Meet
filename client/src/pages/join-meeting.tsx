import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft } from "lucide-react";
import { Link } from "wouter";

export default function JoinMeeting() {
  const [meetingId, setMeetingId] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const joinMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/meetings/join", {
        meetingId,
        password,
        name,
        isHost: false // Always false for joining participants
      });
      return res.json();
    },
    onSuccess: (data) => {
      // Redirect to waiting room for non-host participants
      setLocation(`/waiting/${meetingId}?participantId=${data.participant.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to join meeting. Check your meeting ID and password.",
        variant: "destructive"
      });
    }
  });

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <Link href="/" className="text-muted-foreground hover:text-foreground">
            <Button variant="ghost" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>
          <CardTitle className="text-2xl">Join Meeting</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              joinMutation.mutate();
            }}
            className="space-y-4"
          >
            <div className="space-y-2">
              <label className="text-sm font-medium">Meeting ID</label>
              <Input
                value={meetingId}
                onChange={(e) => setMeetingId(e.target.value)}
                required
                placeholder="Enter meeting ID"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Password</label>
              <Input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="Enter meeting password"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Your Name</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder="Enter your name"
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={joinMutation.isPending}
            >
              {joinMutation.isPending ? "Joining..." : "Join Meeting"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}