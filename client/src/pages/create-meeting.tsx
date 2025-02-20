import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Copy } from "lucide-react";
import { Link } from "wouter";
import { nanoid } from "nanoid";

export default function CreateMeeting() {
  const [step, setStep] = useState(1);
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [meetingId, setMeetingId] = useState("");
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const createMutation = useMutation({
    mutationFn: async () => {
      // First create the meeting
      const res = await apiRequest("POST", "/api/meetings", {
        id: meetingId,
        password
      });
      const { meeting } = await res.json();

      // After creating meeting, automatically join as host
      const joinRes = await apiRequest("POST", "/api/meetings/join", {
        meetingId: meeting.id,
        password: meeting.password,
        name: name,
        isHost: true
      });
      const { participant } = await joinRes.json();
      return { meeting, participant };
    },
    onSuccess: (data) => {
      // Redirect to meeting room with participant ID
      setLocation(`/meeting/${data.meeting.id}?participantId=${data.participant.id}`);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create meeting",
        variant: "destructive"
      });
    }
  });

  const copyMeetingId = () => {
    navigator.clipboard.writeText(meetingId);
    toast({
      title: "Copied!",
      description: "Meeting ID has been copied to clipboard"
    });
  };

  const handleNameSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (name.trim()) {
      setMeetingId(nanoid(6)); // Generate meeting ID
      setStep(2);
    }
  };

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
          <CardTitle className="text-2xl">Create Meeting</CardTitle>
        </CardHeader>
        <CardContent>
          {step === 1 ? (
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Your Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Enter your name"
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full">
                Continue
              </Button>
            </form>
          ) : step === 2 ? (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Meeting ID</label>
                <div className="flex gap-2">
                  <Input
                    value={meetingId}
                    readOnly
                    className="font-mono"
                  />
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyMeetingId}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <p className="text-sm text-muted-foreground">
                  Share this ID with participants to join the meeting
                </p>
              </div>
              <Button 
                className="w-full"
                onClick={() => setStep(3)}
              >
                Continue to Set Password
              </Button>
            </div>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate();
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium">Meeting Password</label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter meeting password"
                  autoFocus
                />
              </div>

              <Button
                type="submit"
                className="w-full"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Creating..." : "Create Meeting"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}