import React, { useState, useCallback, useEffect } from "react";
import {
  ClerkProvider,
  SignedIn,
  SignedOut,
  UserButton,
  SignInButton,
  useUser,
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

function debounce<F extends (...args: never[]) => void>(func: F, wait: number) {
  let timeout: ReturnType<typeof setTimeout>;
  return function executedFunction(...args: Parameters<F>) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

function ChatApp() {
  const { user } = useUser();
  const [messages, setMessages] = useState<IMessage[]>([
    { text: "How can I help?", sender: "ai" },
  ]);
  const [inputValue, setInputValue] = useState("");
  const [steps, setSteps] = useState<IStep[]>([]);
  const [currentSequenceId, setCurrentSequenceId] = useState<string | null>(
    null
  );
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (user) {
      fetch(`http://127.0.0.1:5000/api/load?user_id=${user.id}`)
        .then((res) => res.json())
        .then((data) => {
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
        })
        .catch((err) => {
          console.error("Error loading history", err);
        });
    }
  }, [user]);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSaveStep = useCallback(
    debounce(
      async (
        stepNumber: number,
        field: "stepTitle" | "stepContent",
        value: string
      ) => {
        if (!currentSequenceId) return;
        setIsSaving(true);
        try {
          await fetch("http://127.0.0.1:5000/api/sequence/update", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sequenceId: currentSequenceId,
              stepNumber,
              field,
              value,
            }),
          });
        } catch (error) {
          console.error("Error saving step:", error);
        } finally {
          setIsSaving(false);
        }
      },
      1000
    ),
    [currentSequenceId]
  );

  const handleStepEdit = (
    stepNumber: number,
    field: "stepTitle" | "stepContent",
    value: string
  ) => {
    setSteps((prev) =>
      prev.map((step) =>
        step.stepNumber === stepNumber ? { ...step, [field]: value } : step
      )
    );
    debouncedSaveStep(stepNumber, field, value);
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    if (!user) {
      console.error("User not logged in");
      return;
    }
    setMessages((prev) => [...prev, { text: inputValue, sender: "user" }]);
    try {
      const response = await fetch("http://127.0.0.1:5000/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: inputValue, user_id: user.id }),
      });
      const data = await response.json();
      setMessages((prev) => [...prev, { text: data.reply, sender: "ai" }]);
      if (data.sequence.length > 0) {
        setSteps(data.sequence);
        setCurrentSequenceId(data.sequenceId);
      } else {
        setSteps([]);
        setCurrentSequenceId(null);
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

  const handleDeleteHistory = async () => {
    if (!user) return;
    try {
      // Delete history on the backend.
      await fetch(
        `http://127.0.0.1:5000/api/delete_history?user_id=${user.id}`,
        {
          method: "DELETE",
        }
      );

      setMessages([]);
      setSteps([]);
      setCurrentSequenceId(null);
      alert("History deleted successfully.");
    } catch (error) {
      console.error("Error deleting history:", error);
      alert("Error deleting history.");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

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

      <button
        onClick={handleDeleteHistory}
        style={{ margin: "1rem", padding: "0.5rem" }}
      >
        Delete History
      </button>
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
          <div className="sequence-title">
            Sequence {isSaving && "(Saving...)"}
          </div>
          {steps.length === 0 ? (
            <div className="sequence-content">No sequence generated.</div>
          ) : (
            <div className="sequence-content">
              {steps.map((step) => (
                <div key={step.stepNumber} style={{ marginBottom: "1rem" }}>
                  <input
                    style={{ width: "100%", marginBottom: "0.5rem" }}
                    value={step.stepTitle}
                    onChange={(e) =>
                      handleStepEdit(
                        step.stepNumber,
                        "stepTitle",
                        e.target.value
                      )
                    }
                  />
                  <textarea
                    style={{ width: "100%", height: "5rem" }}
                    value={step.stepContent}
                    onChange={(e) =>
                      handleStepEdit(
                        step.stepNumber,
                        "stepContent",
                        e.target.value
                      )
                    }
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function App() {
  return (
    <ClerkProvider publishableKey={clerkPubKey}>
      <ChatApp />
    </ClerkProvider>
  );
}

export default App;
