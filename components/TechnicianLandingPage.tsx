"use client";

import React, { useState, useEffect } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { GoogleAddressAutocomplete } from "@/components/GoogleAddressAutocomplete";
import { SAMPLE_JOBS } from "@/lib/sampleJobs";
import { JobState } from "@/types/estimator";
import { calculatePsychrometrics } from "@/services/pricingEngine";
import {
  ShieldAlert,
  Flame,
  Droplets,
  Radio,
  FileCheck2,
  Lock,
  Thermometer,
  Compass,
  ArrowRight,
  Sparkles,
} from "lucide-react";

interface LandingProps {
  initialState: JobState;
  onLaunchHUD: (state: JobState, streamMode: "voice" | "hybrid" | "video") => void;
}

export function TechnicianLandingPage({ initialState, onLaunchHUD }: LandingProps) {
  const [job, setJob] = useState<JobState>(initialState);
  const [streamMode, setStreamMode] = useState<"voice" | "hybrid" | "video">("voice");

  // Psychrometric calculations
  const psy = calculatePsychrometrics(
    job.psychrometricBaseline.tempF,
    job.psychrometricBaseline.rhPercent
  );

  const isPre1978 = job.property.buildYear < 1978;

  // Sync psychrometric changes
  const handleTempRhChange = (tempF: number, rhPercent: number) => {
    const updatedPsy = calculatePsychrometrics(tempF, rhPercent);
    setJob((prev) => ({
      ...prev,
      psychrometricBaseline: {
        ...prev.psychrometricBaseline,
        tempF,
        rhPercent,
        dewPointF: updatedPsy.dewPointF,
        humidityRatioGPP: updatedPsy.humidityRatioGPP,
      },
    }));
  };

  const handleBuildYearChange = (year: number) => {
    const pre78 = year < 1978;
    setJob((prev) => ({
      ...prev,
      property: {
        ...prev.property,
        buildYear: year,
        isPre1978: pre78,
        asbestosLeadTestingMandated: pre78,
        statutoryNotice: pre78
          ? `MANDATORY STATUTORY NOTICE: Structure confirmed built in ${year} (Pre-1978). Under California Cal/OSHA Title 8 CCR § 1529 and Health & Safety Code § 25914, accredited third-party asbestos and lead point-count testing is legally mandated prior to intrusive demolition of drywall, joint compound, acoustic finishes, and underlayment.`
          : `Structure built in ${year} (Post-1978). Federal 1978 bans on lead and asbestos apply. Emergency containment and dust controls proceed without statutory pre-testing delay.`,
      },
    }));
  };

  const loadScenario = (key: string) => {
    const sample = SAMPLE_JOBS[key];
    if (sample) {
      setJob(sample);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* ADR Brand Header */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-md border-b-4 border-red-600 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <span className="bg-red-600 text-white font-extrabold text-xs px-2 py-0.5 rounded tracking-wider uppercase">
              Field Copilot
            </span>
            <span className="text-xs text-slate-400 font-mono">Antigravity 2.0 Connected</span>
          </div>
          <h1 className="text-2xl font-black tracking-tight text-white uppercase mt-1">
            Alert Disaster Restoration
          </h1>
          <p className="text-xs text-slate-300">
            Emergency Water & Mold Field Scoping • Forensic Diagnostics • California Statutory Compliance
          </p>
          <div className="text-[11px] text-slate-400 mt-1">
            3300 Patton Way Ste. 1, Bakersfield, CA 93308 | Tel: (661) 396-7908
          </div>
        </div>

        <div className="text-left md:text-right text-xs text-slate-400">
          <div>24/7 Emergency: <strong className="text-white">(877) 435-8117</strong></div>
          <div>CSLB CA License <strong className="text-white">#950983</strong></div>
          <div className="text-[11px] text-red-400 font-semibold mt-1">IICRC S500 / S520 Standard</div>
          <div className="text-[10px] text-slate-400">Lead Estimator: Matthew Myers</div>
        </div>
      </div>

      {/* Quick Scenario Fast-Loader */}
      <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex flex-col gap-2">
        <span className="text-xs font-bold text-slate-700 flex items-center space-x-1.5">
          <Sparkles className="w-4 h-4 text-amber-500" />
          <span>Authentic Field Estimates (Kern County, CA):</span>
        </span>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadScenario("woffordHeightsShadowglen_Tier1")}
            className="text-xs border-slate-300 hover:bg-slate-100 text-slate-800"
          >
            Tier 1 ($1,499) — 5 Shadowglen (2006)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadScenario("bakersfieldPlanz_Tier2")}
            className="text-xs border-red-300 hover:bg-red-50 text-red-900"
          >
            Tier 2 ($1,999) — 1111 E Planz (1946 Pre-78)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadScenario("bakersfieldOldStage_Tier3")}
            className="text-xs border-blue-300 hover:bg-blue-50 text-blue-900"
          >
            Tier 3 ($2,499) — 1518 Old Stage (1991)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadScenario("bakersfieldAndretti_Tier4")}
            className="text-xs border-emerald-300 hover:bg-emerald-50 text-emerald-900"
          >
            Tier 4 ($2,799) — 11411 Andretti (2004)
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => loadScenario("bakersfieldEllis_Tier5")}
            className="text-xs border-purple-300 hover:bg-purple-50 text-purple-900 font-semibold"
          >
            Tier 5 ($3,999) — 6304 Ellis (1962 Pre-78)
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Card 1: Property & Customer Intake */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center space-x-2">
              <Compass className="w-4 h-4 text-red-600" />
              <span>Loss Details & Customer Intake</span>
            </CardTitle>
            <CardDescription>
              Record the client information, claim reference, and property location.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-slate-700">Client / Policyholder Name</label>
              <Input
                value={job.customer.name}
                onChange={(e) =>
                  setJob((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, name: e.target.value },
                  }))
                }
                placeholder="e.g. Robert & Elena Vance"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs font-semibold text-slate-700">Contact Phone</label>
                <Input
                  value={job.customer.phone}
                  onChange={(e) =>
                    setJob((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, phone: e.target.value },
                    }))
                  }
                  placeholder="(818) 555-0194"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700">Insurance Carrier</label>
                <Input
                  value={job.customer.carrier || ""}
                  onChange={(e) =>
                    setJob((prev) => ({
                      ...prev,
                      customer: { ...prev.customer, carrier: e.target.value },
                    }))
                  }
                  placeholder="State Farm, Farmers, etc."
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700">Property Street Address</label>
              <GoogleAddressAutocomplete
                value={job.customer.serviceAddress}
                onChange={(addr) =>
                  setJob((prev) => ({
                    ...prev,
                    customer: { ...prev.customer, serviceAddress: addr },
                  }))
                }
                onPlaceSelect={(details) => {
                  // If the address matches any of our known preset jobs, auto-sync customer and build year
                  const matchedSample = Object.values(SAMPLE_JOBS).find(
                    (s) =>
                      (details.streetNumber && s.customer.serviceAddress.includes(details.streetNumber)) ||
                      details.formattedAddress.toLowerCase().includes(s.customer.serviceAddress.split(",")[0].toLowerCase())
                  );

                  setJob((prev) => {
                    const next = {
                      ...prev,
                      customer: {
                        ...prev.customer,
                        serviceAddress: details.formattedAddress,
                        name: matchedSample ? matchedSample.customer.name : prev.customer.name,
                        phone: matchedSample ? matchedSample.customer.phone : prev.customer.phone,
                        carrier: matchedSample ? matchedSample.customer.carrier : prev.customer.carrier,
                      },
                    };
                    if (matchedSample) {
                      next.property = { ...matchedSample.property };
                    }
                    return next;
                  });
                }}
              />
            </div>

            {/* Build Year Trigger */}
            <div className="pt-1">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-slate-900">
                  Structure Build Year (California Statutory Threshold)
                </label>
                <Badge variant={isPre1978 ? "destructive" : "secondary"}>
                  {isPre1978 ? "Pre-1978 Mandate" : "Post-1978 Standard"}
                </Badge>
              </div>
              <Input
                type="number"
                value={job.property.buildYear}
                onChange={(e) => handleBuildYearChange(parseInt(e.target.value) || 1985)}
                className="mt-1"
              />
            </div>

            {/* Live Statutory Warning */}
            {isPre1978 ? (
              <Alert variant="statutory" className="mt-2">
                <ShieldAlert className="h-4 w-4" />
                <AlertTitle className="text-xs">California Cal/OSHA & HSC Mandate Triggered</AlertTitle>
                <AlertDescription>
                  Structure built in {job.property.buildYear} (&lt; 1978). Cal/OSHA Title 8 CCR § 1529
                  (Asbestos), Health & Safety Code § 25914, and § 1532.1 (Lead) mandate accredited point-count
                  testing prior to intrusive demolition.
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="info" className="mt-2">
                <FileCheck2 className="h-4 w-4" />
                <AlertTitle className="text-xs">Post-1978 Construction</AlertTitle>
                <AlertDescription>
                  Federal 1978 bans on lead and asbestos apply. Emergency containment and drying proceed
                  without pre-testing delay.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {/* Card 2: Psychrometric Dry Baseline Calibration */}
        <Card className="flex flex-col justify-between">
          <div>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center space-x-2">
                <Thermometer className="w-4 h-4 text-blue-600" />
                <span>Psychrometric Dry Standard Calibration</span>
              </CardTitle>
              <CardDescription>
                Calibrate the unaffected reference room to pin mathematical drying targets.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-700">Unaffected Reference Room</label>
                <Input
                  value={job.psychrometricBaseline.unaffectedRoom}
                  onChange={(e) =>
                    setJob((prev) => ({
                      ...prev,
                      psychrometricBaseline: {
                        ...prev.psychrometricBaseline,
                        unaffectedRoom: e.target.value,
                      },
                    }))
                  }
                  placeholder="e.g. Front Entry / Living Room"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700">
                  Unaffected Drywall Baseline WME (%)
                </label>
                <div className="flex items-center space-x-2 mt-1">
                  <Input
                    type="number"
                    step="0.1"
                    value={job.psychrometricBaseline.drywallBaselineWME}
                    onChange={(e) =>
                      setJob((prev) => ({
                        ...prev,
                        psychrometricBaseline: {
                          ...prev.psychrometricBaseline,
                          drywallBaselineWME: parseFloat(e.target.value) || 9.2,
                        },
                      }))
                    }
                  />
                  <Badge variant="dry" className="whitespace-nowrap">
                    Dry Target: {job.psychrometricBaseline.drywallBaselineWME}%
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="text-xs font-semibold text-slate-700">Ambient Temp (°F)</label>
                  <Input
                    type="number"
                    step="0.5"
                    value={job.psychrometricBaseline.tempF}
                    onChange={(e) =>
                      handleTempRhChange(
                        parseFloat(e.target.value) || 72.0,
                        job.psychrometricBaseline.rhPercent
                      )
                    }
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-700">Relative Humidity (RH %)</label>
                  <Input
                    type="number"
                    step="1"
                    value={job.psychrometricBaseline.rhPercent}
                    onChange={(e) =>
                      handleTempRhChange(
                        job.psychrometricBaseline.tempF,
                        parseFloat(e.target.value) || 45.0
                      )
                    }
                  />
                </div>
              </div>

              {/* Dynamic Psychrometric Telemetry */}
              <div className="bg-slate-900 text-white rounded-lg p-3 text-xs grid grid-cols-2 gap-2 shadow-inner">
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Calculated Dew Point</span>
                  <span className="text-base font-extrabold text-blue-400">
                    {psy.dewPointF}°F
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10.5px]">Humidity Ratio (GPP)</span>
                  <span className="text-base font-extrabold text-emerald-400">
                    {psy.humidityRatioGPP} GPP
                  </span>
                </div>
              </div>

              {/* Stream Mode Selection */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Technician Mic Stream Mode
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setStreamMode("voice")}
                    className={`py-2 px-2 text-xs rounded-md border font-semibold text-center transition ${
                      streamMode === "voice"
                        ? "bg-red-50 border-red-500 text-red-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Voice Only
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamMode("hybrid")}
                    className={`py-2 px-2 text-xs rounded-md border font-semibold text-center transition ${
                      streamMode === "hybrid"
                        ? "bg-red-50 border-red-500 text-red-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Hybrid (0.5 FPS)
                  </button>
                  <button
                    type="button"
                    onClick={() => setStreamMode("video")}
                    className={`py-2 px-2 text-xs rounded-md border font-semibold text-center transition ${
                      streamMode === "video"
                        ? "bg-red-50 border-red-500 text-red-700 shadow-sm"
                        : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                    }`}
                  >
                    Live Cam (15 FPS)
                  </button>
                </div>
              </div>
            </CardContent>
          </div>

          <CardFooter className="pt-2">
            <Button
              type="button"
              variant="adrAction"
              className="w-full h-12 text-sm shadow-lg flex items-center justify-center space-x-2"
              onClick={async () => {
                // Request screen wake lock on mobile
                if (typeof window !== "undefined" && "wakeLock" in navigator) {
                  try {
                    await (navigator as any).wakeLock.request("screen");
                    console.log("Mobile Screen WakeLock active.");
                  } catch (e) {
                    console.warn("WakeLock request skipped:", e);
                  }
                }
                onLaunchHUD(job, streamMode);
              }}
            >
              <span>Launch Mobile Scoping HUD</span>
              <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
