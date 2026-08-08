/**
 * The hardware-input contract. Today the only implementation is keyboard
 * keys 1/2/3 standing in for three physical buttons; a future GPIO-backed
 * implementation (Raspberry Pi phase, see docs/ROADMAP.md) implements this
 * same interface and is swapped in via getInputSource() in index.ts. No
 * component or reducer should ever import keyboardInputSource directly —
 * always go through getInputSource() so the swap is a one-file change.
 */
export type ButtonId = "cycleStation" | "toggleViewMode" | "cycleLanguage";

export interface InputSource {
  /** Subscribes to button presses; returns an unsubscribe function. */
  subscribe(onPress: (button: ButtonId) => void): () => void;
}
