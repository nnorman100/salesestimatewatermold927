/**
 * Alert Disaster Restoration Field Estimator
 * Complete TypeScript Type Contracts & Schemas
 */

export type WaterCategory = 'Category 1' | 'Category 2' | 'Category 3';
export type WaterClass = 'Class 1' | 'Class 2' | 'Class 3' | 'Class 4';
export type QualitativeMoistureLevel = 'Dry' | 'At Risk' | 'Wet' | 'Saturated';

export interface CustomerInfo {
  name: string;
  serviceAddress: string;
  phone: string;
  email: string;
  claimNumber?: string;
  carrier?: string;
  dateOfLoss: string;
  technician: string;
}

export interface PropertyMetadata {
  buildYear: number;
  isPre1978: boolean;
  asbestosLeadTestingMandated: boolean;
  statutoryCitations: string[];
  statutoryNotice: string;
  plumbingEra: string;
  forensicPlumbingDiagnostic: string;
}

export interface PsychrometricBaseline {
  unaffectedRoom: string;
  drywallBaselineWME: number;
  tempF: number;
  rhPercent: number;
  dewPointF?: number;
  humidityRatioGPP?: number;
}

export interface MoistureReadingRecord {
  id?: string;
  location: string;
  substrate: string;
  readingWME: number;
  classification: QualitativeMoistureLevel;
  thermalDeltaF?: number | null;
  notes?: string;
  timestamp?: string;
}

export interface DemolitionScope {
  floodCuts?: {
    heightFt: 2 | 4;
    linearFeet: number;
    locations: string;
  };
  baseboards?: {
    linearFeet: number;
    action: string;
  };
  flooring?: {
    substrate: string;
    squareFeet: number;
    action?: string;
  };
}

export interface CabinetryScope {
  item: string;
  action: 'Detach & Reset' | 'Tear Out & Dispose';
  waiver: string;
}

export interface EquipmentDeployment {
  type: 'Centrifugal Air Mover' | 'Low Grain Refrigerant (LGR) Dehumidifier' | 'HEPA 500 Air Scrubber' | string;
  count: number;
  days: number;
}

export interface ChamberScope {
  roomId: string;
  name: string;
  waterCategory: WaterCategory | string;
  waterClass: WaterClass | string;
  moistureReadings: MoistureReadingRecord[];
  demolition: DemolitionScope;
  cabinetry: CabinetryScope[];
  homeownerObligations: string[]; // Must be formatted with asterisks: *...*
  equipment: EquipmentDeployment[];
  verified: boolean;
  verificationSummary?: string;
}

export interface ScopeLineItem {
  key: string;
  description: string;
  quantity: number;
  qty?: number;
  days?: number | null;
  unit: 'LF' | 'SF' | 'EA' | 'Day';
  unitRate: number;
  lineTotal: number;
  notes?: string;
}

export interface FinancialTierInfo {
  subtotal: number;
  snappedTier: number;
  tierName: string;
  tierDescription: string;
  isCustomLargeLoss: boolean;
}

export interface JobState {
  lossId: string;
  inspectionDate: string;
  status: 'IN_PROGRESS' | 'COMPLETED';
  isAfterHours?: boolean;
  signature?: string;
  customer: CustomerInfo;
  property: PropertyMetadata;
  psychrometricBaseline: PsychrometricBaseline;
  chambers: ChamberScope[];
  scopeItems: ScopeLineItem[];
  financialTier: FinancialTierInfo;
}

export interface ScopingToolCall {
  tool:
    | 'add_room'
    | 'log_moisture_reading'
    | 'log_damage_observation'
    | 'upsert_scope_item'
    | 'verify_room_scope'
    | 'complete_walkthrough';
  args: Record<string, any>;
}

export interface ScopingTurnResponse {
  interpretedIntent: string;
  toolCalls: ScopingToolCall[];
  financialTier: {
    subtotal: number;
    snappedTier: number;
    tierName: string;
  };
  californiaCompliance: {
    isPre1978: boolean;
    testingMandated: boolean;
    statutoryCitations: string[];
  };
  spokenResponse: string;
}
