"use client";

import React, { useRef, useState, useEffect } from "react";
import { JobState } from "@/types/estimator";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { Printer, Download, ArrowLeft, CheckCircle2, RotateCcw, ShieldCheck, CloudUpload } from "lucide-react";
import { saveEstimateToFirestore } from "@/services/firestoreService";

interface DocumentProps {
  job: JobState;
  onBackToHUD: () => void;
  onUpdateSignature?: (signatureBase64: string) => void;
}

export function AlertEstimateDocument({
  job,
  onBackToHUD,
  onUpdateSignature,
}: DocumentProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSignature, setHasSignature] = useState(false);
  const [isCompilingRemotePdf, setIsCompilingRemotePdf] = useState(false);
  const [remotePdfSuccess, setRemotePdfSuccess] = useState(false);
  const [isSyncingFirestore, setIsSyncingFirestore] = useState(false);
  const [firestoreSuccess, setFirestoreSuccess] = useState(false);

  const handleSyncToFirestore = async () => {
    setIsSyncingFirestore(true);
    setFirestoreSuccess(false);
    try {
      await saveEstimateToFirestore(job);
      setFirestoreSuccess(true);
    } catch (e) {
      console.error("Firestore sync error:", e);
    } finally {
      setIsSyncingFirestore(false);
    }
  };

  // Setup HTML5 touch canvas signature pad with devicePixelRatio scaling
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
    const rect = canvas.getBoundingClientRect();
    const displayWidth = rect.width || 650;
    const displayHeight = rect.height || 80;

    canvas.width = Math.round(displayWidth * dpr);
    canvas.height = Math.round(displayHeight * dpr);

    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2.2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    const existingSignature = (job as any).signature || (job.customer as any)?.signature;
    if (existingSignature) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, displayWidth, displayHeight);
        setHasSignature(true);
      };
      img.src = existingSignature;
    }
  }, [(job as any).signature, (job.customer as any)?.signature]);

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }
    setIsDrawing(true);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.beginPath();
    ctx.moveTo(clientX - rect.left, clientY - rect.top);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    if ("touches" in e && e.cancelable) {
      e.preventDefault();
    }
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

    ctx.lineTo(clientX - rect.left, clientY - rect.top);
    ctx.stroke();
    setHasSignature(true);
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dataUrl = canvas.toDataURL("image/png");
    if (onUpdateSignature) {
      onUpdateSignature(dataUrl);
    }
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    setHasSignature(false);
    if (onUpdateSignature) {
      onUpdateSignature("");
    }
  };

  // Compile PDF via headless Chromium or Python compiler
  const handleCompileRemotePdf = async () => {
    setIsCompilingRemotePdf(true);
    setRemotePdfSuccess(false);
    try {
      const res = await fetch("/api/gemini/generate-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobState: job }),
      });
      if (res.ok) {
        setRemotePdfSuccess(true);
      }
    } catch (e) {
      console.warn("Remote PDF compilation skipped, printing directly:", e);
    } finally {
      setIsCompilingRemotePdf(false);
    }
  };

  const isPre1978 = job.property.isPre1978 || job.property.buildYear < 1978;
  const areaInspectedList = job.chambers.map((c) => c.name).join(", ") || "Main Loss Chambers";

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-20">
      {/* Top Action Bar (Hidden during printing) */}
      <div className="no-print bg-slate-900 text-white p-4 rounded-xl shadow-lg flex flex-wrap items-center justify-between gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={onBackToHUD}
          className="text-xs text-slate-200 border-slate-700 hover:bg-slate-800"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" />
          <span>Back to Scoping HUD</span>
        </Button>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSyncToFirestore}
            disabled={isSyncingFirestore}
            className="text-xs text-blue-700 border-blue-300 hover:bg-blue-50"
          >
            <CloudUpload className="w-3.5 h-3.5 mr-1" />
            <span>{isSyncingFirestore ? "Syncing..." : "Sync to Firestore"}</span>
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleCompileRemotePdf}
            disabled={isCompilingRemotePdf}
            className="text-xs text-slate-800 border-slate-300 hover:bg-slate-100"
          >
            <Download className="w-3.5 h-3.5 mr-1" />
            <span>{isCompilingRemotePdf ? "Compiling PDF..." : "Compile Sandbox PDF"}</span>
          </Button>

          <Button
            variant="adrAction"
            size="sm"
            onClick={() => window.print()}
            className="text-xs shadow"
          >
            <Printer className="w-3.5 h-3.5 mr-1" />
            <span>Print 2-Page Proposal</span>
          </Button>
        </div>
      </div>

      {firestoreSuccess && (
        <div className="no-print p-3 bg-blue-50 border border-blue-300 rounded-lg text-xs text-blue-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>
            <strong>Synced to Cloud Firestore:</strong> Estimate <code>{job.lossId}</code> saved to <code>estimates</code> collection in project <code>mitigation-project</code>.
          </span>
        </div>
      )}

      {remotePdfSuccess && (
        <div className="no-print p-3 bg-emerald-50 border border-emerald-300 rounded-lg text-xs text-emerald-800 flex items-center space-x-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>
            <strong>Official PDF Compiled:</strong> Stored at <code>/workspace/proposal.pdf</code> and ready for carrier submission.
          </span>
        </div>
      )}

      {/* ======================================================== */}
      {/* PAGE 1: AUTHENTIC ADR REMEDIATION ESTIMATE               */}
      {/* ======================================================== */}
      <div className="print-page bg-white p-7 md:p-9 rounded-xl shadow-lg border border-slate-200 text-slate-900 font-sans min-h-[10.1in] flex flex-col justify-between">
        <div>
          {/* Authentic ADR Header */}
          <div className="border-b-2 border-red-600 pb-2.5 flex justify-between items-start">
            <div>
              <div className="text-xl font-black text-red-600 tracking-tight leading-none uppercase">
                Alert Disaster Restoration
              </div>
              <div className="text-[10px] font-semibold italic text-slate-700 mt-0.5">
                &ldquo;Making It New Again&rdquo;
              </div>
              <div className="text-[8.5px] text-slate-600 mt-1 leading-tight">
                3300 Patton Way Ste. 1, Bakersfield, CA 93308 &bull; Tel: (661) 396-7908 &bull; Emergency: (877) 435-8117 &bull; Fax: (661) 615-3350<br />
                Mailing: PO Box 20729, Bakersfield, CA 93390-0729 &bull; CA License #950983 &bull; www.AlertDisaster.com
              </div>
            </div>
            <div className="text-right text-[10px] leading-tight">
              <strong>DATE:</strong> {job.inspectionDate}<br />
              <strong>REF / JOB #:</strong> {job.lossId}<br />
              <strong>BUILD YEAR:</strong> {job.property.buildYear}
            </div>
          </div>

          {/* Customer / Property Header */}
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-2.5 my-2.5 text-[9.5px] leading-relaxed">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <strong>TO:</strong> {job.customer.name} &bull; <strong>PHONE:</strong> {job.customer.phone}<br />
                <strong>PROPERTY / LOSS ADDRESS:</strong> {job.customer.serviceAddress}
              </div>
              <div className="text-right">
                <strong>INSURANCE CARRIER:</strong> {job.customer.carrier || "Private Pay / Direct"}<br />
                <strong>CLAIM #:</strong> {job.customer.claimNumber || "Pending"} &bull; <strong>LEAD ESTIMATOR:</strong> Matthew Myers
              </div>
            </div>
          </div>

          {/* Document Title */}
          <div className="text-center my-1.5">
            <h2 className="text-base font-extrabold uppercase tracking-wide text-slate-900 border-b border-slate-300 pb-1 inline-block px-8">
              Remediation Estimate
            </h2>
          </div>

          {/* 1. AREA INSPECTED */}
          <div className="mb-2 text-[9.5px]">
            <strong className="text-slate-900 uppercase">Area Inspected:</strong>{" "}
            <span className="text-slate-800">{areaInspectedList}</span>
          </div>

          {/* 2. FINDINGS */}
          <div className="mb-2 text-[9.5px] bg-slate-50 border border-slate-200 rounded p-2 leading-relaxed">
            <strong className="text-slate-900 uppercase block mb-0.5">Findings:</strong>
            <p className="text-slate-800 mb-1">
              {isPre1978 ? (
                <>
                  The home was built in <strong>{job.property.buildYear}</strong>. Before any disturbance to building materials, lead and asbestos testing must be conducted prior to the start of work under California State Law (Cal/OSHA Title 8 CCR &sect; 1529, &sect; 1532.1, California Health &amp; Safety Code &sect; 25914).
                </>
              ) : (
                <>
                  The home was built in <strong>{job.property.buildYear}</strong>. Therefore, no lead or asbestos testing is required prior to the start of work.
                </>
              )}
            </p>
            <p className="text-slate-700">
              Drywall moisture standard baseline calibrated at <strong>{job.psychrometricBaseline.drywallBaselineWME}% WME</strong> ({job.psychrometricBaseline.unaffectedRoom}). Readings in scoped chambers range from standard dry to elevated/saturated where moisture intrusion has compromised substrates.
              {job.property.forensicPlumbingDiagnostic && (
                <> Forensic diagnostic: {job.property.forensicPlumbingDiagnostic}</>
              )}
            </p>
          </div>

          {/* 3. RECOMMENDATION */}
          <div className="mb-2 text-[9.5px] leading-relaxed">
            <strong className="text-slate-900 uppercase block mb-1">Recommendation:</strong>
            <p className="text-slate-700 text-[9px] mb-1.5">
              Alert Disaster Restoration to follow IICRC and EPA protocols for safety, containments, personal protective equipment (PPE), and disposal of materials.
              {isPre1978 && (
                <> California State Law requires testing for lead and asbestos prior to disturbing building materials due to the construction year. Testing must be performed by an accredited third-party testing company. Once negative results are obtained, remediation may proceed as scoped below.</>
              )}
            </p>

            {/* Chamber Mitigation Scope Table */}
            <Table>
              <TableHeader>
                <TableRow className="bg-slate-100 text-[9px] uppercase">
                  <TableHead className="py-1">Room / Chamber</TableHead>
                  <TableHead className="py-1">Scope Action &amp; Standardized Details</TableHead>
                  <TableHead className="py-1">Qty / Dim</TableHead>
                  <TableHead className="py-1">Compliance &amp; Waivers</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {job.chambers.map((ch, idx) => (
                  <React.Fragment key={idx}>
                    {ch.demolition.floodCuts && ch.demolition.floodCuts.linearFeet > 0 && (
                      <TableRow className="text-[9.5px]">
                        <TableCell className="font-bold text-slate-900 py-1">{ch.name}</TableCell>
                        <TableCell className="py-1">
                          {ch.demolition.floodCuts.heightFt}-ft flood cut on perimeter walls (drywall &amp; insulation
                          removal) &mdash; {ch.demolition.floodCuts.locations}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-semibold py-1">
                          {ch.demolition.floodCuts.linearFeet} LF
                        </TableCell>
                        <TableCell className="text-slate-500 py-1">
                          {isPre1978 ? "Cal/OSHA Pre-78 dust control" : "Standard dust containment"}
                        </TableCell>
                      </TableRow>
                    )}

                    {ch.demolition.baseboards && ch.demolition.baseboards.linearFeet > 0 && (
                      <TableRow className="text-[9.5px]">
                        <TableCell className="font-bold text-slate-900 py-1">{ch.name}</TableCell>
                        <TableCell className="py-1">Baseboard removal, de-nailing &amp; debris disposal</TableCell>
                        <TableCell className="whitespace-nowrap font-semibold py-1">
                          {ch.demolition.baseboards.linearFeet} LF
                        </TableCell>
                        <TableCell className="text-slate-500 py-1">Collateral wall release applies</TableCell>
                      </TableRow>
                    )}

                    {ch.demolition.flooring && ch.demolition.flooring.squareFeet > 0 && (
                      <TableRow className="text-[9.5px]">
                        <TableCell className="font-bold text-slate-900 py-1">{ch.name}</TableCell>
                        <TableCell className="py-1">{ch.demolition.flooring.action || `${ch.demolition.flooring.substrate} demolition to slab`}</TableCell>
                        <TableCell className="whitespace-nowrap font-semibold py-1">
                          {ch.demolition.flooring.squareFeet} SF
                        </TableCell>
                        <TableCell className="text-slate-500 py-1">Subfloor airflow drying</TableCell>
                      </TableRow>
                    )}

                    {ch.cabinetry.map((cab, cIdx) => (
                      <TableRow key={`cab-${cIdx}`} className="text-[9.5px]">
                        <TableCell className="font-bold text-slate-900 py-1">{ch.name}</TableCell>
                        <TableCell className="py-1">
                          {cab.item} ({cab.action})
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-semibold py-1">1 EA</TableCell>
                        <TableCell className="text-amber-800 font-medium py-1">{cab.waiver}</TableCell>
                      </TableRow>
                    ))}

                    {ch.equipment.length > 0 && (
                      <TableRow className="text-[9.5px]">
                        <TableCell className="font-bold text-slate-900 py-1">{ch.name}</TableCell>
                        <TableCell className="py-1">
                          Drying chamber setup:{" "}
                          {ch.equipment.map((e) => `${e.count}x ${e.type} (${e.days} Days)`).join(", ")}
                        </TableCell>
                        <TableCell className="whitespace-nowrap font-semibold py-1">
                          {ch.equipment.reduce((acc, curr) => acc + curr.count, 0)} Units
                        </TableCell>
                        <TableCell className="text-slate-500 py-1">
                          IICRC S500 standard drying protocol
                        </TableCell>
                      </TableRow>
                    )}

                    {ch.homeownerObligations.map((obl, oIdx) => (
                      <TableRow key={`obl-${oIdx}`} className="bg-blue-50/70 text-[9px]">
                        <TableCell className="font-bold text-slate-900 py-1">{ch.name}</TableCell>
                        <TableCell colSpan={3} className="text-blue-900 italic font-semibold py-1">
                          Homeowner Obligation: {obl}
                        </TableCell>
                      </TableRow>
                    ))}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
            <div className="text-[8.5px] text-slate-600 mt-1 italic">
              Apply EPA-registered botanical antimicrobial solution and mold-inhibiting primer to all exposed structural framing.
            </div>
          </div>

          {/* 4. PROPOSED COST */}
          <div className="bg-red-50/80 border border-red-200 rounded-lg p-3 my-2 flex justify-between items-center">
            <div>
              <div className="text-sm font-black text-red-900">
                {isPre1978 ? (
                  <>Proposed cost for remediation: ${job.financialTier.snappedTier.toLocaleString()} <span className="text-xs font-normal text-red-700">(this does not include the pretest for lead/asbestos)</span></>
                ) : (
                  <>Proposed cost for needed remediation: ${job.financialTier.snappedTier.toLocaleString()}</>
                )}
              </div>
              <div className="text-[9px] text-slate-600">
                Billing Structure: {job.financialTier.tierName} &bull; Deterministic ADR Flat-Fee Rate Schedule
              </div>
            </div>
            <div>
              <Badge variant="tier" className="text-xs px-3 py-1 font-bold">
                ${job.financialTier.snappedTier.toLocaleString()}
              </Badge>
            </div>
          </div>

          {/* 5. NOTES & DISCLAIMERS */}
          <div className="border border-slate-200 rounded p-2 text-[8.5px] text-slate-600 space-y-1">
            <strong className="text-slate-800 uppercase block text-[9px]">Notes &amp; Disclaimers:</strong>
            <p>
              &bull; <strong>NOTE:</strong> This estimate does NOT include reconstruction after remediation is completed.<br />
              &bull; Alert Disaster Restoration is not responsible for collateral damage to existing materials during selective demolition.<br />
              &bull; If this estimate is submitted to an insurance carrier, pricing may be adjusted in accordance with standard Xactimate pricing guidelines.<br />
              &bull; <em>Estimate is valid for 30 days from date of inspection.</em>
            </p>
            <div className="pt-1 text-slate-800 font-semibold flex justify-between items-center text-[9px]">
              <span>Matthew Myers, Alert Disaster Restoration</span>
              <span>CSLB CA License #950983</span>
            </div>
          </div>
        </div>

        {/* Page 1 Footer */}
        <div className="border-t border-slate-200 pt-1 text-[8.5px] text-slate-400 flex justify-between items-center mt-2">
          <span>Alert Disaster Restoration &bull; Bakersfield, CA &bull; (661) 396-7908</span>
          <span>Page 1 of 2 &bull; Remediation Estimate</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* PAGE 2: AUTHORIZATION, TERMS & E-SIGNATURE               */}
      {/* ======================================================== */}
      <div className="print-page bg-white p-7 md:p-9 rounded-xl shadow-lg border border-slate-200 text-slate-900 font-sans min-h-[10.1in] flex flex-col justify-between">
        <div>
          {/* Header */}
          <div className="border-b-2 border-red-600 pb-2 flex justify-between items-center">
            <div>
              <div className="text-base font-black text-red-600 uppercase">
                Alert Disaster Restoration &mdash; Page 2
              </div>
              <div className="text-[9px] text-slate-500">
                3300 Patton Way Ste. 1, Bakersfield, CA 93308 &bull; CA License #950983
              </div>
            </div>
            <div className="text-right text-[10px] text-slate-600">
              <strong>Job Ref:</strong> {job.lossId}<br />
              <strong>Property:</strong> {job.customer.serviceAddress}
            </div>
          </div>

          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 mt-4 mb-2">
            Standard Terms, Assignment of Benefits &amp; Statutory Disclosures
          </h3>

          <div className="text-[9.5px] text-slate-700 space-y-2.5 leading-relaxed text-justify">
            <p>
              1. <strong>Authorization to Perform Work:</strong> The undersigned property owner or authorized
              agent hereby authorizes Alert Disaster Restoration (ADR) to enter the premises, perform emergency
              mitigation, structural drying, and hazardous material containment as scoped on Page 1 of this Remediation Estimate.
            </p>
            <p>
              2. <strong>Direct Payment Authorization &amp; Assignment of Benefits:</strong> Owner hereby assigns all insurance rights,
              benefits, and proceeds payable for services rendered directly to Alert Disaster Restoration. Owner
              instructs insurance carrier to name ADR as primary payee on all drafts. In the event insurance proceeds
              do not satisfy the invoice, owner remains contractually responsible for the unpaid balance.
            </p>
            <p>
              3. <strong>Collateral Breakage &amp; Homeowner Responsibilities:</strong> ADR is not responsible for
              pre-existing structural decay, dry rot, hairline tile fractures occurring during baseboard/drywall
              flood cuts, or stone/granite countertop fracture during cabinet detachments. Homeowner agrees to perform
              all items marked as homeowner obligations before work begins.
            </p>
            <p>
              4. <strong>Right of Cancellation &amp; Emergency Response:</strong> Emergency mitigation services commence
              immediately upon execution to prevent secondary microbial amplification, moisture migration, and structural decay.
            </p>
            <p>
              5. <strong>Notice of California Mechanics Lien Law (Cal. Civ. Code &sect; 8400 et seq.):</strong> Anyone
              who helps improve your property, but who is not paid, may record what is called a mechanics lien on
              your property. Under California law, failure to remit payment for authorized emergency restoration
              services, materials, or equipment deployed may subject the subject property to foreclosure under a
              recorded mechanics lien.
            </p>
            {isPre1978 && (
              <p className="bg-rose-50 border border-rose-200 rounded p-2 text-rose-950 font-medium">
                6. <strong>California Hazardous Substance Mandate (Cal/OSHA Title 8 CCR &sect; 1529 &amp; Health &amp; Safety Code &sect; 25914):</strong> Structure constructed prior to 1978. Accredited third-party testing for lead and asbestos is required prior to disturbing building materials. Laboratory testing fees are separate and excluded from this initial mitigation scope.
              </p>
            )}
          </div>
        </div>

        {/* Signature Capture Pad */}
        <div className="bg-slate-50 border border-slate-300 rounded-lg p-3.5 mt-4">
          <div className="flex justify-between items-center mb-1.5">
            <strong className="text-[11px] uppercase tracking-wide text-slate-900">
              Property Owner / Agent Signature Authorization:
            </strong>
            <button
              type="button"
              onClick={clearSignature}
              className="text-[10px] text-red-600 hover:text-red-700 flex items-center space-x-1 no-print"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Clear Signature</span>
            </button>
          </div>

          <div className="border border-slate-300 rounded bg-white relative">
            <canvas
              ref={canvasRef}
              width={650}
              height={100}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
              className="w-full h-20 touch-none cursor-crosshair"
            />
            {!hasSignature && (
              <span className="absolute inset-0 flex items-center justify-center text-xs text-slate-300 pointer-events-none select-none">
                Sign with finger or stylus on glass
              </span>
            )}
          </div>

          <div className="flex justify-between mt-2 text-[9.5px] text-slate-600">
            <span>Authorized Signature</span>
            <span>Printed Name: {job.customer.name}</span>
            <span>Date: {job.inspectionDate}</span>
          </div>
        </div>

        {/* Page 2 Footer */}
        <div className="border-t border-slate-200 pt-1 text-[8.5px] text-slate-400 flex justify-between items-center mt-2">
          <span>Alert Disaster Restoration &bull; Bakersfield, CA &bull; CA License #950983</span>
          <span>Page 2 of 2 &bull; Client Authorization &amp; Terms</span>
        </div>
      </div>
    </div>
  );
}
