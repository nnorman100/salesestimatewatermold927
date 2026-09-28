"use client";

import React, { useState, useEffect } from "react";
import { JobState } from "@/types/estimator";
import { SAMPLE_JOBS } from "@/lib/sampleJobs";
import { saveOfflineJobState, loadOfflineJobState, clearOfflineQueue, getOfflineQueue, removeOfflineTurn } from "@/lib/offlineStorage";
import { fetchWithAuth } from "@/lib/apiClient";
import { TechnicianLandingPage } from "@/components/TechnicianLandingPage";
import { LiveScopingHUD } from "@/components/LiveScopingHUD";
import { AlertEstimateDocument } from "@/components/AlertEstimateDocument";
import { OfflineIndicator } from "@/components/OfflineIndicator";

export default function Home() {
  const [view, setView] = useState<"launchpad" | "hud" | "proposal">("launchpad");
  const [jobState, setJobState] = useState<JobState>(SAMPLE_JOBS.glendalePre1978);
  const [streamMode, setStreamMode] = useState<"voice" | "hybrid" | "video">("voice");

  // Attempt to recover saved job state on load
  useEffect(() => {
    async function recoverState() {
      const cached = await loadOfflineJobState();
      if (cached) {
        setJobState(cached);
      }
    }
    recoverState();
  }, []);

  // Persist state to IndexedDB on changes
  const handleUpdateJob = async (updated: JobState) => {
    setJobState(updated);
    await saveOfflineJobState(updated);
  };

  // Launch HUD from Intake
  const handleLaunchHUD = async (state: JobState, mode: "voice" | "hybrid" | "video") => {
    setJobState(state);
    setStreamMode(mode);
    await saveOfflineJobState(state);
    setView("hud");
  };

  // Flush offline sync queue
  const handleSyncOfflineQueue = async () => {
    const queue = await getOfflineQueue();
    if (queue.length === 0) return;

    let currentState = jobState;
    for (const turn of queue) {
      try {
        const res = await fetchWithAuth("/api/gemini/live-scope", {
          method: "POST",
          body: JSON.stringify({
            technicianSpeech: turn.technicianSpeech,
            photoBase64: turn.photoBase64,
            currentRoom: turn.currentRoom,
            buildYear: turn.buildYear,
            jobState: currentState,
          }),
        });
        if (!res.ok) {
          throw new Error(`Sync turn failed with HTTP ${res.status}`);
        }
        const data = await res.json();
        if (data.updatedState) {
          currentState = data.updatedState;
          setJobState(currentState);
          await saveOfflineJobState(currentState);
        }
        await removeOfflineTurn(turn.id);
      } catch (e) {
        console.warn("Failed syncing turn, will retry later:", e);
        return;
      }
    }
    await clearOfflineQueue();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col">
      <OfflineIndicator onSync={handleSyncOfflineQueue} />

      <div className="flex-1 p-3 md:p-6">
        {view === "launchpad" && (
          <TechnicianLandingPage
            initialState={jobState}
            onLaunchHUD={handleLaunchHUD}
          />
        )}

        {view === "hud" && (
          <LiveScopingHUD
            job={jobState}
            streamMode={streamMode}
            onUpdateJob={handleUpdateJob}
            onCompleteWalkthrough={() => setView("proposal")}
            onBackToLaunchpad={() => setView("launchpad")}
          />
        )}

        {view === "proposal" && (
          <AlertEstimateDocument
            job={jobState}
            onBackToHUD={() => setView("hud")}
            onUpdateSignature={(sigUrl) => {
              handleUpdateJob({
                ...jobState,
                customer: {
                  ...jobState.customer,
                  signature: sigUrl,
                } as any,
              });
            }}
          />
        )}
      </div>
    </div>
  );
}
