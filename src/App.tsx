import React, { useState } from "react";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
} from "@clerk/clerk-react";
import "./App.css";

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

function App() {
  const [messages, setMessages] = useState<IMessage[]>([
    { text: "How can I help?", sender: "ai" },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [steps, setSteps] = useState<IStep[]>([]);

  const handleSend = async () => {
    if (!inputValue.trim()) return;

    setMessages((prev) => [...prev, { text: inputValue, sender: "user" }]);

    try {
      const response = await fetch("http://127.0.0.1:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputValue }),
      });

      const data = await response.json();

      setMessages((prev) => [...prev, { text: data.reply, sender: "ai" }]);

      if (data.sequence.length > 0) {
        setSteps(data.sequence);
      } else {
        setSteps([]);
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        { text: "Oops, something went wrong.", sender: "ai" },
      ]);
    }

    setInputValue("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <ClerkProvider publishableKey={clerkPubKey}>
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
        <div className="chat-panel">
          <div className="chat-box">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`chat-bubble ${
                  msg.sender === "user" ? "user-bubble" : "system-bubble"
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <div className="send-bar">
            <input
              className="send-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message..."
            />
            <button className="send-button" onClick={handleSend}>
              Send
            </button>
          </div>
        </div>
        <div className="workspace-panel">
          <div className="sequence-title">Sequence</div>
          {steps.length === 0 ? (
            <div className="sequence-content">No sequence generated.</div>
          ) : (
            <div className="sequence-content">
              {steps.map((step) => (
                <div key={step.stepNumber} style={{ marginBottom: "1rem" }}>
                  <input
                    style={{ width: "100%", marginBottom: "0.5rem" }}
                    value={step.stepTitle}
                    readOnly
                  />
                  <textarea
                    style={{ width: "100%", height: "5rem" }}
                    value={step.stepContent}
                    readOnly
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </ClerkProvider>
  );
}

export default App;
