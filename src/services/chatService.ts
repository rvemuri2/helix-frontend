export async function classifyIntent(user_input: string): Promise<string> {
  try {
    const res = await fetch("http://127.0.0.1:5000/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: user_input }),
    });
    const data = await res.json();
    return data.intent || "new_sequence";
  } catch (error) {
    console.error("Classification error:", error);
    return "new_sequence";
  }
}

export async function sendMessageToChat(userId: string, message: string) {
  const response = await fetch("http://127.0.0.1:5000/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, user_id: userId }),
  });
  return response.json();
}

export async function loadUserHistory(userId: string) {
  const res = await fetch(`http://127.0.0.1:5000/api/load?user_id=${userId}`);
  return res.json();
}

interface UpdateStepPayload {
  sequenceId: string;
  stepNumber: number;
  field: "stepTitle" | "stepContent";
  value: string;
}

export async function updateSequenceStep(payload: UpdateStepPayload) {
  await fetch("http://127.0.0.1:5000/api/sequence/update", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}
