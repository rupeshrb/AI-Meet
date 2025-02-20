import { useEffect, useRef } from "react";
import { useParams } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function WaitingRoom() {
  const { id } = useParams();
  const meetingUrlRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const copyMeetingId = () => {
    if (meetingUrlRef.current) {
      meetingUrlRef.current.select();
      document.execCommand("copy");
      toast({
        title: "Copied!",
        description: "Meeting ID has been copied to clipboard"
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Ready to Start</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium">Meeting ID</label>
            <div className="flex gap-2">
              <Input
                ref={meetingUrlRef}
                value={id}
                readOnly
                className="font-mono"
              />
              <Button
                variant="outline"
                size="icon"
                onClick={copyMeetingId}
                className="shrink-0"
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
            onClick={() => {
              window.location.href = `/meeting/${id}`;
            }}
          >
            Start Meeting
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
