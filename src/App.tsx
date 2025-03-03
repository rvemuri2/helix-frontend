import React, { useEffect, useState } from "react";
import {
  ClerkProvider,
  useUser,
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
} from "@clerk/clerk-react";

import "./App.css";
import { ChatPanel } from "./components/ChatPanel";
import { WorkspacePanel } from "./components/WorkspacePanel";
import { loadUserHistory } from "./services/chatService";

const clerkPubKey = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;
if (!clerkPubKey) {
  throw new Error("Missing Clerk publishable key.");
}

interface IMessage {
  text: string;
  sender: "user" | "ai";
}

interface IStep {
  stepNumber: number;
  stepTitle: string;
  stepContent: string;
}

function MainApp() {
  const { user, isLoaded } = useUser();

  const [messages, setMessages] = useState<IMessage[]>([
    { text: "How can I help?", sender: "ai" },
  ]);
  const [steps, setSteps] = useState<IStep[]>([]);
  const [currentSequenceId, setCurrentSequenceId] = useState<string | null>(
    null
  );

  useEffect(() => {
    const loadHistory = async () => {
      if (user && user.id) {
        try {
          const data = await loadUserHistory(user.id);
          if (data.chat_history) {
            setMessages(
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              data.chat_history.map((msg: any) => ({
                text: msg.message,
                sender: msg.sender,
              }))
            );
          }
          if (data.sequences && data.sequences.length > 0) {
            const firstSequence = data.sequences[0];
            setSteps(firstSequence.steps);
            setCurrentSequenceId(firstSequence.sequence_id);
          }
        } catch (err) {
          console.error("Error loading history:", err);
        }
      }
    };
    loadHistory();
  }, [user]);

  if (!isLoaded) {
    return <div>Loading user state...</div>;
  }

  return (
    <>
      <header className="header">
        <div></div>
        <h1 className="header-title">Helix Chat</h1>
        <div className="auth-container">
          <SignedIn>
            <UserButton afterSignOutUrl="/" />
          </SignedIn>
          <SignedOut>
            <SignInButton />
          </SignedOut>
        </div>
      </header>

      <div className="chat-container">
        <ChatPanel
          userId={user?.id ?? ""}
          messages={messages}
          setMessages={setMessages}
          setSteps={setSteps}
          setCurrentSequenceId={setCurrentSequenceId}
        />
        <WorkspacePanel
          userId={user?.id ?? ""}
          currentSequenceId={currentSequenceId}
          steps={steps}
          setSteps={setSteps}
        />
      </div>
    </>
  );
}

export default function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <MainApp />
    </ClerkProvider>
  );
}
