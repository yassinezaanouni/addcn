import { useState, useEffect, useRef } from "react";

type AnimationStep =
  | { type: "type"; text: string }
  | { type: "pause"; duration: number }
  | { type: "backspace"; count: number }
  | { type: "complete" };

interface UseTypewriterOptions {
  steps: AnimationStep[];
  onComplete?: () => void;
  enabled?: boolean;
}

interface UseTypewriterReturn {
  displayText: string;
  isComplete: boolean;
  showCursor: boolean;
}

const TYPING_SPEED = 50;
const BACKSPACE_SPEED = 35;

export function useTypewriter({
  steps,
  onComplete,
  enabled = true,
}: UseTypewriterOptions): UseTypewriterReturn {
  const [displayText, setDisplayText] = useState("");
  const [isComplete, setIsComplete] = useState(false);
  const [showCursor, setShowCursor] = useState(true);

  // Use refs to avoid dependency issues and allow the animation to continue
  // even when callbacks change between renders
  const stepsRef = useRef(steps);
  const onCompleteRef = useRef(onComplete);
  const currentStepIndex = useRef(0);
  const charIndex = useRef(0);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const hasStarted = useRef(false);

  // Keep refs in sync with props
  useEffect(() => {
    stepsRef.current = steps;
  }, [steps]);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    if (!enabled || hasStarted.current || stepsRef.current.length === 0) {
      return;
    }

    hasStarted.current = true;

    const processStep = () => {
      const steps = stepsRef.current;

      if (currentStepIndex.current >= steps.length) {
        return;
      }

      const step = steps[currentStepIndex.current];

      switch (step.type) {
        case "type": {
          if (charIndex.current < step.text.length) {
            const char = step.text[charIndex.current];
            charIndex.current++;
            setDisplayText((prev) => prev + char);
            timeoutRef.current = setTimeout(processStep, TYPING_SPEED);
          } else {
            charIndex.current = 0;
            currentStepIndex.current++;
            timeoutRef.current = setTimeout(processStep, 0);
          }
          break;
        }

        case "pause": {
          currentStepIndex.current++;
          timeoutRef.current = setTimeout(processStep, step.duration);
          break;
        }

        case "backspace": {
          if (charIndex.current < step.count) {
            charIndex.current++;
            setDisplayText((prev) => prev.slice(0, -1));
            timeoutRef.current = setTimeout(processStep, BACKSPACE_SPEED);
          } else {
            charIndex.current = 0;
            currentStepIndex.current++;
            timeoutRef.current = setTimeout(processStep, 0);
          }
          break;
        }

        case "complete": {
          setIsComplete(true);
          setShowCursor(false);
          onCompleteRef.current?.();
          break;
        }
      }
    };

    timeoutRef.current = setTimeout(processStep, 100);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [enabled]);

  return { displayText, isComplete, showCursor };
}
