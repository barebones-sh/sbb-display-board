import type { InputSource } from "./InputSource";
import { keyboardInputSource } from "./keyboardInputSource";

/**
 * The single swap point for hardware input. A future gpioInputSource.ts
 * (Raspberry Pi phase) implements the same InputSource interface; this
 * factory picks one, e.g. via an env flag, without any caller needing to
 * change. Nothing outside src/input/ and this factory's own body should
 * know keyboardInputSource exists.
 */
export function getInputSource(): InputSource {
  return keyboardInputSource;
}

export type { ButtonId, InputSource } from "./InputSource";
