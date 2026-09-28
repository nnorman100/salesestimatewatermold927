"""
Alert Disaster Restoration — Official 2-Page Field Proposal Compiler
Compiles job_state.json + deterministic pricing_engine into proposal.html and renders proposal.pdf
"""

import json
import os
import subprocess
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict

from pricing_engine import calculate_pricing


def generate_html_proposal(job_state: Dict[str, Any], pricing: Dict[str, Any]) -> str:
    cust = job_state.get("customer", {})
    prop = job_state.get("property", {})
    psy = job_state.get("psychrometricBaseline", {})
    chambers = job_state.get("chambers", [])
    tier = pricing.get("financialTier", {})
    line_items = pricing.get("lineItems", [])

    is_pre_1978 = prop.get("isPre1978", False)
    build_year = prop.get("buildYear", "N/A")

    # Render chambers HTML
    chambers_html = ""
    for ch in chambers:
        readings_rows = "".join(
            f"""<tr>
                <td style="padding: 3px 6px; border: 1px solid #d1d5db; font-size: 8pt;">{r.get('location')}</td>
                <td style="padding: 3px 6px; border: 1px solid #d1d5db; font-size: 8pt;">{r.get('substrate')}</td>
                <td style="padding: 3px 6px; border: 1px solid #d1d5db; font-size: 8pt; font-weight: 700; color: {'#b91c1c' if r.get('classification') in ['Saturated', 'Wet'] else '#b45309'};">{r.get('readingWME')}% WME ({r.get('classification')})</td>
                <td style="padding: 3px 6px; border: 1px solid #d1d5db; font-size: 8pt;">{f"{r.get('thermalDeltaF')}°F Δ" if r.get('thermalDeltaF') is not None else "N/A"}</td>
            </tr>"""
            for r in ch.get("moistureReadings", [])
        )

        demo = ch.get("demolition", {})
        flood_cuts = demo.get("floodCuts", {})
        baseboards = demo.get("baseboards", {})
        flooring = demo.get("flooring", {})

        cabinetry_waivers = "".join(
            f"""<div style="margin-top: 4px; padding: 4px 8px; background: #fff7ed; border-left: 3px solid #f97316; font-size: 7.5pt; color: #9a3412;">
                <strong>WAIVER ({c.get('item')}):</strong> {c.get('waiver')}
            </div>"""
            for c in ch.get("cabinetry", [])
        )

        homeowner_items = "".join(
            f"""<li style="margin-bottom: 2px; color: #1e3a8a; font-weight: 600;">{obl}</li>"""
            for obl in ch.get("homeownerObligations", [])
        )

        equipment_tags = "".join(
            f"""<span style="display: inline-block; background: #e0f2fe; color: #0369a1; padding: 2px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: 600; margin-right: 4px; margin-bottom: 3px;">
                {eq.get('count')}x {eq.get('type')} ({eq.get('days')} Days)
            </span>"""
            for eq in ch.get("equipment", [])
        )

        chambers_html += f"""
        <div style="margin-bottom: 8px; padding: 6px 8px; border: 1px solid #e5e7eb; border-radius: 4px; background: #fafafa;">
            <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e5e7eb; padding-bottom: 3px; margin-bottom: 4px;">
                <span style="font-weight: 700; font-size: 9.5pt; color: #0f172a;">{ch.get('name')}</span>
                <span style="font-size: 7.5pt; color: #475569;">{ch.get('waterCategory')} | {ch.get('waterClass')}</span>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 4px;">
                <div>
                    <span style="font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #64748b;">Demolition Scope</span>
                    <ul style="margin: 2px 0 0 14px; padding: 0; font-size: 8pt; color: #1e293b;">
                        <li><strong>Flood Cuts:</strong> {flood_cuts.get('heightFt')}-ft Cut, {flood_cuts.get('linearFeet')} LF ({flood_cuts.get('locations')})</li>
                        <li><strong>Baseboards:</strong> {baseboards.get('linearFeet')} LF removal & disposal</li>
                        <li><strong>Flooring:</strong> {flooring.get('substrate')} ({flooring.get('squareFeet')} SF)</li>
                    </ul>
                </div>
                <div>
                    <span style="font-size: 7.5pt; font-weight: 700; text-transform: uppercase; color: #64748b;">Homeowner Responsibilities</span>
                    <ul style="margin: 2px 0 0 14px; padding: 0; font-size: 7.5pt;">
                        {homeowner_items}
                    </ul>
                </div>
            </div>

            <div style="margin-bottom: 4px;">
                <table style="width: 100%; border-collapse: collapse; margin-top: 2px;">
                    <thead style="background: #f1f5f9;">
                        <tr>
                            <th style="padding: 2px 6px; border: 1px solid #d1d5db; font-size: 7.5pt; text-align: left;">Moisture Probe Location</th>
                            <th style="padding: 2px 6px; border: 1px solid #d1d5db; font-size: 7.5pt; text-align: left;">Substrate</th>
                            <th style="padding: 2px 6px; border: 1px solid #d1d5db; font-size: 7.5pt; text-align: left;">Reading</th>
                            <th style="padding: 2px 6px; border: 1px solid #d1d5db; font-size: 7.5pt; text-align: left;">FLIR Thermal Δ</th>
                        </tr>
                    </thead>
                    <tbody>
                        {readings_rows}
                    </tbody>
                </table>
            </div>

            {cabinetry_waivers}

            <div style="margin-top: 4px;">
                <span style="font-size: 7.5pt; font-weight: 700; color: #64748b; margin-right: 6px;">DEPLOYED EQUIPMENT:</span>
                {equipment_tags}
            </div>
        </div>
        """

    # Line item billing table
    billing_rows = "".join(
        f"""<tr>
            <td style="padding: 3px 6px; border-bottom: 1px solid #e2e8f0; font-size: 8pt;">{item.get('description')}</td>
            <td style="padding: 3px 6px; border-bottom: 1px solid #e2e8f0; font-size: 8pt; text-align: center;">{item.get('quantity')} {item.get('unit')}{f" x {item.get('days')}d" if item.get('days') else ''}</td>
            <td style="padding: 3px 6px; border-bottom: 1px solid #e2e8f0; font-size: 8pt; text-align: right;">${item.get('unitRate'):,.2f}</td>
            <td style="padding: 3px 6px; border-bottom: 1px solid #e2e8f0; font-size: 8pt; text-align: right; font-weight: 600;">${item.get('lineTotal'):,.2f}</td>
        </tr>"""
        for item in line_items
    )

    compliance_badge = (
        f"""<div style="background: #fef2f2; border: 1.5px solid #dc2626; border-radius: 4px; padding: 6px 10px; margin-bottom: 6px;">
            <div style="display: flex; align-items: center; justify-content: space-between;">
                <strong style="color: #991b1b; font-size: 8.5pt;">MANDATORY CALIFORNIA STATUTORY DISCLOSURE (PRE-1978 STRUCTURE: BUILT {build_year})</strong>
                <span style="background: #dc2626; color: #fff; font-size: 7pt; font-weight: 700; padding: 2px 6px; border-radius: 3px;">ASBESTOS & LEAD PRE-TEST MANDATED</span>
            </div>
            <p style="margin: 3px 0 0 0; font-size: 7.5pt; color: #7f1d1d; line-height: 1.3;">
                Pursuant to <strong>Cal/OSHA Title 8 CCR § 1529</strong>, <strong>Health & Safety Code § 25914</strong>, and <strong>Cal/OSHA Title 8 CCR § 1532.1 / EPA RRP</strong>, building materials in pre-1978 properties must undergo accredited laboratory point-count testing for asbestos and lead prior to disturbance. Emergency drying containment will proceed while sample assays are completed.
            </p>
        </div>"""
        if is_pre_1978
        else f"""<div style="background: #f0fdf4; border: 1px solid #16a34a; border-radius: 4px; padding: 5px 8px; margin-bottom: 6px;">
            <strong style="color: #166534; font-size: 8pt;">CALIFORNIA STATUTORY COMPLIANCE: POST-1978 STRUCTURE (BUILT {build_year})</strong>
            <p style="margin: 2px 0 0 0; font-size: 7.5pt; color: #14532d;">Federal bans on lead and asbestos surfacing materials apply. Standard IICRC S500 dust suppression active.</p>
        </div>"""
    )

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <title>Alert Disaster Restoration — Emergency Mitigation Proposal</title>
    <style>
        @page {{
            size: letter portrait;
            margin: 0;
        }}
        * {{
            box-sizing: border-box;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
        }}
        body {{
            margin: 0;
            padding: 0;
            font-family: 'Helvetica Neue', Arial, sans-serif;
            color: #0f172a;
            background: #cbd5e1;
        }}
        .page {{
            width: 8.5in;
            height: 11.0in;
            margin: 0 auto 20px auto;
            background: #ffffff;
            padding: 0.35in 0.45in;
            position: relative;
            page-break-after: always;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            justify-content: space-between;
        }}
        @media print {{
            body {{
                background: none;
            }}
            .page {{
                margin: 0;
                page-break-after: always;
            }}
            .page:last-child {{
                page-break-after: avoid;
            }}
        }}
        .header-bar {{
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2.5px solid #b91c1c;
            padding-bottom: 6px;
            margin-bottom: 6px;
        }}
        .adr-logo-text {{
            font-size: 17pt;
            font-weight: 900;
            color: #b91c1c;
            letter-spacing: -0.5px;
            line-height: 1;
        }}
        .adr-subtext {{
            font-size: 7.5pt;
            font-weight: 600;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.8px;
            margin-top: 2px;
        }}
        .company-contacts {{
            text-align: right;
            font-size: 7.5pt;
            color: #475569;
            line-height: 1.25;
        }}
        .grid-2 {{
            display: grid;
            grid-template-columns: 1.15fr 0.85fr;
            gap: 8px;
            margin-bottom: 6px;
        }}
        .meta-card {{
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 4px;
            padding: 5px 8px;
            font-size: 8pt;
            line-height: 1.3;
        }}
        .meta-card strong {{
            color: #0f172a;
        }}
        .section-title {{
            font-size: 8.5pt;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #1e293b;
            border-bottom: 1.5px solid #cbd5e1;
            padding-bottom: 2px;
            margin-top: 4px;
            margin-bottom: 4px;
        }}
        .tier-banner {{
            background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
            color: #ffffff;
            border-radius: 4px;
            padding: 8px 12px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-top: 4px;
        }}
        .footer-bar {{
            border-top: 1px solid #cbd5e1;
            padding-top: 4px;
            font-size: 7pt;
            color: #64748b;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }}
        .legal-clause {{
            font-size: 7pt;
            line-height: 1.28;
            color: #334155;
            margin-bottom: 5px;
            text-align: justify;
        }}
        .legal-clause strong {{
            color: #0f172a;
        }}
        .sig-box {{
            border: 1px solid #94a3b8;
            background: #f8fafc;
            border-radius: 4px;
            padding: 8px 12px;
            margin-top: 8px;
        }}
    </style>
</head>
<body>

<!-- PAGE 1: FORENSIC SCOPE & PRICING -->
<div class="page">
    <div>
        <div class="header-bar">
            <div>
                <div class="adr-logo-text">ALERT DISASTER RESTORATION</div>
                <div class="adr-subtext">“Making It New Again” • California Emergency Mitigation Service</div>
                <div style="font-size: 7.5pt; color: #64748b; margin-top: 2px;">
                    3300 Patton Way Ste. 1, Bakersfield, CA 93308 • CA License #950983 • IICRC Certified Firm
                </div>
            </div>
            <div class="company-contacts">
                <strong>Emergency Dispatch:</strong> (877) 435-8117<br>
                <strong>Tel:</strong> (661) 396-7908 • <strong>Fax:</strong> (661) 615-3350<br>
                <strong>Loss ID:</strong> {job_state.get('lossId')}<br>
                <strong>Date:</strong> {job_state.get('inspectionDate')}
            </div>
        </div>

        <div class="grid-2">
            <div class="meta-card">
                <div style="font-weight: 700; color: #b91c1c; font-size: 8.5pt; margin-bottom: 2px;">CUSTOMER & LOSS RECORD</div>
                <div><strong>Policyholder:</strong> {cust.get('name')}</div>
                <div><strong>Loss Address:</strong> {cust.get('serviceAddress')}</div>
                <div><strong>Contact:</strong> {cust.get('phone')} • {cust.get('email')}</div>
                <div><strong>Carrier / Claim:</strong> {cust.get('carrier')} • #{cust.get('claimNumber')}</div>
                <div><strong>Lead Forensic Tech:</strong> {cust.get('technician')}</div>
            </div>
            <div class="meta-card">
                <div style="font-weight: 700; color: #0369a1; font-size: 8.5pt; margin-bottom: 2px;">PSYCHROMETRIC & PROPERTY BASELINE</div>
                <div><strong>Year Built:</strong> {build_year} ({'Pre-1978 Mandate' if is_pre_1978 else 'Post-1978 Standard'})</div>
                <div><strong>Unaffected Baseline ({psy.get('unaffectedRoom')}):</strong></div>
                <div style="padding-left: 6px; color: #334155;">
                    • Moisture: <strong>{psy.get('drywallBaselineWME')}% WME</strong> (Dry Standard)<br>
                    • Psychrometrics: <strong>{psy.get('tempF')}°F</strong>, <strong>{psy.get('rhPercent')}% RH</strong>, <strong>{psy.get('humidityRatioGPP')} GPP</strong>
                </div>
            </div>
        </div>

        {compliance_badge}

        <div style="background: #f1f5f9; border-left: 3px solid #0284c7; padding: 4px 8px; margin-bottom: 6px; font-size: 7.5pt; color: #0c4a6e;">
            <strong>FORENSIC PLUMBING DIAGNOSTIC:</strong> {prop.get('forensicPlumbingDiagnostic')}
        </div>

        <div class="section-title">Chamber Scoping & Structural Moisture Matrix</div>
        {chambers_html}

        <div class="section-title">IICRC Deterministic Rate Schedule & Line Item Accounting</div>
        <table style="width: 100%; border-collapse: collapse; margin-top: 2px;">
            <thead style="background: #f1f5f9;">
                <tr>
                    <th style="padding: 2px 6px; border-bottom: 1.5px solid #cbd5e1; font-size: 7.5pt; text-align: left;">Scope Item / Activity</th>
                    <th style="padding: 2px 6px; border-bottom: 1.5px solid #cbd5e1; font-size: 7.5pt; text-align: center;">Qty / Duration</th>
                    <th style="padding: 2px 6px; border-bottom: 1.5px solid #cbd5e1; font-size: 7.5pt; text-align: right;">Rate</th>
                    <th style="padding: 2px 6px; border-bottom: 1.5px solid #cbd5e1; font-size: 7.5pt; text-align: right;">Total</th>
                </tr>
            </thead>
            <tbody>
                {billing_rows}
            </tbody>
        </table>
    </div>

    <div>
        <div class="tier-banner">
            <div>
                <div style="font-size: 7.5pt; text-transform: uppercase; letter-spacing: 0.8px; color: #94a3b8;">Deterministic Rate Assessment</div>
                <div style="font-size: 11pt; font-weight: 800; color: #38bdf8;">{tier.get('tierName')}</div>
                <div style="font-size: 7.5pt; color: #cbd5e1;">{tier.get('tierDescription')} (Calculated Base: ${pricing.get('subtotal'):,.2f})</div>
            </div>
            <div style="text-align: right;">
                <div style="font-size: 8pt; color: #94a3b8; text-transform: uppercase;">Alert Authorized Flat Fee</div>
                <div style="font-size: 16pt; font-weight: 900; color: #4ade80;">${tier.get('snappedTier'):,.2f}</div>
            </div>
        </div>

        <div class="footer-bar" style="margin-top: 4px;">
            <span>Alert Disaster Restoration • California Emergency Work Proposal</span>
            <span>Ref: {job_state.get('lossId')}</span>
            <span>Page 1 of 2</span>
        </div>
    </div>
</div>

<!-- PAGE 2: TERMS, AOB, STATUTORY DISCLOSURES & AUTHORIZATION -->
<div class="page">
    <div>
        <div class="header-bar">
            <div>
                <div class="adr-logo-text" style="font-size: 14pt;">ALERT DISASTER RESTORATION</div>
                <div class="adr-subtext">California Emergency Mitigation Contract • Legal Disclosures & Work Authorization</div>
            </div>
            <div class="company-contacts">
                <strong>CSLB License:</strong> #982144<br>
                <strong>Loss ID:</strong> {job_state.get('lossId')}
            </div>
        </div>

        <div class="section-title">1. Emergency Mitigation Scope & Standards of Care</div>
        <p class="legal-clause">
            Alert Disaster Restoration ("Contractor") agrees to perform emergency structural water mitigation, psychrometric monitoring, antimicrobial treatment, and source demolition as detailed on Page 1 in accordance with the <strong>IICRC S500 Standard and Reference Guide for Professional Water Damage Restoration</strong>. Contractor utilizes specialized non-invasive testing and thermal imaging to control secondary damage and microbial amplifier propagation.
        </p>

        <div class="section-title">2. California Pre-1978 Hazardous Material Statutory Disclosures</div>
        <p class="legal-clause">
            <strong>CAL/OSHA TITLE 8 CCR § 1529 & HEALTH & SAFETY CODE § 25914:</strong> For properties constructed prior to 1978, California law strictly prohibits the disturbance, sanding, cutting, or mechanical demolition of building materials (including joint compound, drywall, acoustic ceiling texture, flooring mastic, and vinyl composition tile) without prior certified asbestos testing or implementation of Class I/II containment engineering controls. Customer authorizes Contractor or accredited third-party certified asbestos consultants (CAC) to extract and analyze bulk material samples. Contractor shall not be liable for project pauses necessitated by mandatory statutory lab processing intervals.
        </p>

        <div class="section-title">3. Collateral Damage Waivers & Cabinetry Detachments</div>
        <p class="legal-clause">
            <strong>STONE & CABINETRY RELEASE:</strong> When detaching bonded vanity cabinets, ceramic wall assemblies, or granite/quartz countertops to mitigate wet wall cavities, Contractor executes industry-standard care. However, Customer acknowledges that adhesives, mastic release stresses, and micro-fractures in natural stone may result in hairline cracking or substrate fracture. Customer expressly waives claims for unavoidable collateral detachment fracture where detachment is necessary to mitigate Category 2/3 cavity saturation.
        </p>

        <div class="section-title">4. Customer Obligations & Psychrometric Environment</div>
        <p class="legal-clause">
            Customer agrees to maintain uninterrupted electrical power to all drying chambers, maintain uninterrupted equipment operation (24 hours/day), refrain from turning off or moving air movers or dehumidifiers, and complete all starred (<strong>*...*</strong>) personal content clearing items promptly. Contractor's psychrometric dry standard warranty is void if drying equipment is prematurely disconnected or power is disrupted.
        </p>

        <div class="section-title">5. Insurance Direct Assignment of Benefits (AOB) & Direction to Pay</div>
        <p class="legal-clause">
            Customer hereby assigns and transfers to Contractor any and all insurance rights, benefits, proceeds, and causes of action arising under the applicable property insurance policy for the emergency restoration services described herein. Customer unequivocally directs Customer's insurance carrier to issue direct payment payable solely to <strong>Alert Disaster Restoration</strong>. In the event payment is issued jointly or sent to Customer, Customer agrees to endorse and forward said funds to Contractor within seventy-two (72) hours of receipt.
        </p>

        <div class="section-title">6. Payment Terms, Deductible Obligations & Mechanics Lien Warning</div>
        <p class="legal-clause">
            Customer remains personally responsible for payment of Customer's insurance deductible, any non-covered losses, depreciation holdbacks, or policy limits. Outstanding balances beyond thirty (30) days accrue interest at 1.5% per month (18% per annum) or the maximum permitted by California law. 
            <br>
            <strong>CALIFORNIA MECHANICS LIEN ADVISORY (CAL. CIV. CODE § 8400 ET SEQ.):</strong> Anyone who helps improve your property, but who is not paid, may record what is called a mechanics lien on your property. Under California law, failure to remit payment for authorized emergency restoration services may subject the subject property to foreclosure under a recorded mechanics lien.
        </p>

        <div class="sig-box">
            <div style="font-weight: 800; font-size: 8.5pt; color: #b91c1c; margin-bottom: 4px; text-transform: uppercase;">
                Homeowner Emergency Work Authorization & Acceptance
            </div>
            <p style="font-size: 7.2pt; color: #334155; margin: 0 0 8px 0; line-height: 1.3;">
                By signing below, Customer confirms receipt of Page 1 scope of work and Flat Fee Tier pricing (${tier.get('snappedTier'):,.2f}), authorizes immediate emergency dispatch and demolition, acknowledges California pre-1978 hazardous material disclosures, agrees to all starred customer responsibilities, executes the stone/cabinetry collateral damage waiver, and executes the Insurance Assignment of Benefits.
            </p>
            
            <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px; margin-top: 10px;">
                <div>
                    <div style="border-bottom: 1.5px solid #0f172a; height: 28px; margin-bottom: 3px;"></div>
                    <div style="font-size: 7.5pt; font-weight: 700; color: #0f172a;">Property Owner / Authorized Agent Signature</div>
                    <div style="font-size: 7pt; color: #475569;">Printed: {cust.get('name')}</div>
                </div>
                <div>
                    <div style="border-bottom: 1.5px solid #0f172a; height: 28px; margin-bottom: 3px;"></div>
                    <div style="font-size: 7.5pt; font-weight: 700; color: #0f172a;">Date of Authorization</div>
                    <div style="font-size: 7pt; color: #475569;">{job_state.get('inspectionDate')}</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: 1.2fr 0.8fr; gap: 16px; margin-top: 12px;">
                <div>
                    <div style="border-bottom: 1px solid #64748b; height: 22px; margin-bottom: 3px;"></div>
                    <div style="font-size: 7.5pt; font-weight: 600; color: #475569;">ADR Lead Forensic Representative</div>
                    <div style="font-size: 7pt; color: #64748b;">Matthew Myers, Alert Disaster Restoration</div>
                </div>
                <div>
                    <div style="border-bottom: 1px solid #64748b; height: 22px; margin-bottom: 3px;"></div>
                    <div style="font-size: 7.5pt; font-weight: 600; color: #475569;">CSLB License Verification</div>
                    <div style="font-size: 7pt; color: #64748b;">CSLB CA License #950983 (Active & In Good Standing)</div>
                </div>
            </div>
        </div>
    </div>

    <div class="footer-bar">
        <span>Alert Disaster Restoration • 3300 Patton Way Ste. 1, Bakersfield, CA 93308 • (661) 396-7908</span>
        <span>Customer: {cust.get('name')} • Claim: {cust.get('claimNumber')}</span>
        <span>Page 2 of 2</span>
    </div>
</div>

</body>
</html>
"""
    return html


def render_from_template(
    job_state: Dict[str, Any], pricing: Dict[str, Any], template_path: Path = Path("proposal_template.html")
) -> str:
    """Renders proposal using the pre-formatted ADR letterhead template."""
    if not template_path.exists():
        return generate_html_proposal(job_state, pricing)

    template = template_path.read_text(encoding="utf-8")

    job_id = job_state.get("lossId") or job_state.get("jobId", "ADR-2026-CA-8492")
    current_date = job_state.get("inspectionDate", "2026-09-24")

    cust = job_state.get("customer", {})
    client_name = cust.get("name") or job_state.get("clientName", "Homeowner")
    client_phone = cust.get("phone") or job_state.get("clientPhone", "(661) 396-7908")
    prop_address = (
        cust.get("serviceAddress")
        or job_state.get("propertyAddress")
        or "1518 Old Stage St, Bakersfield, CA 93312"
    )

    prop = job_state.get("property", {})
    build_year = str(prop.get("buildYear", job_state.get("buildYear", 1974)))
    is_pre_1978 = prop.get("isPre1978", job_state.get("isPre1978", int(build_year) < 1978 if str(build_year).isdigit() else False))
    loss_category = job_state.get("lossCategory", "Category 2 (Grey Water)")

    baseline = job_state.get("baseline", {})
    psy = job_state.get("psychrometricBaseline", {})
    dry_target = str(psy.get("drywallBaselineWME", baseline.get("drywallWmePercent", 9.2)))

    chambers = job_state.get("chambers", [])
    area_inspected = ", ".join(ch.get("name", "") for ch in chambers if ch.get("name")) or "Main Loss Chambers"
    carrier_info = cust.get("carrier") or "Private Pay / Direct"
    if cust.get("claimNumber"):
        carrier_info += f" • #{cust.get('claimNumber')}"

    tier_info = pricing.get("financialTier", {})
    tier_name = tier_info.get("tierName", "Tier 2 - Standard Room Mitigation")
    snapped_val = tier_info.get("snappedTier", 1999.00)
    tier_badge = f"${snapped_val:,.0f}"

    if is_pre_1978:
        statutory_text = (
            f"The home was built in {build_year}. Before any disturbance to building materials, lead and asbestos "
            "testing must be conducted prior to the start of work under California State Law "
            "(Cal/OSHA Title 8 CCR § 1529, § 1532.1, California Health & Safety Code § 25914)."
        )
        testing_recommendation_note = (
            " California State Law requires testing for lead and asbestos prior to disturbing building materials due to the "
            "construction year. Testing must be performed by an accredited third-party testing company. Once negative results "
            "are obtained, remediation may proceed as scoped below."
        )
        proposed_cost_text = f"Proposed cost for remediation: ${snapped_val:,.0f} (this does not include the pretest for lead/asbestos)"
        pre1978_clause = (
            '<p style="margin: 4px 0; background: #fff1f2; border: 1px solid #fecdd3; padding: 4px 6px; border-radius: 3px; color: #881337;">'
            "6. <strong>California Hazardous Substance Mandate (Cal/OSHA Title 8 CCR § 1529 & Health & Safety Code § 25914):</strong> "
            "Structure constructed prior to 1978. Accredited third-party testing for lead and asbestos is required prior to disturbing building materials. "
            "Laboratory testing fees are separate and excluded from this initial mitigation scope."
            "</p>"
        )
    else:
        statutory_text = (
            f"The home was built in {build_year}. Therefore, no lead or asbestos testing is required prior to the start of work."
        )
        testing_recommendation_note = ""
        proposed_cost_text = f"Proposed cost for needed remediation: ${snapped_val:,.0f}"
        pre1978_clause = ""

    # Generate scope rows
    rows = []
    if chambers:
        for ch in chambers:
            ch_name = ch.get("name", "Chamber")
            demo = ch.get("demolition", {})
            fc = demo.get("floodCuts", {})
            if fc and fc.get("linearFeet", 0) > 0:
                rows.append(
                    f"<tr>"
                    f"<td><strong>{ch_name}</strong></td>"
                    f"<td>{fc.get('heightFt', 2)}-ft flood cut on perimeter walls (drywall & insulation removal) — {fc.get('locations', '')}</td>"
                    f"<td>{fc.get('linearFeet')} LF</td>"
                    f"<td>Standard dust containment; Cal/OSHA Pre-1978 compliance</td>"
                    f"</tr>"
                )
            bb = demo.get("baseboards", {})
            if bb and bb.get("linearFeet", 0) > 0:
                rows.append(
                    f"<tr>"
                    f"<td><strong>{ch_name}</strong></td>"
                    f"<td>Baseboard removal, de-nailing & debris disposal</td>"
                    f"<td>{bb.get('linearFeet')} LF</td>"
                    f"<td>Collateral wall release waiver applies</td>"
                    f"</tr>"
                )
            fl = demo.get("flooring", {})
            if fl and fl.get("squareFeet", 0) > 0:
                rows.append(
                    f"<tr>"
                    f"<td><strong>{ch_name}</strong></td>"
                    f"<td>{fl.get('action') or (fl.get('substrate', 'Flooring') + ' removal to subfloor substrate')}</td>"
                    f"<td>{fl.get('squareFeet')} SF</td>"
                    f"<td>Subfloor moisture inspection & direct slab airflow</td>"
                    f"</tr>"
                )
            for cab in ch.get("cabinetry", []):
                rows.append(
                    f"<tr>"
                    f"<td><strong>{ch_name}</strong></td>"
                    f"<td>{cab.get('item', 'Cabinetry')} ({cab.get('action', 'Detach & Reset')})</td>"
                    f"<td>1 EA</td>"
                    f"<td style='color: #b45309; font-weight: 600;'>{cab.get('waiver', 'Countertop breakage waiver applies.')}</td>"
                    f"</tr>"
                )
            eq_list = ch.get("equipment", [])
            if eq_list:
                eq_summary = ", ".join(f"{e.get('count')}x {e.get('type')} ({e.get('days')} Days)" for e in eq_list)
                total_units = sum(e.get("count", 0) for e in eq_list)
                rows.append(
                    f"<tr>"
                    f"<td><strong>{ch_name}</strong></td>"
                    f"<td>Structural drying setup: {eq_summary}</td>"
                    f"<td>{total_units} Units</td>"
                    f"<td>IICRC S500 standard drying protocol; daily psychrometric logs</td>"
                    f"</tr>"
                )
            for obl in ch.get("homeownerObligations", []):
                rows.append(
                    f"<tr>"
                    f"<td><strong>{ch_name}</strong></td>"
                    f"<td colspan='3' style='background: #eff6ff; color: #1e40af;'><strong>Homeowner Obligation:</strong> {obl}</td>"
                    f"</tr>"
                )
    else:
        for it in pricing.get("lineItems", []):
            rows.append(
                f"<tr>"
                f"<td>General Scope</td>"
                f"<td>{it.get('description')}</td>"
                f"<td>{it.get('quantity')} {it.get('unit')}</td>"
                f"<td>{it.get('notes', 'Standard mitigation scope')}</td>"
                f"</tr>"
            )

    scope_rows_html = "\n".join(rows) if rows else "<tr><td colspan='4'>No chamber scope items recorded.</td></tr>"

    rendered = template.replace("{{JOB_ID}}", str(job_id))
    rendered = rendered.replace("{{CURRENT_DATE}}", str(current_date))
    rendered = rendered.replace("{{BUILD_YEAR}}", str(build_year))
    rendered = rendered.replace("{{PROPERTY_ADDRESS}}", str(prop_address))
    rendered = rendered.replace("{{CLIENT_NAME}}", str(client_name))
    rendered = rendered.replace("{{CLIENT_PHONE}}", str(client_phone))
    rendered = rendered.replace("{{CARRIER_INFO}}", str(carrier_info))
    rendered = rendered.replace("{{AREA_INSPECTED}}", str(area_inspected))
    rendered = rendered.replace("{{LOSS_CATEGORY}}", str(loss_category))
    rendered = rendered.replace("{{DRY_TARGET_WME}}", str(dry_target))
    rendered = rendered.replace("{{STATUTORY_DISCLOSURE_TEXT}}", str(statutory_text))
    rendered = rendered.replace("{{TESTING_RECOMMENDATION_NOTE}}", str(testing_recommendation_note))
    rendered = rendered.replace("{{SCOPE_ROWS_HTML}}", scope_rows_html)
    rendered = rendered.replace("{{PROPOSED_COST_TEXT}}", str(proposed_cost_text))
    rendered = rendered.replace("{{TIER_NAME}}", str(tier_name))
    rendered = rendered.replace("{{SNAPPED_TIER_AMOUNT}}", tier_badge)
    rendered = rendered.replace("{{PRE1978_LEGAL_CLAUSE}}", pre1978_clause)

    sig_data = (
        job_state.get("customerSignature")
        or job_state.get("signatureDataUrl")
        or job_state.get("customer", {}).get("signature")
    )
    if sig_data:
        sig_html = f'<img src="{sig_data}" style="max-height: 30px; display: block; margin: 2px 0;" alt="Client Signature" />'
    else:
        sig_html = '<div class="signature-line"></div>'
    rendered = rendered.replace("{{SIGNATURE_BLOCK_HTML}}", sig_html)

    return rendered



def render_pdf_document(html_path: Path, pdf_path: Path) -> bool:
    """Attempts to render PDF via WeasyPrint or headless Chrome/Edge."""
    # 1. Try weasyprint (if installed in Linux container / Python environment)
    try:
        import weasyprint
        weasyprint.HTML(filename=str(html_path)).write_pdf(str(pdf_path))
        print(f"[OK] Rendered PDF via WeasyPrint: {pdf_path}")
        return True
    except ImportError:
        pass
    except Exception as e:
        print(f"Notice: WeasyPrint rendering error: {e}")

    # 2. Try headless Chrome or Edge
    browser_exe = None
    candidate_paths = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        "/usr/bin/google-chrome",
        "/usr/bin/chromium",
        "/usr/bin/chromium-browser",
    ]
    for p in candidate_paths:
        if os.path.exists(p):
            browser_exe = p
            break

    if browser_exe:
        abs_html = html_path.resolve()
        abs_pdf = pdf_path.resolve()
        cmd = [
            browser_exe,
            "--headless=new",
            "--disable-gpu",
            "--no-pdf-header-footer",
            f"--print-to-pdf={abs_pdf}",
            str(abs_html),
        ]
        try:
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=15)
            if res.returncode == 0 and abs_pdf.exists():
                print(f"[OK] Rendered print-ready PDF: {abs_pdf} ({abs_pdf.stat().st_size} bytes)")
                return True
            else:
                print(f"Browser PDF rendering returned code {res.returncode}: {res.stderr}")
        except Exception as e:
            print(f"Warning: Failed to render PDF via browser: {e}")
    else:
        print("Notice: No headless browser or WeasyPrint found. proposal.html is ready for Next.js window.print().")

    return False


def compile_proposal(
    job_state_path: Path = Path("job_state.json"),
    html_output_path: Path = Path("proposal.html"),
    pdf_output_path: Path = Path("proposal.pdf"),
    use_template: bool = True,
) -> Dict[str, Any]:
    """Compiles proposal HTML and prints PDF via headless browser or WeasyPrint."""
    if not job_state_path.exists():
        raise FileNotFoundError(f"State file {job_state_path} does not exist.")

    with open(job_state_path, "r", encoding="utf-8") as f:
        job_state = json.load(f)

    # Prefer pricing stamped on the job state by the live-scope route; fall back
    # to calculate_pricing only for legacy job_state.json files that lack it.
    scope_items = job_state.get("scopeItems") or []
    stamped = job_state.get("financialTier")
    if stamped and stamped.get("snappedTier"):
        pricing = {
            "lineItems": scope_items,
            "subtotal": stamped.get("subtotal", 0.0),
            "financialTier": stamped,
        }
    else:  # legacy job_state.json without stamped pricing
        pricing = calculate_pricing({"items": scope_items})

    # Generate HTML: prefer proposal_template.html if available and use_template is True
    template_file = Path("proposal_template.html")
    if use_template and template_file.exists():
        html_content = render_from_template(job_state, pricing, template_file)
    else:
        html_content = generate_html_proposal(job_state, pricing)

    html_output_path.write_text(html_content, encoding="utf-8")
    print(f"Generated HTML proposal: {html_output_path} ({len(html_content)} bytes)")

    # Render PDF
    render_pdf_document(html_output_path, pdf_output_path)

    return {
        "htmlPath": str(html_output_path),
        "pdfPath": str(pdf_output_path),
        "financialTier": pricing["financialTier"],
    }


if __name__ == "__main__":
    compile_proposal()

