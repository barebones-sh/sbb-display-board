import type { ButtonId, InputSource } from "./InputSource";

const KEY_TO_BUTTON: Record<string, ButtonId> = {
  "1": "cycleStation",
  "2": "toggleViewMode",
  "3": "cycleLanguage",
};

export const keyboardInputSource: InputSource = {
  subscribe(onPress) {
    const handleKeydown = (event: KeyboardEvent) => {
      const button = KEY_TO_BUTTON[event.key];
      if (button) onPress(button);
    };
    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  },
};
