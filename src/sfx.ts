// Fachada del audio: re-exporta src/audio/* (el orden fija el de arranque en initAudio: motor, música, ambientes).
export { initAudio, setAudio } from "./audio/context";
export * from "./audio/effects";
export * from "./audio/music";
export * from "./audio/ambience";
