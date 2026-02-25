"use client";

import { useState, useRef, useEffect } from "react";
import { GoogleGenAI } from "@google/genai";
import { Play, Square, Settings2, Plus, X, Volume2, AudioLines, Sparkles, SlidersHorizontal, MicVocal, Activity, Music, Guitar, Disc3 } from "lucide-react";
import Image from "next/image";
import {
  getFlowQuantizeBeats,
  shouldAllowDuringDrop,
  shouldQueueWhenDropLocked,
  type FlowActionType,
  type FlowMode,
} from "@/lib/dj/flow-mode";

// Convert base64 PCM16 to AudioBuffer float32
function playPcm16Chunk(audioCtx: AudioContext, base64: string, nextStartTime: number, destinationNode: AudioNode): number {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16Array = new Int16Array(bytes.buffer);
  
  const buffer = audioCtx.createBuffer(2, int16Array.length / 2, 48000);
  const channel0 = buffer.getChannelData(0);
  const channel1 = buffer.getChannelData(1);
  
  for (let i = 0; i < int16Array.length; i += 2) {
    channel0[i / 2] = int16Array[i] / 32768.0;
    channel1[i / 2] = int16Array[i + 1] / 32768.0;
  }
  
  const source = audioCtx.createBufferSource();
  source.buffer = buffer;
  source.connect(destinationNode);
  
  const startTime = Math.max(audioCtx.currentTime, nextStartTime);
  source.start(startTime);
  
  return startTime + buffer.duration;
}

const SCALE_OPTIONS = [
  "SCALE_UNSPECIFIED", "C_MAJOR_A_MINOR", "D_FLAT_MAJOR_B_FLAT_MINOR", "D_MAJOR_B_MINOR", 
  "E_FLAT_MAJOR_C_MINOR", "E_MAJOR_D_FLAT_MINOR", "F_MAJOR_D_MINOR", 
  "G_FLAT_MAJOR_E_FLAT_MINOR", "G_MAJOR_E_MINOR", "A_FLAT_MAJOR_F_MINOR", 
  "A_MAJOR_G_FLAT_MINOR", "B_FLAT_MAJOR_G_MINOR", "B_MAJOR_A_FLAT_MINOR"
];

const MODE_OPTIONS = ["QUALITY", "DIVERSITY", "VOCALIZATION"];
type DropIntensity = "LITE" | "FESTIVAL" | "NUCLEAR";
type UiMode = "SIMPLE" | "ADVANCED";

const DROP_INTENSITY_PROFILES: Record<DropIntensity, {
  buildBeats: number;
  silenceBeats: number;
  holdBeats: number;
  riserWeightMax: number;
  preDropWeight: number;
  slamWeight: number;
  guidanceBoostBuild: number;
  guidanceBoostSilence: number;
  guidanceBoostDrop: number;
  densityFloorDrop: number;
  brightnessFloorDrop: number;
  bassCutStart: number;
  drumsCutStart: number;
}> = {
  LITE: {
    buildBeats: 8,
    silenceBeats: 0.5,
    holdBeats: 4,
    riserWeightMax: 2.2,
    preDropWeight: 1.5,
    slamWeight: 2.8,
    guidanceBoostBuild: 0.45,
    guidanceBoostSilence: 0.6,
    guidanceBoostDrop: 0.2,
    densityFloorDrop: 0.78,
    brightnessFloorDrop: 0.72,
    bassCutStart: 0.72,
    drumsCutStart: 0.93,
  },
  FESTIVAL: {
    buildBeats: 16,
    silenceBeats: 1,
    holdBeats: 8,
    riserWeightMax: 3.8,
    preDropWeight: 2.6,
    slamWeight: 4.0,
    guidanceBoostBuild: 0.9,
    guidanceBoostSilence: 1.1,
    guidanceBoostDrop: 0.45,
    densityFloorDrop: 0.88,
    brightnessFloorDrop: 0.82,
    bassCutStart: 0.55,
    drumsCutStart: 0.88,
  },
  NUCLEAR: {
    buildBeats: 24,
    silenceBeats: 1.5,
    holdBeats: 12,
    riserWeightMax: 4.6,
    preDropWeight: 3.2,
    slamWeight: 5.0,
    guidanceBoostBuild: 1.35,
    guidanceBoostSilence: 1.6,
    guidanceBoostDrop: 0.75,
    densityFloorDrop: 0.94,
    brightnessFloorDrop: 0.9,
    bassCutStart: 0.45,
    drumsCutStart: 0.8,
  },
};

const SIMPLE_SCENES = [
  { label: "CHILL", genre: "Lo-Fi Hip Hop" },
  { label: "GROOVE", genre: "Deep House" },
  { label: "PEAK", genre: "Psytrance" },
];

const SIMPLE_PROMPT_OPTIONS = {
  genres: ["festival mainstage", "progressive house", "euphoric trance", "peak techno", "afro house"],
  rhythms: ["upbeat and danceable", "driving four on the floor", "rolling groove", "anthemic half-time switch"],
  instruments: ["saxophone solo", "distorted bassline", "warm analog synths", "fuzzy guitars", "punchy 909 drums"],
  vocals: ["airy female soprano", "deep male baritone", "raspy hype chant", "hooky festival vocal"],
};

const SIMPLE_MOMENTS = ["Warmup", "Lift", "Build", "Drop", "Afterglow"];
const SIMPLE_CROWD_FLAVORS = ["Hands Up", "Singalong", "Dark Club", "Sunset Glow", "Birthday Energy"];

const SIMPLE_SHOWCASE_PRESETS = [
  {
    label: "Mainstage Titan",
    genre: "festival mainstage",
    rhythm: "driving four on the floor",
    instrument: "distorted bassline",
    vocal: "raspy hype chant",
    moment: "Build",
    crowd: "Hands Up",
  },
  {
    label: "Progressive Anthem",
    genre: "progressive house",
    rhythm: "upbeat and danceable",
    instrument: "warm analog synths",
    vocal: "hooky festival vocal",
    moment: "Lift",
    crowd: "Singalong",
  },
  {
    label: "Trance Euphoria",
    genre: "euphoric trance",
    rhythm: "rolling groove",
    instrument: "warm analog synths",
    vocal: "airy female soprano",
    moment: "Afterglow",
    crowd: "Sunset Glow",
  },
  {
    label: "Party Closer",
    genre: "festival mainstage",
    rhythm: "anthemic half-time switch",
    instrument: "punchy 909 drums",
    vocal: "hooky festival vocal",
    moment: "Drop",
    crowd: "Birthday Energy",
  },
];

const GENRE_PRESETS = [
  { label: "Minimal Techno", color: "cyan", prompts: [{ text: "Minimal techno, deep bass, sparse percussion, atmospheric synths", weight: 1.0 }], bpm: 125, density: 0.3, brightness: 0.4 },
  { label: "Lo-Fi Hip Hop", color: "purple", prompts: [{ text: "Lo-fi hip hop, chill beats, warm vinyl crackle, jazzy piano", weight: 1.0 }], bpm: 85, density: 0.5, brightness: 0.3 },
  { label: "Afrobeat", color: "green", prompts: [{ text: "Afrobeat, percussion, funky guitar, groovy horns, danceable", weight: 1.0 }], bpm: 110, density: 0.7, brightness: 0.6 },
  { label: "Jazz Fusion", color: "amber", prompts: [{ text: "Jazz fusion, Rhodes piano, funky drums, walking bass, virtuoso", weight: 1.0 }], bpm: 100, density: 0.6, brightness: 0.7 },
  { label: "Psytrance", color: "fuchsia", prompts: [{ text: "Psytrance, rolling bassline, trippy synths, psychedelic, driving", weight: 1.0 }], bpm: 145, density: 0.9, brightness: 0.8 },
  { label: "Deep House", color: "sky", prompts: [{ text: "Deep house, smooth bass, soulful chords, warm pads, groovy", weight: 1.0 }], bpm: 122, density: 0.5, brightness: 0.5 },
  { label: "Drum & Bass", color: "rose", prompts: [{ text: "Drum and bass, fast breakbeat, heavy sub bass, rolling drums", weight: 1.0 }], bpm: 174, density: 0.8, brightness: 0.6 },
  { label: "Acid Techno", color: "lime", prompts: [{ text: "303 Acid Bass, TR-909 Drum Machine, acid techno, squelchy", weight: 1.0 }], bpm: 135, density: 0.7, brightness: 0.7 },
];

