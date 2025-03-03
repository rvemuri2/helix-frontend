import React, { useState } from "react";
import { classifyIntent, sendMessageToChat } from "../services/chatService";

interface Message {
  text: string;
  sender: "user" | "ai";
}

interface ChatPanelProps {
  userId: string;
  messages: Message[];
  setMessages: React.Dispatch<React.SetStateAction<Message[]>>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  setSteps: React.Dispatch<React.SetStateAction<any[]>>;
  setCurrentSequenceId: React.Dispatch<React.SetStateAction<string | null>>;
}

export function ChatPanel({
  userId,
  messages,
  setMessages,
  setSteps,
  setCurrentSequenceId,
}: ChatPanelProps) {
  const [inputValue, setInputValue] = useState("");
  const [tempMessage, setTempMessage] = useState("");

  const getLoadingMessage = (intent: string): string => {
    if (intent === "add_step") return "Adding step...";
    else if (intent === "edit_step") return "Editing step...";
    else if (intent === "new_sequence") return "Generating sequence...";
    return "Generating sequence...";
  };

  const handleSend = async () => {
    if (!inputValue.trim()) return;
    if (!userId) {
      console.error("User not logged in");
      return;
    }

    const messageToSend = inputValue;
    setInputValue("");
    setMessages((prev) => [...prev, { text: messageToSend, sender: "user" }]);

    const intent = await classifyIntent(messageToSend);
    setTempMessage(getLoadingMessage(intent));

    try {
      const data = await sendMessageToChat(userId, messageToSend);
      setTempMessage("");
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
      setTempMessage("");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  return (
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
        {tempMessage && (
          <div className="chat-bubble system-bubble loading-bubble">
            {tempMessage}
            <span className="loading-dots"></span>
          </div>
        )}
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
  );
}
