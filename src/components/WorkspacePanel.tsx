import React, { useCallback, useState } from "react";
import { updateSequenceStep } from "../services/chatService";
import { debounce } from "../utils/debounce";

interface IStep {
  stepNumber: number;
  stepTitle: string;
  stepContent: string;
}

interface WorkspacePanelProps {
  userId: string;
  currentSequenceId: string | null;
  steps: IStep[];
  setSteps: React.Dispatch<React.SetStateAction<IStep[]>>;
}

export function WorkspacePanel({
  currentSequenceId,
  steps,
  setSteps,
}: WorkspacePanelProps) {
  const [isSaving, setIsSaving] = useState(false);

  const debouncedSaveStep = useCallback(
    debounce(
      async (
        sequenceId: string,
        stepNumber: number,
        field: "stepTitle" | "stepContent",
        value: string
      ) => {
        if (!sequenceId) return;
        setIsSaving(true);
        try {
          await updateSequenceStep({ sequenceId, stepNumber, field, value });
        } catch (error) {
          console.error("Error saving step:", error);
        } finally {
          setIsSaving(false);
        }
      },
      1000
    ),
    []
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
    if (currentSequenceId) {
      debouncedSaveStep(currentSequenceId, stepNumber, field, value);
    }
  };

  return (
    <div className="workspace-panel">
      <div className="sequence-title">Sequence {isSaving && "(Saving...)"}</div>
      {steps.length === 0 ? (
        <div className="sequence-content">No sequence generated.</div>
      ) : (
        <div className="sequence-content">
          {steps.map((step) => (
            <div key={step.stepNumber} style={{ marginBottom: "1rem" }}>
              <input
                value={step.stepTitle}
                onChange={(e) =>
                  handleStepEdit(step.stepNumber, "stepTitle", e.target.value)
                }
              />
              <textarea
                style={{ width: "100%", height: "5rem" }}
                value={step.stepContent}
                onChange={(e) =>
                  handleStepEdit(step.stepNumber, "stepContent", e.target.value)
                }
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
