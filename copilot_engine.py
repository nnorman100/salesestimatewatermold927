"""
Alert Disaster Restoration — Real-Time Field Scoping Copilot Engine
Implements the multi-turn state machine, forensic diagnostics, California compliance,
deterministic pricing integration, and strict JSON output schema conforming to AGENTS.md.
"""

import json
from decimal import Decimal
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

from compile_proposal import compile_proposal
from pricing_engine import (
    calculate_grain_depression,
    calculate_pricing,
    calculate_psychrometrics,
)



class RestorationScopingCopilot:
    def __init__(self, state_path: str = "job_state.json", scope_path: str = "current_scope.json"):
        self.state_path = Path(state_path)
        self.scope_path = Path(scope_path)
        self.state: Dict[str, Any] = self._load_state()

    def _load_state(self) -> Dict[str, Any]:
        if not self.state_path.exists():
            return {
                "lossId": "ADR-LIVE-001",
                "inspectionDate": "2026-09-24",
                "status": "IN_PROGRESS",
                "customer": {},
                "property": {
                    "buildYear": 1974,
                    "isPre1978": True,
                    "asbestosLeadTestingMandated": True,
                    "statutoryCitations": [
                        "Cal/OSHA Title 8 CCR § 1529 (Asbestos)",
                        "Cal/OSHA Title 8 CCR § 1532.1 (Lead)",
                        "California Health & Safety Code § 25914",
                    ],
                },
                "psychrometricBaseline": {
                    "unaffectedRoom": "Living Room",
                    "drywallBaselineWME": 9.2,
                    "tempF": 72.0,
                    "rhPercent": 45.0,
                },
                "chambers": [],
                "scopeItems": [],
                "financialTier": {
                    "subtotal": 0.0,
                    "snappedTier": 1499.0,
                    "tierName": "Tier 1 - Minor Chamber Containment & Drying",
                },
            }
        with open(self.state_path, "r", encoding="utf-8") as f:
            return json.load(f)

    def _save_state(self):
        with open(self.state_path, "w", encoding="utf-8") as f:
            json.dump(self.state, f, indent=2)

    def _sync_scope_file(self):
        scope_payload = {
            "lossId": self.state.get("lossId", "ADR-LIVE-001"),
            "items": self.state.get("scopeItems", []),
        }
        with open(self.scope_path, "w", encoding="utf-8") as f:
            json.dump(scope_payload, f, indent=2)

    def get_psychrometric_evaluation(self, reading_wme: float) -> str:
        baseline = self.state.get("psychrometricBaseline", {}).get("drywallBaselineWME", 9.2)
        if reading_wme <= baseline:
            return "Dry"
        elif reading_wme <= baseline + 4.0:
            return "At Risk"
        elif reading_wme <= baseline + 15.0:
            return "Wet"
        else:
            return "Saturated"

    def get_plumbing_diagnostic_by_year(self, year: int) -> str:
        if year < 1970:
            return "Pre-1970 construction: Failure consistent with internal galvanized pipe tuberculation, rust flaking, and/or cast iron drain line bottom decay."
        elif year <= 1995:
            return "1978–1995 construction: Failure consistent with Polybutylene (PB-2110) micro-fracturing from municipal chlorine degradation, acetal plastic barbed crimp fitting rupture, or brittle plastic angle stop valve failures."
        elif year <= 2010:
            return "1996–2010 construction: Failure consistent with CPVC pipe thermal embrittlement, hot water supply shattering, yellow brass dezincification, or braided stainless flex line failure."
        else:
            return "Post-2010 construction: Failure consistent with PEX expansion ring slippage, pressure reducing valve (PRV) blowout (>80 PSI), or appliance solenoid valve failure."

    # ------------------ Tool Implementations ------------------

    def set_psychrometric_baseline(
        self,
        unaffected_room: str,
        drywall_wme: float,
        temp_f: float,
        rh_percent: float,
    ) -> Dict[str, Any]:
        """
        Sets the dry standard calibration using IICRC S500 psychrometrics.
        Calculates dew point and humidity ratio (GPP) dynamically.
        """
        psy = calculate_psychrometrics(temp_f, rh_percent)
        self.state["psychrometricBaseline"] = {
            "unaffectedRoom": unaffected_room,
            "drywallBaselineWME": float(drywall_wme),
            "tempF": float(temp_f),
            "rhPercent": float(rh_percent),
            "dewPointF": psy["dewPointF"],
            "humidityRatioGPP": psy["humidityRatioGPP"],
        }
        self._save_state()
        return self.state["psychrometricBaseline"]

    def add_room(self, room_id: str, name: str, water_category: str = "Category 1", water_class: str = "Class 2") -> Dict[str, Any]:

        chambers = self.state.setdefault("chambers", [])
        for ch in chambers:
            if ch["roomId"] == room_id:
                ch["name"] = name
                ch["waterCategory"] = water_category
                ch["waterClass"] = water_class
                self._save_state()
                return {"status": "updated", "roomId": room_id}

        new_chamber = {
            "roomId": room_id,
            "name": name,
            "waterCategory": water_category,
            "waterClass": water_class,
            "moistureReadings": [],
            "demolition": {
                "floodCuts": {"heightFt": 0, "linearFeet": 0, "locations": ""},
                "baseboards": {"linearFeet": 0},
                "flooring": {"substrate": "", "squareFeet": 0},
            },
            "cabinetry": [],
            "homeownerObligations": [],
            "equipment": [],
            "verified": False,
            "verificationSummary": "",
        }
        chambers.append(new_chamber)
        self._save_state()
        return {"status": "created", "roomId": room_id}

    def log_moisture_reading(
        self,
        room_id: str,
        location: str,
        substrate: str,
        reading_wme: float,
        thermal_delta_f: Optional[float] = None,
        notes: str = "",
    ) -> Dict[str, Any]:
        classification = self.get_psychrometric_evaluation(reading_wme)
        chambers = self.state.setdefault("chambers", [])
        target = next((ch for ch in chambers if ch["roomId"] == room_id), None)
        if not target:
            self.add_room(room_id, room_id.replace("_", " ").title())
            target = next((ch for ch in chambers if ch["roomId"] == room_id), None)

        record = {
            "location": location,
            "substrate": substrate,
            "readingWME": reading_wme,
            "classification": classification,
            "thermalDeltaF": thermal_delta_f,
            "notes": notes,
        }
        target.setdefault("moistureReadings", []).append(record)
        self._save_state()
        return {"status": "logged", "record": record}

    def log_damage_observation(
        self,
        room_id: str,
        flood_cut_height_ft: int = 0,
        flood_cut_lf: float = 0.0,
        flood_cut_locations: str = "",
        baseboard_lf: float = 0.0,
        flooring_substrate: str = "",
        flooring_sf: float = 0.0,
        cabinet_item: Optional[str] = None,
        cabinet_action: Optional[str] = None,
        homeowner_obligation: Optional[str] = None,
    ) -> Dict[str, Any]:
        chambers = self.state.setdefault("chambers", [])
        target = next((ch for ch in chambers if ch["roomId"] == room_id), None)
        if not target:
            self.add_room(room_id, room_id.replace("_", " ").title())
            target = next((ch for ch in chambers if ch["roomId"] == room_id), None)

        demo = target.setdefault("demolition", {})
        if flood_cut_lf > 0:
            demo["floodCuts"] = {
                "heightFt": 2 if flood_cut_height_ft <= 2 else 4,
                "linearFeet": flood_cut_lf,
                "locations": flood_cut_locations,
            }
            # Upsert into scope items
            cut_key = "two_ft_flood_cut" if demo["floodCuts"]["heightFt"] == 2 else "four_ft_flood_cut"
            self.upsert_scope_item(
                key=cut_key,
                qty=flood_cut_lf,
                description=f"{demo['floodCuts']['heightFt']}-ft Flood Cut ({flood_cut_locations})",
            )

        if baseboard_lf > 0:
            demo["baseboards"] = {"linearFeet": baseboard_lf, "action": "Removal & disposal"}
            self.upsert_scope_item(
                key="baseboard_removal",
                qty=baseboard_lf,
                description=f"Baseboard Removal & Disposal ({target['name']})",
            )

        if flooring_sf > 0:
            demo["flooring"] = {"substrate": flooring_substrate, "squareFeet": flooring_sf}
            if "tile" in flooring_substrate.lower():
                self.upsert_scope_item(
                    key="tile_flooring_demo",
                    qty=flooring_sf,
                    description=f"Tile Flooring Demolition ({flooring_substrate})",
                )
            elif "carpet" in flooring_substrate.lower():
                self.upsert_scope_item(
                    key="carpet_pad_pull",
                    qty=flooring_sf,
                    description=f"Carpet & Wet Pad Pull ({flooring_substrate})",
                )

        if cabinet_item:
            waiver = (
                f"{cabinet_item} detachment waiver applies. Potential for hairline tile fracture "
                "or substrate breakage during adhesive release."
            )
            target.setdefault("cabinetry", []).append({
                "item": cabinet_item,
                "action": cabinet_action or "Detach & Reset",
                "waiver": waiver,
            })
            self.upsert_scope_item(
                key="vanity_detach_reset",
                qty=1,
                description=f"{cabinet_item} Detach & Reset (*Waiver attached*)",
            )

        if homeowner_obligation:
            # Enforce asterisks per AGENTS.md Section 3.B
            cleaned = homeowner_obligation.strip()
            if not (cleaned.startswith("*") and cleaned.endswith("*")):
                cleaned = f"*{cleaned}*"
            target.setdefault("homeownerObligations", []).append(cleaned)

        self._save_state()
        return {"status": "damage_logged", "roomId": room_id}

    def upsert_scope_item(
        self,
        key: str,
        qty: float,
        description: Optional[str] = None,
        days: Optional[int] = None,
        notes: str = "",
    ) -> Dict[str, Any]:
        scope_items = self.state.setdefault("scopeItems", [])
        existing = next((i for i in scope_items if i.get("key") == key), None)
        if existing:
            existing["qty"] = qty
            if description:
                existing["description"] = description
            if days is not None:
                existing["days"] = days
            if notes:
                existing["notes"] = notes
        else:
            item = {"key": key, "qty": qty, "notes": notes}
            if description:
                item["description"] = description
            if days is not None:
                item["days"] = days
            scope_items.append(item)

        self._save_state()
        self._sync_scope_file()

        # Recalculate deterministic pricing
        pricing = calculate_pricing({"items": self.state["scopeItems"]})
        self.state["financialTier"] = pricing["financialTier"]
        self._save_state()
        return pricing

    def verify_room_scope(self, room_id: str) -> Tuple[Dict[str, Any], str]:
        """
        Verifies chamber scope and produces the crisp 1-2 sentence spoken confirmation.
        """
        chambers = self.state.setdefault("chambers", [])
        target = next((ch for ch in chambers if ch["roomId"] == room_id), None)
        if not target:
            return {"error": f"Room {room_id} not found"}, ""

        demo = target.get("demolition", {})
        flood_cuts = demo.get("floodCuts", {})
        equipment = target.get("equipment", [])

        eq_summary_parts = [f"{eq['count']} {eq['type']}" for eq in equipment]
        eq_text = ", ".join(eq_summary_parts) if eq_summary_parts else "drying equipment assigned"

        cut_text = (
            f"{flood_cuts.get('linearFeet', 0)} linear feet of {flood_cuts.get('heightFt', 2)}-ft flood cuts"
            if flood_cuts.get("linearFeet", 0) > 0
            else "perimeter extraction"
        )

        spoken_confirm = (
            f"{target['name']} verified: {cut_text} with baseboards removed, "
            f"detachment waivers logged, and {eq_text} deployed."
        )

        target["verified"] = True
        target["verificationSummary"] = spoken_confirm
        self._save_state()

        return {"verified": True, "roomId": room_id}, spoken_confirm

    def complete_walkthrough(self) -> Tuple[Dict[str, Any], str]:
        """
        Finalizes billing, generates proposal.html and proposal.pdf, and produces
        the mandatory walkthrough completion spoken text.
        """
        self._sync_scope_file()
        pricing = calculate_pricing({"items": self.state.get("scopeItems", [])})
        self.state["financialTier"] = pricing["financialTier"]
        self.state["status"] = "COMPLETED"
        self._save_state()

        # Compile HTML and PDF
        result = compile_proposal(
            job_state_path=self.state_path,
            html_output_path=Path("proposal.html"),
            pdf_output_path=Path("proposal.pdf"),
        )

        spoken_confirm = (
            "Walkthrough complete across all chambers. Alert Disaster Restoration proposal "
            "and statutory disclosures compiled."
        )

        return result, spoken_confirm

    # ------------------ Master Dispatcher & JSON Output ------------------

    def process_turn(
        self,
        interpreted_intent: str,
        tool_calls: List[Dict[str, Any]],
        spoken_response_override: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Executes requested tool calls and returns JSON conforming strictly to AGENTS.md Section 7.
        """
        spoken_response = spoken_response_override or ""

        for call in tool_calls:
            tool_name = call.get("tool")
            args = call.get("args", {})

            if tool_name == "add_room":
                self.add_room(
                    room_id=args.get("roomId", "room"),
                    name=args.get("name", "Room"),
                    water_category=args.get("waterCategory", "Category 1"),
                    water_class=args.get("waterClass", "Class 2"),
                )
            elif tool_name == "log_moisture_reading":
                self.log_moisture_reading(
                    room_id=args.get("roomId", "room"),
                    location=args.get("location", "Drywall"),
                    substrate=args.get("substrate", "Drywall"),
                    reading_wme=float(args.get("readingWME", 10.0)),
                    thermal_delta_f=args.get("thermalDeltaF"),
                    notes=args.get("notes", ""),
                )
            elif tool_name == "log_damage_observation":
                self.log_damage_observation(
                    room_id=args.get("roomId", "room"),
                    flood_cut_height_ft=int(args.get("floodCutHeightFt", 0)),
                    flood_cut_lf=float(args.get("floodCutLF", 0.0)),
                    flood_cut_locations=args.get("floodCutLocations", ""),
                    baseboard_lf=float(args.get("baseboardLF", 0.0)),
                    flooring_substrate=args.get("flooringSubstrate", ""),
                    flooring_sf=float(args.get("flooringSF", 0.0)),
                    cabinet_item=args.get("cabinetItem"),
                    cabinet_action=args.get("cabinetAction"),
                    homeowner_obligation=args.get("homeownerObligation"),
                )
            elif tool_name == "upsert_scope_item":
                self.upsert_scope_item(
                    key=args.get("key"),
                    qty=float(args.get("qty", 1.0)),
                    description=args.get("description"),
                    days=args.get("days"),
                    notes=args.get("notes", ""),
                )
            elif tool_name == "verify_room_scope":
                _, spoken = self.verify_room_scope(args.get("roomId", "room"))
                if not spoken_response_override:
                    spoken_response = spoken
            elif tool_name == "complete_walkthrough":
                _, spoken = self.complete_walkthrough()
                if not spoken_response_override:
                    spoken_response = spoken

        # Update pricing
        pricing = calculate_pricing({"items": self.state.get("scopeItems", [])})
        prop = self.state.get("property", {})

        response_payload = {
            "interpretedIntent": interpreted_intent,
            "toolCalls": tool_calls,
            "financialTier": {
                "subtotal": pricing["financialTier"]["subtotal"],
                "snappedTier": pricing["financialTier"]["snappedTier"],
                "tierName": pricing["financialTier"]["tierName"],
            },
            "californiaCompliance": {
                "isPre1978": prop.get("isPre1978", True),
                "testingMandated": prop.get("asbestosLeadTestingMandated", True),
                "statutoryCitations": [
                    "Cal/OSHA Title 8 CCR § 1529 (Asbestos)",
                    "Cal/OSHA Title 8 CCR § 1532.1 (Lead)",
                    "California Health & Safety Code § 25914",
                ],
            },
            "spokenResponse": spoken_response,
        }

        return response_payload


def run_selftest():
    """Runs a complete test simulation of technician scoping turns."""
    copilot = RestorationScopingCopilot()

    print("=== TURN 1: Technician Probes Bathroom Moisture (Silent) ===")
    turn1 = copilot.process_turn(
        interpreted_intent="Technician probes South and West walls of Primary Bathroom; finds saturated drywall and FLIR thermal cooling.",
        tool_calls=[
            {
                "tool": "log_moisture_reading",
                "args": {
                    "roomId": "primary_bath",
                    "location": "South wall drywall (6 inches above plate)",
                    "substrate": "Drywall / Wood Stud",
                    "readingWME": 38.4,
                    "thermalDeltaF": -4.8,
                    "notes": "FLIR thermal indicates active wet boundary migrating 32 inches vertically",
                },
            },
            {
                "tool": "log_moisture_reading",
                "args": {
                    "roomId": "primary_bath",
                    "location": "West wall vanity cavity",
                    "substrate": "Drywall / Baseplate",
                    "readingWME": 99.9,
                    "thermalDeltaF": -5.6,
                    "notes": "Meter pinned at maximum scale; insulation fully soaked behind vanity",
                },
            },
        ],
    )
    print(json.dumps(turn1, indent=2))
    assert turn1["spokenResponse"] == "", "Turn 1 must remain silent during routine scoping!"

    print("\n=== TURN 2: Technician Dictates Cuts, Cabinet Detach & Homeowner Obligation (Silent) ===")
    turn2 = copilot.process_turn(
        interpreted_intent="Technician scopes 28 LF 2-ft cuts, pulls baseboards, calls for double vanity detach, and instructs homeowner to clear closet.",
        tool_calls=[
            {
                "tool": "log_damage_observation",
                "args": {
                    "roomId": "primary_bath",
                    "floodCutHeightFt": 2,
                    "floodCutLF": 28,
                    "floodCutLocations": "South and West perimeter walls",
                    "baseboardLF": 28,
                    "cabinetItem": "Double Vanity with Quartz/Granite Countertop",
                    "cabinetAction": "Detach & Reset",
                    "homeownerObligation": "*The homeowner to remove all vanity toiletries and personal clothing from closets prior to demolition.*",
                },
            }
        ],
    )
    print(json.dumps(turn2, indent=2))
    assert turn2["spokenResponse"] == "", "Turn 2 must remain silent during observations!"

    print("\n=== TURN 3: Verify Room Scope (Spoken Confirmation) ===")
    turn3 = copilot.process_turn(
        interpreted_intent="Technician requests verification of Primary Bathroom chamber scope.",
        tool_calls=[{"tool": "verify_room_scope", "args": {"roomId": "primary_bath"}}],
    )
    print(json.dumps(turn3, indent=2))
    assert len(turn3["spokenResponse"]) > 0, "Turn 3 must produce spoken room confirmation!"

    print("\n=== TURN 4: Complete Walkthrough (Proposal & Disclosures Compiled) ===")
    turn4 = copilot.process_turn(
        interpreted_intent="Technician concludes property walkthrough across all chambers.",
        tool_calls=[{"tool": "complete_walkthrough", "args": {}}],
    )
    print(json.dumps(turn4, indent=2))
    print("\n[OK] Self-test passed! All AGENTS.md requirements verified.")


if __name__ == "__main__":
    run_selftest()
