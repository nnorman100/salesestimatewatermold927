"use client";

import React, { useState, useEffect, useRef } from "react";
import { JobState, ChamberScope, QualitativeMoistureLevel } from "@/types/estimator";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { snapToFinancialTier } from "@/services/pricingEngine";
import { enqueueOfflineTurn } from "@/lib/offlineStorage";
import {
  Mic,
  MicOff,
  Camera,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Volume2,
  Terminal,
  Droplets,
  Layers,
  ArrowRight,
  ShieldCheck,
  Send,
  Loader2,
  Plus,
} from "lucide-react";

interface HUDProps {
  job: JobState;
  streamMode: "voice" | "hybrid" | "video";
  onUpdateJob: (updated: JobState) => void;
  onCompleteWalkthrough: () => void;
  onBackToLaunchpad: () => void;
}

export function LiveScopingHUD({
  job,
  streamMode,
  onUpdateJob,
  onCompleteWalkthrough,
  onBackToLaunchpad,
}: HUDProps) {
  const [activeRoomIndex, setActiveRoomIndex] = useState<number>(0);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [dictationText, setDictationText] = useState<string>("");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [lastSpokenResponse, setLastSpokenResponse] = useState<string>("");
  const [agentSteps, setAgentSteps] = useState<any[]>([]);
  const [newRoomName, setNewRoomName] = useState<string>("");
  const [showAddRoom, setShowAddRoom] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const chambers = job.chambers || [];
  const currentChamber: ChamberScope | undefined = chambers[activeRoomIndex];

  const audioCtxRef = useRef<AudioContext | null>(null);

  // Reusable AudioContext singleton with automatic resumption for iOS WebKit policy
  const getAudioContext = async (): Promise<AudioContext | null> => {
    if (typeof window === "undefined") return null;
    try {
      if (!audioCtxRef.current) {
        const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtxClass) return null;
        audioCtxRef.current = new AudioCtxClass();
      }
      if (audioCtxRef.current.state === "suspended") {
        await audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
    } catch (e) {
      console.warn("AudioContext init/resume failed:", e);
      return null;
    }
  };

  // Play ascending chime (587.33 Hz -> 880 Hz) for verify_room_scope
  const playVerificationChime = async () => {
    try {
      const audioCtx = await getAudioContext();
      if (!audioCtx) return;

      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.type = "sine";
      const now = audioCtx.currentTime;
      osc.frequency.setValueAtTime(587.33, now); // D5
      osc.frequency.exponentialRampToValueAtTime(880.0, now + 0.15); // A5

      gain.gain.setValueAtTime(0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.35);

      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.4);
    } catch (e) {
      console.warn("Web Audio chime failed:", e);
    }
  };

  // Trigger dual haptic pulse on mobile
  const triggerHaptics = () => {
    if (typeof window !== "undefined" && "vibrate" in navigator) {
      try {
        navigator.vibrate([80, 40, 80]);
      } catch (e) {
        console.warn("Haptic vibrate failed:", e);
      }
    }
  };

  // Speaks verification via browser speech synthesis (as fallback / instant feedback)
  const speakRoomSummary = (text: string) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 0.95; // Grounded pitch for clinical dispatch tone
    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(
      (v) =>
        v.lang.startsWith("en") &&
        (v.name.includes("David") ||
          v.name.includes("Mark") ||
          v.name.includes("Guy") ||
          v.name.includes("Natural") ||
          v.name.includes("Google US English"))
    );
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    window.speechSynthesis.speak(utterance);
  };

  // Submit dictation or photo turn to Antigravity API
  const handleSendTurn = async (customSpeech?: string, photoBase64?: string) => {
    const speech = customSpeech || dictationText;
    if (!speech && !photoBase64) return;

    setIsProcessing(true);
    setDictationText("");

    const turnPayload = {
      technicianSpeech: speech,
      photoBase64: photoBase64,
      currentRoom: currentChamber?.name || "Loss Area",
      buildYear: job.property.buildYear,
      jobState: job,
    };

    // Check if offline: queue turn
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueOfflineTurn({
        id: `turn-${Date.now()}`,
        timestamp: new Date().toISOString(),
        technicianSpeech: speech,
        photoBase64: photoBase64,
        currentRoom: currentChamber?.name || "Loss Area",
        buildYear: job.property.buildYear,
      });
      setIsProcessing(false);
      return;
    }

    try {
      const res = await fetch("/api/gemini/live-scope", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(turnPayload),
      });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data = await res.json();
      if (data.updatedState) {
        onUpdateJob(data.updatedState);
      }
      if (data.steps) {
        setAgentSteps(data.steps);
      }
      if (data.spokenResponse) {
        setLastSpokenResponse(data.spokenResponse);
        playVerificationChime();
        triggerHaptics();
        speakRoomSummary(data.spokenResponse);
      }
    } catch (error) {
      console.warn("Turn processing error, updating local state:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Verify Room Scope Action
  const handleVerifyCurrentRoom = async () => {
    if (!currentChamber) return;
    playVerificationChime();
    triggerHaptics();

    const cuts = currentChamber.demolition.floodCuts?.linearFeet;
    const cutSummary = cuts
      ? `${cuts} LF of ${currentChamber.demolition.floodCuts?.heightFt || 2}-ft flood cuts`
      : "no structural cuts";

    const summaryText = `${currentChamber.name} verified: ${cutSummary}, detachment waivers logged, and structural drying equipment deployed.`;

    setLastSpokenResponse(summaryText);
    speakRoomSummary(summaryText);

    // Update state locally
    const updatedChambers = [...chambers];
    updatedChambers[activeRoomIndex] = {
      ...currentChamber,
      verified: true,
      verificationSummary: summaryText,
    };

    onUpdateJob({
      ...job,
      chambers: updatedChambers,
    });
  };

  // Handle Complete Walkthrough Action
  const handleCompleteWalkthrough = () => {
    playVerificationChime();
    triggerHaptics();
    const finalSpeech = "Walkthrough complete across all chambers. Alert Disaster Restoration proposal and statutory disclosures compiled.";
    setLastSpokenResponse(finalSpeech);
    speakRoomSummary(finalSpeech);
    onCompleteWalkthrough();
  };

  // Add Room handler
  const handleAddChamber = () => {
    if (!newRoomName.trim()) return;
    const newId = `room_${Date.now()}`;
    const newCh: ChamberScope = {
      roomId: newId,
      name: newRoomName.trim(),
      waterCategory: "Category 2 (Grey Water)",
      waterClass: "Class 2 (Fast Absorption)",
      moistureReadings: [],
      demolition: {
        floodCuts: { heightFt: 2, linearFeet: 0, locations: "" },
        baseboards: { linearFeet: 0, action: "Removal & Disposal" },
      },
      cabinetry: [],
      homeownerObligations: [],
      equipment: [
        { type: "Low Grain Refrigerant (LGR) Dehumidifier", count: 1, days: 3 },
        { type: "Centrifugal Air Mover", count: 2, days: 3 },
      ],
      verified: false,
    };

    const nextChambers = [...chambers, newCh];
    onUpdateJob({ ...job, chambers: nextChambers });
    setNewRoomName("");
    setShowAddRoom(false);
    setActiveRoomIndex(nextChambers.length - 1);
  };

  // Handle Photo Upload / Camera Capture
  const handlePhotoCaptured = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(",")[1];
      handleSendTurn(
        `Attached field inspection photo for ${currentChamber?.name || "chamber"}. Inspect meter LCD or damage perimeter.`,
        base64
      );
    };
    reader.readAsDataURL(file);
  };

  const getMoistureBadgeVariant = (classification: QualitativeMoistureLevel) => {
    switch (classification) {
      case "Dry":
        return "dry";
      case "At Risk":
        return "atRisk";
      case "Wet":
        return "wet";
      case "Saturated":
        return "saturated";
      default:
        return "default";
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-4 pb-16">
      {/* Top Header & Navigation */}
      <div className="flex items-center justify-between bg-slate-900 text-white p-3 rounded-lg shadow-sm border-l-4 border-red-600">
        <div>
          <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            Live Scoping HUD • {streamMode.toUpperCase()} STREAM
          </span>
          <h2 className="text-lg font-black text-white uppercase leading-tight">
            {job.customer.serviceAddress || "Emergency Loss Scoping"}
          </h2>
          <span className="text-xs text-slate-300">
            Client: <strong>{job.customer.name}</strong> | Target: <strong>{job.psychrometricBaseline.drywallBaselineWME}% WME</strong>
          </span>
        </div>

        <div className="text-right">
          <Badge variant="tier" className="text-xs">
            {job.financialTier.tierName.split("-")[0].trim()} • ${job.financialTier.snappedTier.toLocaleString()}
          </Badge>
          <div className="text-[10px] text-slate-400 mt-1">
            Build Year: {job.property.buildYear} ({job.property.isPre1978 ? "Pre-1978" : "Post-1978"})
          </div>
        </div>
      </div>

      {/* Chamber Selector Ribbon */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 pt-1 no-scrollbar">
        {chambers.map((ch, idx) => (
          <button
            key={ch.roomId || idx}
            type="button"
            onClick={() => setActiveRoomIndex(idx)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition flex items-center space-x-1.5 border ${
              activeRoomIndex === idx
                ? "bg-red-600 text-white border-red-700 shadow-sm"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50"
            }`}
          >
            <span>{ch.name}</span>
            {ch.verified && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />}
          </button>
        ))}

        <button
          type="button"
          onClick={() => setShowAddRoom(true)}
          className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 border border-dashed border-slate-300 flex items-center space-x-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Add Room</span>
        </button>
      </div>

      {/* Add Room Modal / Input */}
      {showAddRoom && (
        <div className="bg-slate-100 p-3 rounded-lg border border-slate-300 flex items-center space-x-2">
          <Input
            value={newRoomName}
            onChange={(e) => setNewRoomName(e.target.value)}
            placeholder="Room Name (e.g. Master Bedroom, Kitchen, Hallway)..."
            className="text-xs h-9 bg-white"
          />
          <Button size="sm" onClick={handleAddChamber} variant="adrAction">
            Save Room
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowAddRoom(false)}>
            Cancel
          </Button>
        </div>
      )}

      {/* Spoken Audio Banner (When verification is spoken) */}
      {lastSpokenResponse && (
        <div className="bg-red-50 border-l-4 border-red-600 p-3 rounded-r-lg shadow-sm flex items-start space-x-2.5 animate-in fade-in">
          <Volume2 className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
          <div className="text-xs">
            <strong className="text-red-900 block font-bold">Spoken Verification Audio Output:</strong>
            <p className="text-slate-800 italic mt-0.5">&quot;{lastSpokenResponse}&quot;</p>
          </div>
        </div>
      )}

      {/* Active Chamber Card */}
      {currentChamber ? (
        <Card className="shadow-sm">
          <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-extrabold text-slate-900 flex items-center space-x-2">
                <span>{currentChamber.name}</span>
                {currentChamber.verified && (
                  <Badge variant="dry" className="text-[10px]">
                    Verified
                  </Badge>
                )}
              </CardTitle>
              <div className="text-xs text-slate-500 mt-0.5">
                {currentChamber.waterCategory} • {currentChamber.waterClass}
              </div>
            </div>

            <div className="flex items-center space-x-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handlePhotoCaptured}
                className="hidden"
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs h-8 border-slate-300"
              >
                <Camera className="w-3.5 h-3.5 mr-1 text-slate-600" />
                <span>Camera / Meter</span>
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {/* Demolition & Flood Cuts Scope Grid */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5 flex items-center space-x-1.5">
                <Layers className="w-3.5 h-3.5 text-red-600" />
                <span>Demolition & Perimeter Cuts</span>
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs">
                  <span className="text-slate-500 block font-semibold">Flood Cuts</span>
                  <span className="text-sm font-bold text-slate-900">
                    {currentChamber.demolition.floodCuts?.heightFt || 2}-ft Cut •{" "}
                    {currentChamber.demolition.floodCuts?.linearFeet || 0} LF
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {currentChamber.demolition.floodCuts?.locations || "Perimeter walls"}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs">
                  <span className="text-slate-500 block font-semibold">Baseboard Removal</span>
                  <span className="text-sm font-bold text-slate-900">
                    {currentChamber.demolition.baseboards?.linearFeet || 0} LF
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">De-nailed and bagged</span>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-xs">
                  <span className="text-slate-500 block font-semibold">Flooring Removal</span>
                  <span className="text-sm font-bold text-slate-900">
                    {currentChamber.demolition.flooring?.squareFeet || 0} SF
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {currentChamber.demolition.flooring?.substrate || "Substrate demo"}
                  </span>
                </div>
              </div>
            </div>

            {/* Moisture Readings Table */}
            <div>
              <div className="flex justify-between items-center mb-1.5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center space-x-1.5">
                  <Droplets className="w-3.5 h-3.5 text-blue-600" />
                  <span>Moisture Readings ({currentChamber.moistureReadings.length})</span>
                </h4>
                <span className="text-[11px] text-slate-400">
                  Baseline Target: <strong>{job.psychrometricBaseline.drywallBaselineWME}% WME</strong>
                </span>
              </div>

              {currentChamber.moistureReadings.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Probe Location</TableHead>
                      <TableHead>Substrate</TableHead>
                      <TableHead>Reading (% WME)</TableHead>
                      <TableHead>FLIR Thermal Δ</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {currentChamber.moistureReadings.map((r, idx) => (
                      <TableRow key={idx}>
                        <TableCell className="font-semibold text-slate-800">{r.location}</TableCell>
                        <TableCell className="text-slate-600">{r.substrate}</TableCell>
                        <TableCell>
                          <Badge variant={getMoistureBadgeVariant(r.classification)}>
                            {r.readingWME}% ({r.classification})
                          </Badge>
                        </TableCell>
                        <TableCell className="text-blue-700 font-mono text-xs">
                          {r.thermalDeltaF ? `${r.thermalDeltaF}°F` : "N/A"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-xs text-slate-400 italic p-3 text-center bg-slate-50 border border-dashed rounded">
                  No moisture probes logged in this chamber yet. Dictate readings or upload meter photo.
                </div>
              )}
            </div>

            {/* Cabinetry Waivers & Homeowner Obligations */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {currentChamber.cabinetry.length > 0 && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-1">
                  <strong className="text-amber-900 block font-bold">Cabinetry & Collateral Waivers:</strong>
                  {currentChamber.cabinetry.map((cab, idx) => (
                    <div key={idx} className="text-amber-800">
                      • <strong>{cab.item}</strong> ({cab.action}): {cab.waiver}
                    </div>
                  ))}
                </div>
              )}

              {currentChamber.homeownerObligations.length > 0 && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs space-y-1">
                  <strong className="text-blue-900 block font-bold">Homeowner Obligations:</strong>
                  {currentChamber.homeownerObligations.map((obl, idx) => (
                    <div key={idx} className="text-blue-800 italic">
                      {obl}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Equipment Deployment */}
            <div>
              <span className="text-xs font-semibold text-slate-600 block mb-1">
                Active Drying Equipment Setup:
              </span>
              <div className="flex flex-wrap gap-2">
                {currentChamber.equipment.map((eq, idx) => (
                  <Badge key={idx} variant="secondary" className="text-xs py-1">
                    {eq.count}x {eq.type} ({eq.days} Days)
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center p-8 bg-slate-50 rounded-lg border border-dashed text-slate-500">
          No chambers added. Click &quot;+ Add Room&quot; above to establish your first containment chamber.
        </div>
      )}

      {/* Dictation Input Dock */}
      <div className="sticky bottom-2 bg-white/95 backdrop-blur p-3 rounded-xl border border-slate-300 shadow-xl space-y-2">
        <div className="flex items-center space-x-2">
          <Input
            value={dictationText}
            onChange={(e) => setDictationText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSendTurn();
              }
            }}
            placeholder={`Dictate in "${currentChamber?.name || "chamber"}": cuts, meter readings, cabinet detach...`}
            className="text-xs h-11"
            disabled={isProcessing}
          />

          <Button
            type="button"
            variant={isRecording ? "destructive" : "adrAction"}
            className="h-11 px-4 text-xs font-bold"
            disabled={isProcessing}
            onClick={() => {
              getAudioContext();
              if (isRecording) {
                setIsRecording(false);
              } else {
                setIsRecording(true);
                // Simulate technician speech recognition or trigger Web Speech API
                if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
                  const SpeechRec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
                  const rec = new SpeechRec();
                  rec.continuous = false;
                  rec.interimResults = false;
                  rec.onresult = (evt: any) => {
                    const text = evt.results[0][0].transcript;
                    setDictationText(text);
                    setIsRecording(false);
                  };
                  rec.onerror = () => setIsRecording(false);
                  rec.start();
                }
              }
            }}
          >
            {isRecording ? <MicOff className="w-4 h-4 animate-pulse mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
            <span>{isRecording ? "Listening" : "Speak"}</span>
          </Button>

          <Button
            type="button"
            variant="default"
            className="h-11 px-3 bg-slate-900 hover:bg-slate-800"
            disabled={isProcessing || !dictationText.trim()}
            onClick={() => handleSendTurn()}
          >
            {isProcessing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </Button>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleVerifyCurrentRoom}
              className="text-xs h-8 border-emerald-600 text-emerald-800 hover:bg-emerald-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5 mr-1 text-emerald-600" />
              <span>Verify Room Scope</span>
            </Button>

            {/* Proof-of-Work Dialog */}
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-xs h-8 text-slate-700">
                  <Terminal className="w-3.5 h-3.5 mr-1 text-slate-500" />
                  <span>Proof of Work ({agentSteps.length})</span>
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="text-sm font-bold flex items-center space-x-2">
                    <Terminal className="w-4 h-4 text-red-600" />
                    <span>Antigravity 2.0 Agent Execution Logs</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="bg-slate-950 text-slate-100 p-4 rounded-lg font-mono text-xs max-h-96 overflow-y-auto space-y-2">
                  {agentSteps.length > 0 ? (
                    agentSteps.map((step, idx) => (
                      <div key={idx} className="border-b border-slate-800 pb-2">
                        <span className="text-red-400 font-bold block">[{step.type}]</span>
                        <pre className="text-slate-300 whitespace-pre-wrap mt-0.5">
                          {JSON.stringify(step.content || step, null, 2)}
                        </pre>
                      </div>
                    ))
                  ) : (
                    <span className="text-slate-500 italic">No agent execution steps logged yet this session.</span>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </div>

          <Button
            type="button"
            variant="adrAction"
            size="sm"
            onClick={handleCompleteWalkthrough}
            className="text-xs h-8"
          >
            <span>Complete Walkthrough & Proposal</span>
            <ArrowRight className="w-3.5 h-3.5 ml-1" />
          </Button>
        </div>
      </div>
    </div>
  );
}