const INSTRUMENTS = [
  { label: "303 Acid Bass", emoji: "~" },
  { label: "Rhodes Piano", emoji: "P" },
  { label: "Sitar", emoji: "S" },
  { label: "TR-909 Drums", emoji: "9" },
  { label: "Flamenco Guitar", emoji: "F" },
  { label: "Cello", emoji: "C" },
  { label: "Moog Synth", emoji: "M" },
  { label: "Harmonica", emoji: "H" },
  { label: "Steel Drum", emoji: "D" },
  { label: "Djembe", emoji: "J" },
  { label: "Harp", emoji: "R" },
  { label: "Slide Guitar", emoji: "G" },
];

export default function DjApp() {
  const [apiKey, setApiKey] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [session, setSession] = useState<any>(null);
  
  // Audio state
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const nextStartTimeRef = useRef<number>(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  
  // Master Controls (Soft Transitions)
  const [density, setDensity] = useState(0.8);
  const [brightness, setBrightness] = useState(0.8);
  const [guidance, setGuidance] = useState(4.0);
  const [muteBass, setMuteBass] = useState(false);
  const [muteDrums, setMuteDrums] = useState(false);
  const [onlyBassAndDrums, setOnlyBassAndDrums] = useState(false);
  
  // Deck B Controls (Hard Transitions)
  const [bpm, setBpm] = useState(128);
  const [scale, setScale] = useState("SCALE_UNSPECIFIED");
  const [generationMode, setGenerationMode] = useState("QUALITY");
  
  // Prompts
  const [prompts, setPrompts] = useState([
    { text: "Dutch Trance Festival, Big Room House, High Energy", weight: 1.0 },
    { text: "Pumping Bass", weight: 0.8 },
  ]);
  const [newPrompt, setNewPrompt] = useState("");

  // Mega Drop State
  const [isDropBuilding, setIsDropBuilding] = useState(false);
  const [dropState, setDropState] = useState<"IDLE" | "BUILDING" | "SILENCE" | "DROP">("IDLE");
  const [dropIntensity, setDropIntensity] = useState<DropIntensity>("FESTIVAL");
  const [uiMode, setUiMode] = useState<UiMode>("ADVANCED");
  const [flowMode, setFlowMode] = useState<FlowMode>("STRICT_PRO");
  const [simpleEnergy, setSimpleEnergy] = useState(72);
  const [simpleGenre, setSimpleGenre] = useState(SIMPLE_PROMPT_OPTIONS.genres[0]);
  const [simpleRhythm, setSimpleRhythm] = useState(SIMPLE_PROMPT_OPTIONS.rhythms[0]);
  const [simpleInstrument, setSimpleInstrument] = useState(SIMPLE_PROMPT_OPTIONS.instruments[0]);
  const [simpleVocal, setSimpleVocal] = useState(SIMPLE_PROMPT_OPTIONS.vocals[0]);
  const [simpleMoment, setSimpleMoment] = useState(SIMPLE_MOMENTS[1]);
  const [simpleCrowd, setSimpleCrowd] = useState(SIMPLE_CROWD_FLAVORS[0]);

  // Vocal Pad State
  const [activeVocalPad, setActiveVocalPad] = useState<string | null>(null);

  // Genre Preset State
  const [activeGenre, setActiveGenre] = useState<string | null>(null);
  const [activeGenrePrompts, setActiveGenrePrompts] = useState<string[]>([]);

  // Instrument Rack State
  const [activeInstruments, setActiveInstruments] = useState<Set<string>>(new Set());
  const promptsRef = useRef(prompts);
  const genreTransitionRef = useRef(0);
  const megaDropRunRef = useRef(0);
  const isPlayingRef = useRef(isPlaying);
  const sessionRef = useRef<any>(session);
  const actionChainRef = useRef<Promise<void>>(Promise.resolve());
  const transitionLockRef = useRef<"NONE" | "DROP">("NONE");
  const pendingFlowActionRef = useRef<null | (() => void)>(null);
  
  useEffect(() => {
    const savedKey = localStorage.getItem("GEMINI_API_KEY") || "";
    const savedMode = (localStorage.getItem("DJ_UI_MODE") as UiMode | null) || "ADVANCED";
    if (savedKey) setApiKey(savedKey);
    setUiMode(savedMode);

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  useEffect(() => {
    localStorage.setItem("DJ_UI_MODE", uiMode);
  }, [uiMode]);

  useEffect(() => {
    promptsRef.current = prompts;
  }, [prompts]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  // Visualizer drawing loop
  const drawVisualizer = () => {
    if (!analyserRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyserRef.current.getByteFrequencyData(dataArray);

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    const barWidth = (canvas.width / bufferLength) * 2.5;
    let barHeight;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      barHeight = dataArray[i];
      
      // Cyberpunk/Trance neon gradient
      const r = barHeight + (25 * (i / bufferLength));
      const g = 100 * (i / bufferLength);
      const b = 255;

      ctx.fillStyle = `rgb(${r},${g},${b})`;
      ctx.fillRect(x, canvas.height - barHeight / 2, barWidth, barHeight / 2);
      x += barWidth + 1;
    }
    animationRef.current = requestAnimationFrame(drawVisualizer);
  };

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const mergePromptsForCrossfade = (
    fromPrompts: Array<{ text: string; weight: number }>,
    toPrompts: Array<{ text: string; weight: number }>,
    progress: number
  ) => {
    const merged = new Map<string, number>();

    for (const prompt of fromPrompts) {
      const nextWeight = prompt.weight * (1 - progress);
      if (nextWeight > 0.01) merged.set(prompt.text, (merged.get(prompt.text) || 0) + nextWeight);
    }

    for (const prompt of toPrompts) {
      const nextWeight = prompt.weight * progress;
      if (nextWeight > 0.01) merged.set(prompt.text, (merged.get(prompt.text) || 0) + nextWeight);
    }

    return Array.from(merged.entries()).map(([text, weight]) => ({
      text,
      weight: Number(weight.toFixed(2)),
    }));
  };

  const mergePromptSets = (
    base: Array<{ text: string; weight: number }>,
    extra: Array<{ text: string; weight: number }>
  ) => {
    const merged = new Map<string, number>();
    for (const prompt of base) {
      merged.set(prompt.text, (merged.get(prompt.text) || 0) + prompt.weight);
    }
    for (const prompt of extra) {
      merged.set(prompt.text, (merged.get(prompt.text) || 0) + prompt.weight);
    }
    return Array.from(merged.entries()).map(([text, weight]) => ({
      text,
      weight: Number(weight.toFixed(2)),
    }));
  };

  const enqueueQuantizedAction = (
    action: () => Promise<void> | void,
    options?: { quantizeBeats?: number; allowDuringDrop?: boolean; onBlocked?: () => void }
  ) => {
    const quantizeBeats = options?.quantizeBeats ?? 1;
    const allowDuringDrop = options?.allowDuringDrop ?? false;
    const onBlocked = options?.onBlocked;

    actionChainRef.current = actionChainRef.current
      .then(async () => {
        if (transitionLockRef.current === "DROP" && !allowDuringDrop) {
          onBlocked?.();
          return;
        }
        const msPerBeat = 60000 / Math.max(60, bpm);
        const beatWindow = msPerBeat * quantizeBeats;
        const waitMs = beatWindow - (performance.now() % beatWindow);
        await sleep(Math.max(20, Math.floor(waitMs)));
        if (transitionLockRef.current === "DROP" && !allowDuringDrop) {
          onBlocked?.();
          return;
        }
        await action();
      })
      .catch((error) => console.error(error));
  };

  const flushPendingFlowAction = () => {
    const pending = pendingFlowActionRef.current;
    pendingFlowActionRef.current = null;
    pending?.();
  };

  const enqueueFlowAction = (
    actionType: FlowActionType,
    action: () => Promise<void> | void
  ) => {
    const quantizeBeats = getFlowQuantizeBeats(flowMode, actionType);
    const allowDuringDrop = shouldAllowDuringDrop(actionType);

    enqueueQuantizedAction(action, {
      quantizeBeats,
      allowDuringDrop,
      onBlocked: shouldQueueWhenDropLocked(flowMode, actionType)
        ? () => {
            // Strict mode keeps the latest blocked action and replays it after drop lock ends.
            pendingFlowActionRef.current = () => enqueueFlowAction(actionType, action);
          }
        : undefined,
    });
  };

  const applySimpleEnergy = async (energy: number) => {
    const normalized = Math.min(100, Math.max(0, energy)) / 100;
    const nextDensity = Number((0.28 + normalized * 0.72).toFixed(2));
    const nextBrightness = Number((0.35 + normalized * 0.65).toFixed(2));
    const nextGuidance = Number((3 + normalized * 2.2).toFixed(2));
    setDensity(nextDensity);
    setBrightness(nextBrightness);
    setGuidance(nextGuidance);
    if (!sessionRef.current || !isPlayingRef.current) return;
    await sessionRef.current.setMusicGenerationConfig({
      musicGenerationConfig: {
        bpm,
        scale: scale === "SCALE_UNSPECIFIED" ? undefined : (scale as any),
        musicGenerationMode: generationMode as any,
        density: nextDensity,
        brightness: nextBrightness,
        guidance: nextGuidance,
        muteBass,
        muteDrums,
        onlyBassAndDrums,
      },
    });
  };

  const buildSimplePrompt = () =>
    `${simpleGenre}, ${simpleRhythm}, ${simpleInstrument}, ${simpleVocal}, ${simpleMoment} section, crowd vibe: ${simpleCrowd}, polished festival-ready production`;

  const applySimpleShowcasePreset = (preset: (typeof SIMPLE_SHOWCASE_PRESETS)[number]) => {
    setSimpleGenre(preset.genre);
    setSimpleRhythm(preset.rhythm);
    setSimpleInstrument(preset.instrument);
    setSimpleVocal(preset.vocal);
    setSimpleMoment(preset.moment);
    setSimpleCrowd(preset.crowd);
  };

  const addPromptFromText = async (rawText: string) => {
    const textToAdd = rawText.trim();
    if (!textToAdd) return;

    if (!isPlaying) {
      setPrompts(prev => [...prev, { text: textToAdd, weight: 1.0 }]);
      return;
    }

    const newPromptItem = { text: textToAdd, weight: 0.1 };
    setPrompts(prev => {
      const initialUpdated = [...prev, newPromptItem];
      updatePrompts(initialUpdated);
      return initialUpdated;
    });

    const targetWeight = 1.0;
    const steps = 8;
    const intervalTime = Math.floor((60000 / bpm) / 2);

    for (let i = 1; i <= steps; i++) {
      await new Promise(res => setTimeout(res, intervalTime));
      const currentWeight = 0.1 + ((targetWeight - 0.1) * (i / steps));
      setPrompts(prev => {
        const nextPrompts = prev.map(p => p.text === textToAdd ? { ...p, weight: Number(currentWeight.toFixed(2)) } : p);
        updatePrompts(nextPrompts);
        return nextPrompts;
      });
    }
  };

  const handleConnectAndPlay = async () => {
    if (!apiKey) return alert("Please enter your Gemini API Key.");
    localStorage.setItem("GEMINI_API_KEY", apiKey);
    
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioCtxRef.current = new AudioContextClass({ sampleRate: 48000 });
        
        // Setup Visualizer Analyser
        analyserRef.current = audioCtxRef.current.createAnalyser();
        analyserRef.current.fftSize = 256;
        analyserRef.current.connect(audioCtxRef.current.destination);
      }
      nextStartTimeRef.current = audioCtxRef.current.currentTime + 0.1;
      
      const client = new GoogleGenAI({ apiKey, apiVersion: "v1alpha" });
      
      const newSession = await client.live.music.connect({
        model: "models/lyria-realtime-exp",
        callbacks: {
          onmessage: (message: any) => {
            if (message.serverContent?.audioChunks) {
              for (const chunk of message.serverContent.audioChunks) {
                if (audioCtxRef.current && analyserRef.current) {
                  nextStartTimeRef.current = playPcm16Chunk(
                    audioCtxRef.current, 
                    chunk.data, 
                    nextStartTimeRef.current,
                    analyserRef.current // Route through visualizer
                  );
                }
              }
            }
          },
          onerror: (error: any) => {
            console.error("music session error:", error);
            setIsPlaying(false);
          },
          onclose: () => {
            console.log("Lyria RealTime stream closed.");
            setIsPlaying(false);
          },
        },
      });
      
      setSession(newSession);
      
      await newSession.setWeightedPrompts({ weightedPrompts: prompts });
      await newSession.setMusicGenerationConfig({
        musicGenerationConfig: {
          bpm, density, brightness, guidance, muteBass, muteDrums, onlyBassAndDrums,
          scale: scale === "SCALE_UNSPECIFIED" ? undefined : (scale as any),
          musicGenerationMode: generationMode as any,
        },
      });
      
      await newSession.play();
      setIsPlaying(true);
      
      // Start visualizer
      if (canvasRef.current) {
        canvasRef.current.width = canvasRef.current.offsetWidth;
        canvasRef.current.height = canvasRef.current.offsetHeight;
        drawVisualizer();
      }
    } catch (err) {
      console.error(err);
      alert("Failed to connect to Lyria API. Check console or API key quota.");
      setIsPlaying(false);
    }
  };

  const handleStop = async () => {
    megaDropRunRef.current += 1;
    transitionLockRef.current = "NONE";
    actionChainRef.current = Promise.resolve();
    setIsDropBuilding(false);
    setDropState("IDLE");
    if (session) {
      await session.stop();
      setSession(null);
    }
    if (audioCtxRef.current) {
      await audioCtxRef.current.close();
      audioCtxRef.current = null;
    }
    setIsPlaying(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
  };

  const updateSoftConfig = async () => {
    if (!session) return;
    try {
      await session.setMusicGenerationConfig({
        musicGenerationConfig: {
          bpm, scale: scale === "SCALE_UNSPECIFIED" ? undefined : (scale as any), musicGenerationMode: generationMode as any,
          density, brightness, guidance, muteBass, muteDrums, onlyBassAndDrums
        }
      });
    } catch (e) { console.error(e) }
  };

  const triggerHardDrop = async () => {
    if (!session) return;
    try {
      await session.setMusicGenerationConfig({
        musicGenerationConfig: {
          bpm, scale: scale === "SCALE_UNSPECIFIED" ? undefined : (scale as any), musicGenerationMode: generationMode as any,
          density, brightness, guidance, muteBass, muteDrums, onlyBassAndDrums
        }
      });
      await session.resetContext();
    } catch (e) { console.error(e) }
  };

  // VOCAL PAD LOGIC
  const handleVocalPadDown = async (vocalText: string) => {
    if (!session || !isPlaying) return;
    setActiveVocalPad(vocalText);
    
    // Temporarily inject the vocal prompt and switch mode to VOCALIZATION
    const tempPrompts = [...prompts, { text: vocalText, weight: 3.0 }];
    try {
      await session.setWeightedPrompts({ weightedPrompts: tempPrompts });
      if (generationMode !== "VOCALIZATION") {
        await session.setMusicGenerationConfig({
          musicGenerationConfig: {
            bpm, scale: scale === "SCALE_UNSPECIFIED" ? undefined : (scale as any),
            musicGenerationMode: "VOCALIZATION", // Temporarily force vocal mode
            density, brightness, guidance, muteBass, muteDrums, onlyBassAndDrums
          }
        });
      }
    } catch (e) { console.error(e) }
  };

  const handleVocalPadUp = async () => {
    if (!session || !isPlaying || !activeVocalPad) return;
    const releasingPadText = activeVocalPad;
    setActiveVocalPad(null);
    
    // LYRIA BEST PRACTICE: Quick fade-out for the vocal prompt (Delay Tail effect)
    // Real DJs use a delay/echo when turning off a vocal so it trails off smoothly.
    const msPerBeat = 60000 / bpm;
    const steps = 4;
    const intervalTime = Math.floor(msPerBeat / steps); // Fade out over exactly 1 beat

    for (let i = 1; i <= steps; i++) {
      await new Promise(res => setTimeout(res, intervalTime));
      const currentWeight = Math.max(0, 3.0 * (1 - (i / steps)));
      
      const trailingPrompts = [...prompts, { text: releasingPadText, weight: Number(currentWeight.toFixed(2)) }];
      try { await session.setWeightedPrompts({ weightedPrompts: trailingPrompts }); } catch (e) {}
    }
    
    // Once faded out, revert completely back to original prompts and original generation mode
    try {
      await session.setWeightedPrompts({ weightedPrompts: prompts });
      if (generationMode !== "VOCALIZATION") {
        await session.setMusicGenerationConfig({
          musicGenerationConfig: {
            bpm, scale: scale === "SCALE_UNSPECIFIED" ? undefined : (scale as any),
            musicGenerationMode: generationMode as any, // Restore previous mode
            density, brightness, guidance, muteBass, muteDrums, onlyBassAndDrums
          }
        });
      }
    } catch (e) { console.error(e) }
  };

  const triggerMegaDrop = async () => {
    if (!session || !isPlaying || isDropBuilding) return;

    const runId = Date.now();
    megaDropRunRef.current = runId;
    transitionLockRef.current = "DROP";
    setIsDropBuilding(true);

    const basePrompts = promptsRef.current;
    const baseDensity = density;
    const baseBrightness = brightness;
    const baseGuidance = guidance;
    const baseMuteBass = muteBass;
    const baseMuteDrums = muteDrums;
    const baseOnlyBassAndDrums = onlyBassAndDrums;
    const msPerBeat = 60000 / Math.max(60, bpm);
    const profile = DROP_INTENSITY_PROFILES[dropIntensity];

    const riserPrompt = {
      text: "Mainstage riser, snare roll acceleration, white noise sweep, crowd tension rising every bar",
      weight: profile.riserWeightMax,
    };
    const preDropPrompt = {
      text: "Pre-drop vacuum, fakeout silence, crowd chant anticipation",
      weight: profile.preDropWeight,
    };
    const slamPrompt = {
      text: "Festival big room drop, colossal kick, stadium bassline, anthem lead hook",
      weight: profile.slamWeight,
    };

    const guard = () => megaDropRunRef.current === runId && isPlayingRef.current && !!sessionRef.current;

    try {
      setDropState("BUILDING");

      const beatWindow = msPerBeat * 4;
      const toNextBar = beatWindow - (performance.now() % beatWindow);
      await sleep(Math.max(40, Math.floor(toNextBar)));
      if (!guard()) return;

      for (let beat = 1; beat <= profile.buildBeats; beat += 1) {
        if (!guard()) return;
        const t = beat / profile.buildBeats;
        const riserWeight = Number((0.8 + t * profile.riserWeightMax).toFixed(2));
        const stagePrompts = mergePromptSets(basePrompts, [{ ...riserPrompt, weight: riserWeight }]);
        const stageDensity = Number((baseDensity + (1 - baseDensity) * Math.pow(t, 0.8)).toFixed(2));
        const stageBrightness = Number((baseBrightness + (1 - baseBrightness) * Math.pow(t, 0.65)).toFixed(2));
        const stageGuidance = Number(Math.min(6, baseGuidance + t * profile.guidanceBoostBuild).toFixed(2));
        const stageMuteBass = t > profile.bassCutStart ? true : baseMuteBass;
        const stageMuteDrums = t > profile.drumsCutStart ? true : baseMuteDrums;

        promptsRef.current = stagePrompts;
        setPrompts(stagePrompts);
        setDensity(stageDensity);
        setBrightness(stageBrightness);
        setGuidance(stageGuidance);
        setMuteBass(stageMuteBass);
        setMuteDrums(stageMuteDrums);

        await sessionRef.current.setWeightedPrompts({ weightedPrompts: stagePrompts });
        await sessionRef.current.setMusicGenerationConfig({
          musicGenerationConfig: {
            bpm,
            scale: scale === "SCALE_UNSPECIFIED" ? undefined : (scale as any),
            musicGenerationMode: generationMode as any,
            density: stageDensity,
            brightness: stageBrightness,
            guidance: stageGuidance,
            muteBass: stageMuteBass,
            muteDrums: stageMuteDrums,
            onlyBassAndDrums: false,
          },
        });

        await sleep(Math.max(40, Math.floor(msPerBeat)));
      }

      if (!guard()) return;
      setDropState("SILENCE");
      const silencePrompts = mergePromptSets(basePrompts, [preDropPrompt]);
      promptsRef.current = silencePrompts;
      setPrompts(silencePrompts);
      setDensity(0.06);
      setBrightness(1);
      setGuidance(Math.min(6, baseGuidance + profile.guidanceBoostSilence));
      setMuteBass(true);
      setMuteDrums(true);

      await sessionRef.current.setWeightedPrompts({ weightedPrompts: silencePrompts });
      await sessionRef.current.setMusicGenerationConfig({
        musicGenerationConfig: {
          bpm,
          scale: scale === "SCALE_UNSPECIFIED" ? undefined : (scale as any),
          musicGenerationMode: generationMode as any,
          density: 0.06,
          brightness: 1,
          guidance: Math.min(6, baseGuidance + profile.guidanceBoostSilence),
          muteBass: true,
          muteDrums: true,
          onlyBassAndDrums: false,
        },
      });
      await sleep(Math.max(40, Math.floor(msPerBeat * profile.silenceBeats)));

      if (!guard()) return;
      setDropState("DROP");
      const dropPrompts = mergePromptSets(basePrompts, [slamPrompt]);
      promptsRef.current = dropPrompts;
      setPrompts(dropPrompts);
      setDensity(Math.max(profile.densityFloorDrop, baseDensity));
      setBrightness(Math.max(profile.brightnessFloorDrop, baseBrightness));
      setGuidance(Number(Math.min(6, baseGuidance + profile.guidanceBoostDrop).toFixed(2)));
      setMuteBass(false);
      setMuteDrums(false);
      setOnlyBassAndDrums(false);

      await sessionRef.current.setWeightedPrompts({ weightedPrompts: dropPrompts });
      await sessionRef.current.setMusicGenerationConfig({
        musicGenerationConfig: {
          bpm,
          scale: scale === "SCALE_UNSPECIFIED" ? undefined : (scale as any),
          musicGenerationMode: generationMode as any,
          density: Math.max(profile.densityFloorDrop, baseDensity),
          brightness: Math.max(profile.brightnessFloorDrop, baseBrightness),
          guidance: Number(Math.min(6, baseGuidance + profile.guidanceBoostDrop).toFixed(2)),
          muteBass: false,
          muteDrums: false,
          onlyBassAndDrums: false,
        },
      });

      for (let beat = 1; beat <= profile.holdBeats; beat += 1) {
        if (!guard()) return;
        await sleep(Math.max(40, Math.floor(msPerBeat)));
      }

      if (!guard()) return;
      promptsRef.current = basePrompts;
      setPrompts(basePrompts);
      setDensity(baseDensity);
      setBrightness(baseBrightness);
      setGuidance(baseGuidance);
      setMuteBass(baseMuteBass);
      setMuteDrums(baseMuteDrums);
      setOnlyBassAndDrums(baseOnlyBassAndDrums);

      await sessionRef.current.setWeightedPrompts({ weightedPrompts: basePrompts });
      await sessionRef.current.setMusicGenerationConfig({
        musicGenerationConfig: {
          bpm,
          scale: scale === "SCALE_UNSPECIFIED" ? undefined : (scale as any),
          musicGenerationMode: generationMode as any,
          density: baseDensity,
          brightness: baseBrightness,
          guidance: baseGuidance,
          muteBass: baseMuteBass,
          muteDrums: baseMuteDrums,
          onlyBassAndDrums: baseOnlyBassAndDrums,
        },
      });
    } catch (e) {
      console.error(e);
    } finally {
      if (megaDropRunRef.current === runId) {
        transitionLockRef.current = "NONE";
        setIsDropBuilding(false);
        setDropState("IDLE");
        flushPendingFlowAction();
      }
    }
  };
  
  const updatePrompts = async (newPrompts: any) => {
    if (!session) return;
    try { await session.setWeightedPrompts({ weightedPrompts: newPrompts }); } catch (e) { console.error(e) }
  };

  const removePrompt = async (index: number) => {
    if (!isPlaying) {
      setPrompts(prev => prev.filter((_, i) => i !== index));
      return;
    }
    const promptToRemove = prompts[index];
    const steps = 6;
    const intervalTime = Math.floor((60000 / bpm) / 2); 
    let currentWeight = promptToRemove.weight;

    for (let i = 1; i <= steps; i++) {
      await new Promise(res => setTimeout(res, intervalTime));
      currentWeight = Math.max(0, promptToRemove.weight * (1 - (i / steps)));
      setPrompts(prev => {
        const nextPrompts = prev.map((p, idx) => idx === index ? { ...p, weight: Number(currentWeight.toFixed(2)) } : p);
        updatePrompts(nextPrompts);
        return nextPrompts;
      });
    }
    setPrompts(prev => {
      const finalPrompts = prev.filter((_, i) => i !== index);
      updatePrompts(finalPrompts);
      return finalPrompts;
    });
  };

  const addPrompt = async () => {
    const textToAdd = newPrompt;
    setNewPrompt("");
    await addPromptFromText(textToAdd);
  };

  // GENRE PRESET LOGIC
  const handleGenreSelect = async (genre: typeof GENRE_PRESETS[0]) => {
    const transitionId = Date.now();
    genreTransitionRef.current = transitionId;
    setActiveGenre(genre.label);

    const currentPrompts = promptsRef.current;
    const baseWithoutOldGenre = currentPrompts.filter((p) => !activeGenrePrompts.includes(p.text));
    const targetPrompts = mergePromptSets(baseWithoutOldGenre, genre.prompts);
    const nextGenrePromptTexts = genre.prompts.map((p) => p.text);

    if (!session || !isPlaying) {
      promptsRef.current = targetPrompts;
      setPrompts(targetPrompts);
      setBpm(genre.bpm);
      setDensity(genre.density);
      setBrightness(genre.brightness);
      setActiveGenrePrompts(nextGenrePromptTexts);
      return;
    }

    try {
      const startPrompts = promptsRef.current;
      const startDensity = density;
      const startBrightness = brightness;
      const startBpm = bpm;
      const transitionSteps = 8;
      const msPerBeat = 60000 / Math.max(60, startBpm);
      const intervalTime = Math.max(70, Math.floor(msPerBeat / 2));

      for (let i = 1; i <= transitionSteps; i++) {
        if (genreTransitionRef.current !== transitionId) return;
        const progress = i / transitionSteps;
        const blendedPrompts = mergePromptsForCrossfade(startPrompts, targetPrompts, progress);
        const nextDensity = Number((startDensity + (genre.density - startDensity) * progress).toFixed(2));
        const nextBrightness = Number((startBrightness + (genre.brightness - startBrightness) * progress).toFixed(2));

        promptsRef.current = blendedPrompts;
        setPrompts(blendedPrompts);
        setDensity(nextDensity);
        setBrightness(nextBrightness);

        await session.setWeightedPrompts({ weightedPrompts: blendedPrompts });
        await session.setMusicGenerationConfig({
          musicGenerationConfig: {
            bpm: startBpm,
            density: nextDensity,
            brightness: nextBrightness,
            guidance,
            scale: scale === "SCALE_UNSPECIFIED" ? undefined : (scale as any),
            musicGenerationMode: generationMode as any,
            muteBass,
            muteDrums,
            onlyBassAndDrums,
          },
        });

        await sleep(intervalTime);
      }

      if (genreTransitionRef.current !== transitionId) return;

      promptsRef.current = targetPrompts;
      setPrompts(targetPrompts);
      setBpm(genre.bpm);
      setDensity(genre.density);
      setBrightness(genre.brightness);
      setActiveGenrePrompts(nextGenrePromptTexts);

      await session.setWeightedPrompts({ weightedPrompts: targetPrompts });
      await session.setMusicGenerationConfig({
        musicGenerationConfig: {
          bpm: genre.bpm,
          density: genre.density,
          brightness: genre.brightness,
          guidance,
          scale: scale === "SCALE_UNSPECIFIED" ? undefined : (scale as any),
          musicGenerationMode: generationMode as any,
          muteBass,
          muteDrums,
          onlyBassAndDrums,
        },
      });
      if (startBpm !== genre.bpm) {
        await session.resetContext();
        await session.setWeightedPrompts({ weightedPrompts: targetPrompts });
      }
    } catch (e) { console.error(e) }
  };

  // INSTRUMENT RACK LOGIC
  const handleInstrumentToggle = async (instrumentLabel: string) => {
    const isActive = activeInstruments.has(instrumentLabel);

    if (isActive) {
      // Fade out instrument
      const newSet = new Set(activeInstruments);
      newSet.delete(instrumentLabel);
      setActiveInstruments(newSet);

      if (!session || !isPlaying) {
        setPrompts(prev => prev.filter(p => p.text !== instrumentLabel));
        return;
      }

      // Smooth fade out over 4 steps
      const steps = 4;
      const msPerBeat = 60000 / bpm;
      const intervalTime = Math.floor(msPerBeat / steps);
      const currentPrompt = promptsRef.current.find(p => p.text === instrumentLabel);
      const startWeight = currentPrompt?.weight || 1.0;

      for (let i = 1; i <= steps; i++) {
        await sleep(intervalTime);
        const fadeWeight = Math.max(0, startWeight * (1 - (i / steps)));
        const fadedPrompts = promptsRef.current.map(p => p.text === instrumentLabel ? { ...p, weight: Number(fadeWeight.toFixed(2)) } : p);
        promptsRef.current = fadedPrompts;
        setPrompts(fadedPrompts);
        try { await session.setWeightedPrompts({ weightedPrompts: fadedPrompts }); } catch (e) {}
      }

      // Remove fully
        setPrompts(prev => {
          const final = prev.filter(p => p.text !== instrumentLabel);
          promptsRef.current = final;
          updatePrompts(final);
          return final;
        });
    } else {
      // Fade in instrument
      const newSet = new Set(activeInstruments);
      newSet.add(instrumentLabel);
      setActiveInstruments(newSet);

      const newInstrumentPrompt = { text: instrumentLabel, weight: 0.1 };
      setPrompts(prev => {
        const updated = [...prev, newInstrumentPrompt];
        promptsRef.current = updated;
        if (session && isPlaying) updatePrompts(updated);
        return updated;
      });

      if (!session || !isPlaying) {
        setPrompts(prev => {
          const next = prev.map(p => p.text === instrumentLabel ? { ...p, weight: 1.0 } : p);
          promptsRef.current = next;
          return next;
        });
        return;
      }

      // Smooth fade in over 6 steps
      const steps = 6;
      const msPerBeat = 60000 / bpm;
      const intervalTime = Math.floor(msPerBeat / steps);

      for (let i = 1; i <= steps; i++) {
        await sleep(intervalTime);
        const fadeWeight = 0.1 + (0.9 * (i / steps));
        const fadedPrompts = promptsRef.current.map(p => p.text === instrumentLabel ? { ...p, weight: Number(fadeWeight.toFixed(2)) } : p);
        promptsRef.current = fadedPrompts;
        setPrompts(fadedPrompts);
        await updatePrompts(fadedPrompts);
      }
    }
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-white font-sans overflow-x-hidden selection:bg-orange-500 selection:text-white pb-12 relative">
      {/* Background AI Animation */}
      <div className="fixed inset-0 pointer-events-none z-0 opacity-40">
        <Image src="/ai_nodes.svg" alt="AI Neural Network" fill style={{ objectFit: 'cover' }} className="mix-blend-screen" />
      </div>
      
      {/* Content wrapper to put above the background */}
      <div className="relative z-10">
        {/* Top Banner with Animated SVG & Realtime Visualizer */}
      <div className="relative w-full h-64 bg-black border-b-4 border-orange-500 shadow-[0_10px_40px_rgba(255,102,0,0.2)] overflow-hidden">
        <Image src="/dj_animated.svg" alt="DJ Nightclub" fill style={{ objectFit: 'cover' }} className="opacity-40 mix-blend-screen" />
        <canvas ref={canvasRef} className="absolute bottom-0 left-0 w-full h-32 opacity-80 mix-blend-screen" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-transparent to-transparent" />
        
        <div className="absolute bottom-4 left-6 flex items-center space-x-4">
          <div className="w-4 h-16 bg-orange-500 rounded-sm animate-pulse shadow-[0_0_15px_#ff6600]" />
          <div>
            <h1 className="text-4xl font-black uppercase tracking-widest text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-orange-600 drop-shadow-[0_0_10px_rgba(255,102,0,0.5)]">
              Avivly DJ Console
            </h1>
            <p className="text-orange-200 tracking-widest text-sm font-semibold uppercase mt-1 flex items-center">
              <Activity className="w-4 h-4 mr-2" /> Powered by Lyria RealTime
            </p>
            <div className="mt-3 inline-flex bg-black/70 border border-neutral-700 rounded-lg p-1 gap-1">
              {(["SIMPLE", "ADVANCED"] as UiMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setUiMode(mode)}
                  className={`px-3 py-1.5 text-[10px] font-bold tracking-widest rounded-md transition-all ${
                    uiMode === mode ? "bg-orange-500 text-black" : "text-neutral-300 hover:text-white"
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {uiMode === "SIMPLE" ? (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 shadow-xl space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-black border border-neutral-800 rounded-xl p-4 space-y-4">
              <h3 className="text-xs uppercase tracking-[0.2em] text-cyan-300 font-bold">System Link</h3>
              <input
                type="password"
                placeholder="Gemini API Key"
                className="w-full bg-neutral-950 border border-neutral-700 rounded-lg p-3 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none placeholder:text-neutral-600 font-mono"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              {isPlaying ? (
                <button onClick={handleStop} className="w-full py-3 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg uppercase tracking-wider">
                  Stop Set
                </button>
              ) : (
                <button onClick={handleConnectAndPlay} className="w-full py-3 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg uppercase tracking-wider">
                  Play Live Set
                </button>
              )}
            </div>

          <div className="bg-black border border-neutral-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-xs uppercase tracking-[0.2em] text-orange-300 font-bold">Flow Mode</h3>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { label: "Strict Pro", value: "STRICT_PRO" },
                  { label: "Balanced", value: "BALANCED" },
                ] as const).map((modeItem) => (
                  <button
                    key={modeItem.value}
                    type="button"
                    onClick={() => setFlowMode(modeItem.value)}
                    className={`px-3 py-1.5 text-[10px] font-bold tracking-widest rounded-md border transition-all ${
                      flowMode === modeItem.value
                        ? "border-orange-500 bg-orange-500 text-black"
                        : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-orange-500/70"
                    }`}
                  >
                    {modeItem.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-neutral-800" />

            <h3 className="text-xs uppercase tracking-[0.2em] text-fuchsia-300 font-bold">Energy</h3>
            <div className="flex justify-between text-xs text-neutral-400 uppercase tracking-widest">
              <span>Warmup</span>
              <span className="text-white font-mono">{simpleEnergy}%</span>
              <span>Mainstage</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                step="1"
                value={simpleEnergy}
                onChange={(e) => setSimpleEnergy(parseInt(e.target.value))}
                onMouseUp={() => enqueueFlowAction("ENERGY", () => applySimpleEnergy(simpleEnergy))}
                onTouchEnd={() => enqueueFlowAction("ENERGY", () => applySimpleEnergy(simpleEnergy))}
                className="w-full accent-fuchsia-500 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
              />
            </div>
          </div>

          <div className="bg-black border border-neutral-800 rounded-xl p-4 space-y-4">
            <h3 className="text-xs uppercase tracking-[0.2em] text-green-300 font-bold">Scenes</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {SIMPLE_SCENES.map((scene) => {
                const genre = GENRE_PRESETS.find((item) => item.label === scene.genre);
                return (
                  <button
                    key={scene.label}
                    type="button"
                    onClick={() => genre && enqueueFlowAction("SCENE", () => handleGenreSelect(genre))}
                    className="py-3 rounded-lg border border-neutral-700 bg-neutral-950 hover:border-green-500 hover:text-green-300 transition-all text-sm font-bold tracking-wider"
                  >
                    {scene.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="bg-black border border-neutral-800 rounded-xl p-4 space-y-4">
            <h3 className="text-xs uppercase tracking-[0.2em] text-orange-300 font-bold">Showcase Presets</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              {SIMPLE_SHOWCASE_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => applySimpleShowcasePreset(preset)}
                  className="py-2 px-2 rounded-md border border-neutral-700 bg-neutral-950 hover:border-orange-500 hover:text-orange-300 text-[11px] font-bold uppercase tracking-wide transition-all"
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-black border border-neutral-800 rounded-xl p-4 space-y-4">
            <h3 className="text-xs uppercase tracking-[0.2em] text-cyan-300 font-bold">Prompt Builder</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <select value={simpleGenre} onChange={(e) => setSimpleGenre(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-sm">
                {SIMPLE_PROMPT_OPTIONS.genres.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={simpleRhythm} onChange={(e) => setSimpleRhythm(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-sm">
                {SIMPLE_PROMPT_OPTIONS.rhythms.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={simpleInstrument} onChange={(e) => setSimpleInstrument(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-sm">
                {SIMPLE_PROMPT_OPTIONS.instruments.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={simpleVocal} onChange={(e) => setSimpleVocal(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-sm">
                {SIMPLE_PROMPT_OPTIONS.vocals.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={simpleMoment} onChange={(e) => setSimpleMoment(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-sm">
                {SIMPLE_MOMENTS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select value={simpleCrowd} onChange={(e) => setSimpleCrowd(e.target.value)} className="bg-neutral-950 border border-neutral-700 rounded-lg p-2 text-sm">
                {SIMPLE_CROWD_FLAVORS.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
            </div>
            <button
              type="button"
              onClick={() => enqueueFlowAction("CRAFTED_PROMPT", () => addPromptFromText(buildSimplePrompt()))}
              className="w-full py-3 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-black font-bold uppercase tracking-wider"
            >
              Inject Crafted Prompt
            </button>
          </div>

          <div className="bg-black border border-neutral-800 rounded-xl p-4 space-y-4">
            <h3 className="text-xs uppercase tracking-[0.2em] text-yellow-300 font-bold">Vocal Chops Lite</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Hype", prompt: "crowd hype chant with rhythmic festival callouts" },
                { label: "Euphoria", prompt: "dreamy euphoric vocal chop with wide reverb tails" },
              ].map((pad) => (
                <button
                  key={pad.label}
                  onMouseDown={() => enqueueFlowAction("VOCAL_DOWN", () => handleVocalPadDown(pad.prompt))}
                  onMouseUp={() => enqueueFlowAction("VOCAL_UP", handleVocalPadUp)}
                  onMouseLeave={() => enqueueFlowAction("VOCAL_UP", handleVocalPadUp)}
                  onTouchStart={() => enqueueFlowAction("VOCAL_DOWN", () => handleVocalPadDown(pad.prompt))}
                  onTouchEnd={() => enqueueFlowAction("VOCAL_UP", handleVocalPadUp)}
                  disabled={!isPlaying}
                  className={`p-4 rounded-lg border-2 font-bold uppercase tracking-wider transition-all ${
                    !isPlaying
                      ? "border-neutral-800 text-neutral-600 bg-neutral-900"
                      : activeVocalPad === pad.prompt
                      ? "bg-yellow-400 text-black border-yellow-400 shadow-[0_0_20px_#facc15]"
                      : "bg-neutral-950 text-yellow-300 border-neutral-700 hover:border-yellow-400/60"
                  }`}
                >
                  {pad.label}
                </button>
              ))}
            </div>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest">Hold to inject, release to fade.</p>
          </div>

          <div className="bg-black border border-neutral-800 rounded-xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs uppercase tracking-[0.2em] text-orange-300 font-bold">Mega Drop</h3>
              <span className="text-[10px] uppercase tracking-widest text-neutral-400">{dropState === "IDLE" ? "Ready" : dropState}</span>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {(["LITE", "FESTIVAL", "NUCLEAR"] as DropIntensity[]).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setDropIntensity(level)}
                  disabled={isDropBuilding}
                  className={`py-2 rounded-md text-xs font-bold tracking-wider uppercase border transition-all ${
                    dropIntensity === level
                      ? "border-orange-500 bg-orange-500 text-black"
                      : "border-neutral-700 bg-neutral-950 text-neutral-300 hover:border-orange-500/70"
                  } ${isDropBuilding ? "opacity-60 cursor-not-allowed" : ""}`}
                >
                  {level}
                </button>
              ))}
            </div>
            <button
              onClick={() => enqueueFlowAction("MEGA_DROP", triggerMegaDrop)}
              disabled={!isPlaying || isDropBuilding}
              className={`w-full py-4 rounded-lg font-black uppercase tracking-[0.2em] text-sm transition-all ${
                !isPlaying || isDropBuilding
                  ? "bg-neutral-800 text-neutral-600 cursor-not-allowed"
                  : "bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white shadow-[0_0_25px_rgba(249,115,22,0.5)]"
              }`}
            >
              {dropState === "IDLE" ? "Mega Drop" : dropState === "BUILDING" ? "Building..." : dropState === "SILENCE" ? "Wait For It..." : "Bass Drop"}
            </button>
          </div>

          <div className="text-xs text-neutral-500 uppercase tracking-wider text-center">
            Simple mode uses {flowMode === "STRICT_PRO" ? "phrase-locked strict flow" : "faster balanced flow"} for synced transitions.
          </div>
        </div>
      </div>
      ) : (
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-6 p-6">
        
        {/* Left Column: Connection & Hard Transitions */}
        <div className="lg:col-span-3 space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-1 h-full bg-cyan-500 shadow-[0_0_15px_#00ffff]" />
            <h2 className="text-xl font-bold mb-4 flex items-center tracking-wide text-cyan-400 uppercase">
              <Settings2 className="w-5 h-5 mr-2" /> System Link
            </h2>
            <input 
              type="password"
              placeholder="Gemini API Key"
              className="w-full bg-black border border-neutral-700 rounded-lg p-3 text-sm focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500 outline-none transition-all placeholder:text-neutral-600 mb-4 font-mono"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
            />
            {isPlaying ? (
              <button onClick={handleStop} className="w-full py-4 bg-red-600 hover:bg-red-500 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(220,38,38,0.4)] transition-all flex items-center justify-center uppercase tracking-widest">
                <Square className="w-5 h-5 mr-2 fill-current" /> Stop Set
              </button>
            ) : (
              <button onClick={handleConnectAndPlay} className="w-full py-4 bg-orange-600 hover:bg-orange-500 text-white font-bold rounded-lg shadow-[0_0_20px_rgba(234,88,12,0.4)] transition-all flex items-center justify-center uppercase tracking-widest">
                <Play className="w-5 h-5 mr-2 fill-current" /> Play Live Set
              </button>
            )}
          </div>

          {/* Hard Drop Controls */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-red-500 shadow-[0_0_15px_#ff0000]" />
            <h2 className="text-lg font-bold mb-4 tracking-wide text-red-400 uppercase flex items-center">
              <Sparkles className="w-5 h-5 mr-2" /> Hard Drops
            </h2>
            <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-4">
              Requires context reset
            </div>
            
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-neutral-400 uppercase tracking-wider">
                  <span>Tempo (BPM)</span>
                  <span className="text-white bg-neutral-800 px-2 rounded font-mono">{bpm}</span>
                </div>
                <input 
                  type="range" min="60" max="200" step="1"
                  value={bpm} onChange={e => setBpm(parseInt(e.target.value))}
                  className="w-full accent-red-500 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Harmonic Key</div>
                <select 
                  className="w-full bg-black border border-neutral-700 rounded p-2 text-xs font-mono text-white outline-none"
                  value={scale} onChange={e => setScale(e.target.value)}
                >
                  {SCALE_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, " ")}</option>)}
                </select>
              </div>

              <div className="space-y-2">
                <div className="text-xs font-bold text-neutral-400 uppercase tracking-wider">Generation Mode</div>
                <select 
                  className="w-full bg-black border border-neutral-700 rounded p-2 text-xs font-mono text-white outline-none"
                  value={generationMode} onChange={e => setGenerationMode(e.target.value)}
                >
                  {MODE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              <button 
                onClick={() => enqueueQuantizedAction(triggerHardDrop, { quantizeBeats: 4 })} 
                disabled={!isPlaying}
                className={`w-full py-3 mt-4 rounded font-bold uppercase tracking-widest text-sm transition-all shadow-md ${isPlaying ? 'bg-red-600 hover:bg-red-500 text-white' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'}`}
              >
                Trigger Drop!
              </button>
            </div>
          </div>

          {/* Genre Preset Board */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl relative">
            <div className="absolute top-0 left-0 w-1 h-full bg-green-500 shadow-[0_0_15px_#22c55e]" />
            <h2 className="text-lg font-bold mb-4 tracking-wide text-green-400 uppercase flex items-center">
              <Disc3 className="w-5 h-5 mr-2" /> Genre Presets
            </h2>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-4">
              Tap to blend with your current mix. BPM change resets context.
            </p>
            <div className="grid grid-cols-2 gap-2">
              {GENRE_PRESETS.map((genre) => (
                <button
                  key={genre.label}
                  onClick={() => enqueueQuantizedAction(() => handleGenreSelect(genre), { quantizeBeats: 4 })}
                  className={`p-3 rounded-lg border-2 font-bold text-xs text-center uppercase tracking-wide transition-all select-none
                    ${activeGenre === genre.label
                      ? 'bg-green-500 text-black border-green-500 shadow-[0_0_15px_#22c55e] scale-[0.97]'
                      : 'bg-black text-green-400 border-neutral-800 hover:border-green-500/50'
                    }
                  `}
                >
                  {genre.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="lg:col-span-4 space-y-6">
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl relative h-full">
            <div className="absolute top-0 right-0 w-1 h-full bg-magenta-500 shadow-[0_0_15px_#ff00ff]" />
            <h2 className="text-xl font-bold mb-6 tracking-wide text-[#ff00ff] uppercase flex items-center">
              <Volume2 className="w-5 h-5 mr-2" /> Master Mixer
            </h2>
            <div className="text-[10px] text-neutral-500 uppercase tracking-widest mb-6">
              Smooth real-time transitions
            </div>
            
            <div className="space-y-8">
              {/* Density Slider */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-bold text-neutral-400 uppercase tracking-wider">
                  <span>Density (Busy)</span>
                  <span className="text-white bg-neutral-800 px-2 py-1 rounded font-mono">{(density * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05"
                  value={density} onChange={e => setDensity(parseFloat(e.target.value))}
                  onMouseUp={updateSoftConfig}
                  className="w-full accent-magenta-500 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Brightness Slider */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-bold text-neutral-400 uppercase tracking-wider">
                  <span>Brightness (Highs)</span>
                  <span className="text-white bg-neutral-800 px-2 py-1 rounded font-mono">{(brightness * 100).toFixed(0)}%</span>
                </div>
                <input 
                  type="range" min="0" max="1" step="0.05"
                  value={brightness} onChange={e => setBrightness(parseFloat(e.target.value))}
                  onMouseUp={updateSoftConfig}
                  className="w-full accent-cyan-400 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              {/* Guidance Slider */}
              <div className="space-y-3">
                <div className="flex justify-between text-sm font-bold text-neutral-400 uppercase tracking-wider">
                  <span>Prompt Adherence</span>
                  <span className="text-white bg-neutral-800 px-2 py-1 rounded font-mono">{guidance.toFixed(1)}</span>
                </div>
                <input 
                  type="range" min="0" max="6" step="0.1"
                  value={guidance} onChange={e => setGuidance(parseFloat(e.target.value))}
                  onMouseUp={updateSoftConfig}
                  className="w-full accent-orange-500 h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-neutral-600">
                  <span>Loose</span>
                  <span>Strict (Abrupt)</span>
                </div>
              </div>

              {/* Breakdown Toggles */}
              <div className="pt-6 border-t border-neutral-800 space-y-4">
                
                {/* AFROJACK MEGA DROP BUTTON! */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-[10px] uppercase tracking-widest text-neutral-500">
                    <span>Drop Intensity</span>
                    <span className="text-orange-400 font-bold">{dropIntensity}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    {(["LITE", "FESTIVAL", "NUCLEAR"] as DropIntensity[]).map((level) => (
                      <button
                        key={level}
                        type="button"
                        onClick={() => setDropIntensity(level)}
                        disabled={isDropBuilding}
                        className={`py-2 rounded-md text-xs font-bold tracking-wider uppercase border transition-all
                          ${dropIntensity === level
                            ? "border-orange-500 bg-orange-500 text-black shadow-[0_0_12px_rgba(249,115,22,0.6)]"
                            : "border-neutral-700 bg-black text-neutral-300 hover:border-orange-500/70"
                          }
                          ${isDropBuilding ? "opacity-60 cursor-not-allowed" : ""}
                        `}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>

                <button 
                  onClick={() => enqueueQuantizedAction(triggerMegaDrop, { quantizeBeats: 4, allowDuringDrop: true })} 
                  disabled={!isPlaying || isDropBuilding}
                  className={`w-full py-5 rounded-lg font-black uppercase tracking-[0.2em] text-lg transition-all shadow-[0_0_30px_rgba(255,102,0,0.5)] flex items-center justify-center relative overflow-hidden
                    ${dropState === 'IDLE' ? (isPlaying ? 'bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-500 hover:to-red-500 text-white cursor-pointer' : 'bg-neutral-800 text-neutral-600 cursor-not-allowed shadow-none') : ''}
                    ${dropState === 'BUILDING' ? 'bg-cyan-500 text-black animate-pulse shadow-[0_0_40px_#00ffff]' : ''}
                    ${dropState === 'SILENCE' ? 'bg-black text-red-600 border-2 border-red-600 shadow-none' : ''}
                    ${dropState === 'DROP' ? 'bg-magenta-500 text-white animate-bounce shadow-[0_0_50px_#ff00ff]' : ''}
                  `}
                >
                  {dropState === 'IDLE' && <span><Sparkles className="inline w-6 h-6 mr-3"/> Mega Drop</span>}
                  {dropState === 'BUILDING' && <span>BUILDING... </span>}
                  {dropState === 'SILENCE' && <span>WAIT FOR IT...</span>}
                  {dropState === 'DROP' && <span>BASS DROP!!! 🚀</span>}
                </button>

                <label className="flex items-center justify-between p-3 bg-black rounded-lg border border-neutral-800 cursor-pointer group hover:border-orange-500 transition-colors">
                  <span className="text-sm font-bold uppercase tracking-wider text-orange-400 flex items-center"><SlidersHorizontal className="w-4 h-4 mr-2"/> Breakdown (Bass+Drums)</span>
                  <div className="relative">
                    <input type="checkbox" checked={onlyBassAndDrums} onChange={e => { setOnlyBassAndDrums(e.target.checked); setTimeout(updateSoftConfig, 10); }} className="sr-only peer" />
                    <div className="w-10 h-5 bg-neutral-800 rounded-full peer peer-checked:bg-orange-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all" />
                  </div>
                </label>

                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center justify-center space-x-2 p-3 bg-black rounded-lg border border-neutral-800 cursor-pointer group hover:border-cyan-500 transition-colors">
                    <input type="checkbox" checked={muteBass} onChange={e => { setMuteBass(e.target.checked); setTimeout(updateSoftConfig, 10); }} className="sr-only peer" />
                    <div className="w-4 h-4 rounded border-2 border-neutral-600 peer-checked:bg-cyan-500 peer-checked:border-cyan-500 flex items-center justify-center"><X className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100"/></div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 group-hover:text-white transition-colors">Cut Bass</span>
                  </label>
                  
                  <label className="flex items-center justify-center space-x-2 p-3 bg-black rounded-lg border border-neutral-800 cursor-pointer group hover:border-magenta-500 transition-colors">
                    <input type="checkbox" checked={muteDrums} onChange={e => { setMuteDrums(e.target.checked); setTimeout(updateSoftConfig, 10); }} className="sr-only peer" />
                    <div className="w-4 h-4 rounded border-2 border-neutral-600 peer-checked:bg-magenta-500 peer-checked:border-magenta-500 flex items-center justify-center"><X className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100"/></div>
                    <span className="text-xs font-bold uppercase tracking-wider text-neutral-400 group-hover:text-white transition-colors">Cut Drums</span>
                  </label>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Prompt Decks & Vocal Pads */}
        <div className="lg:col-span-5 flex flex-col space-y-6">
          
          {/* Prompt Decks */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl relative flex-grow">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-orange-500 via-magenta-500 to-cyan-500" />
            
            <h2 className="text-xl font-bold mb-6 tracking-wide text-white uppercase flex items-center">
              Prompt Decks
            </h2>
            
            <div className="space-y-4 mb-8">
              {prompts.map((p, idx) => (
                <div key={idx} className="flex items-center space-x-4 bg-black p-4 rounded-xl border border-neutral-800 group hover:border-neutral-600 transition-colors">
                  <div className="flex-grow">
                    <div className="text-sm text-neutral-400 uppercase tracking-widest text-[10px] mb-1">Track Influence</div>
                    <div className="font-bold text-sm text-white break-words">{p.text}</div>
                  </div>
                  <div className="flex flex-col items-center w-24">
                    <span className="text-xs text-orange-500 font-mono mb-1">WT: {p.weight.toFixed(1)}</span>
                    <input 
                      type="range" min="0.1" max="3" step="0.1" value={p.weight}
                      onChange={(e) => {
                        const updated = [...prompts];
                        updated[idx].weight = parseFloat(e.target.value);
                        setPrompts(updated);
                      }}
                      onMouseUp={() => updatePrompts(prompts)}
                      className="w-full accent-orange-500 h-1 bg-neutral-800 rounded appearance-none"
                    />
                  </div>
                  <button onClick={() => removePrompt(idx)} className="text-neutral-600 hover:text-red-500 p-2 transition-colors">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>

            <div className="bg-black p-4 rounded-xl border border-neutral-800 flex items-center space-x-4 focus-within:border-orange-500 transition-colors">
              <input 
                type="text"
                placeholder="Inject new vibe (e.g. Acid House Synths)"
                className="flex-grow bg-transparent text-sm text-white outline-none placeholder:text-neutral-700"
                value={newPrompt}
                onChange={e => setNewPrompt(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addPrompt()}
              />
              <button onClick={addPrompt} className="bg-neutral-800 hover:bg-orange-600 text-white p-3 rounded-lg transition-all shadow-md">
                <Plus className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* VOCAL PADS */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl relative">
            <div className="absolute top-0 right-0 w-1 h-full bg-yellow-400 shadow-[0_0_15px_#facc15]" />
            <h2 className="text-lg font-bold mb-4 tracking-wide text-yellow-400 uppercase flex items-center">
              <MicVocal className="w-5 h-5 mr-2" /> Vocal Chops Pad
            </h2>
            <p className="text-[10px] text-neutral-400 uppercase tracking-widest mb-4">
              Hold to inject. Uses VOCALIZATION Mode.
            </p>

            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Female Choir", prompt: "Ethereal female choir singing epic chords" },
                { label: "Hype Shouts", prompt: "Aggressive male rap hype shouts, 'Let's Go!'" },
                { label: "Robotic Vocoder", prompt: "Daft Punk style robotic vocoder voice" },
                { label: "Trance Vocal", prompt: "Beautiful female trance vocal chops, delay" }
              ].map((pad, idx) => (
                <button
                  key={idx}
                  onMouseDown={() => handleVocalPadDown(pad.prompt)}
                  onMouseUp={handleVocalPadUp}
                  onMouseLeave={handleVocalPadUp}
                  onTouchStart={() => handleVocalPadDown(pad.prompt)}
                  onTouchEnd={handleVocalPadUp}
                  disabled={!isPlaying}
                  className={`p-4 rounded-xl border-2 font-bold text-sm text-center uppercase tracking-wide transition-all select-none
                    ${!isPlaying ? 'border-neutral-800 text-neutral-600 bg-neutral-900' : 
                      activeVocalPad === pad.prompt 
                        ? 'bg-yellow-400 text-black border-yellow-400 shadow-[0_0_20px_#facc15] scale-95' 
                        : 'bg-black text-yellow-500 border-neutral-800 hover:border-yellow-500/50'
                    }
                  `}
                >
                  {pad.label}
                </button>
              ))}
            </div>
          </div>

          {/* INSTRUMENT RACK */}
          <div className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-xl relative">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500" />
            <h2 className="text-lg font-bold mb-4 tracking-wide text-purple-400 uppercase flex items-center">
              <Guitar className="w-5 h-5 mr-2" /> Instrument Rack
            </h2>
            <p className="text-[10px] text-neutral-500 uppercase tracking-widest mb-4">
              Tap to layer in/out with smooth fading
            </p>
            <div className="grid grid-cols-3 gap-2">
              {INSTRUMENTS.map((inst) => {
                const isActive = activeInstruments.has(inst.label);
                return (
                  <button
                    key={inst.label}
                    onClick={() => enqueueQuantizedAction(() => handleInstrumentToggle(inst.label), { quantizeBeats: 1 })}
                    className={`p-3 rounded-lg border-2 font-bold text-[11px] text-center uppercase tracking-wide transition-all select-none leading-tight
                      ${isActive
                        ? 'bg-purple-500 text-white border-purple-500 shadow-[0_0_15px_#a855f7] scale-[0.97]'
                        : 'bg-black text-purple-400 border-neutral-800 hover:border-purple-500/50'
                      }
                    `}
                  >
                    <span className="block text-lg mb-1 font-mono opacity-60">{inst.emoji}</span>
                    {inst.label}
                  </button>
                );
              })}
            </div>
          </div>

        </div>
      </div>
      )}

      {/* FOOTER */}
      <footer className="mt-16 pb-8 flex flex-col items-center justify-center space-y-3 relative z-10 text-neutral-500">
        <div className="flex items-center space-x-2">
          <Sparkles className="w-4 h-4 text-cyan-500" />
          <span className="uppercase tracking-widest text-xs font-bold">Made with ❤️ by DJ Aviv @ Avivly</span>
          <Sparkles className="w-4 h-4 text-cyan-500" />
        </div>
        <a 
          href="https://physiotherapy.ai" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="text-orange-500 hover:text-orange-400 transition-colors text-xs font-mono font-bold tracking-widest hover:underline decoration-orange-500/50 underline-offset-4"
        >
          PHYSIOTHERAPY.AI
        </a>
      </footer>

    </div>
    </div>
  );
}
