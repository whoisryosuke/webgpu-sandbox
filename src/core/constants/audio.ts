export type WhiteNotes = "C" | "D" | "E" | "F" | "G" | "A" | "B";
// For sake of simplicity we do sharp notes only. Might expand later.
export type BlackNotes = "C#" | "D#" | "F#" | "G#" | "A#";
export type BaseNote = WhiteNotes | BlackNotes;
export type Octaves = "1" | "2" | "3" | "4" | "5" | "6" | "7" | "8";
export type Note = `${BaseNote}${Octaves}`;

export const NOTES_WHITE = ["C", "D", "E", "F", "G", "A", "B"];
export const NOTES_BLACK = ["C#", "D#", "F#", "G#", "A#"];
export const NOTES_ALL_IN_ORDER = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];
