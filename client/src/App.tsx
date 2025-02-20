import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import Home from "@/pages/home";
import CreateMeeting from "@/pages/create-meeting";
import JoinMeeting from "@/pages/join-meeting";
import MeetingRoom from "@/pages/meeting-room";
import WaitingRoom from "@/pages/waiting-room";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/create" component={CreateMeeting} />
      <Route path="/join" component={JoinMeeting} />
      <Route path="/meeting/:id" component={MeetingRoom} />
      <Route path="/waiting/:id" component={WaitingRoom} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  );
}

export default App;
