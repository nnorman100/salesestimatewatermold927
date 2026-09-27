"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { setOptions, importLibrary } from "@googlemaps/js-api-loader";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  MapPin,
  Search,
  Loader2,
  CheckCircle2,
  AlertCircle,
  KeyRound,
  ExternalLink,
  ChevronDown,
  Building,
} from "lucide-react";

export interface ParsedAddressDetails {
  formattedAddress: string;
  streetNumber?: string;
  route?: string;
  city?: string;
  county?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  lat?: number;
  lng?: number;
  placeId?: string;
}

interface AddressProps {
  value: string;
  onChange: (address: string) => void;
  onPlaceSelect?: (details: ParsedAddressDetails) => void;
  disabled?: boolean;
}

export function GoogleAddressAutocomplete({
  value,
  onChange,
  onPlaceSelect,
  disabled = false,
}: AddressProps) {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState<google.maps.places.AutocompleteSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [apiStatus, setApiStatus] = useState<"idle" | "loading" | "ready" | "no_key" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showConfigGuide, setShowConfigGuide] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState<number>(-1);
  const [parsedLocation, setParsedLocation] = useState<ParsedAddressDetails | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const placesLibRef = useRef<google.maps.PlacesLibrary | null>(null);
  const sessionTokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

  // Keep query in sync if parent value updates externally
  useEffect(() => {
    if (value !== query && !isOpen) {
      setQuery(value || "");
    }
  }, [value, isOpen]);

  // Initialize Google Maps JavaScript API (Places library)
  useEffect(() => {
    if (!apiKey) {
      setApiStatus("no_key");
      return;
    }

    let isMounted = true;
    setApiStatus("loading");

    setOptions({
      key: apiKey,
      v: "weekly",
      solutionChannel: "gmp_git_agentskills_v1",
    });

    importLibrary("places")
      .then((placesLib) => {
        if (!isMounted) return;
        placesLibRef.current = placesLib;
        setApiStatus("ready");
        setErrorMessage(null);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error("Failed to load Google Maps Places Library:", err);
        setApiStatus("error");
        setErrorMessage(err?.message || "Failed to load Google Maps API");
      });

    return () => {
      isMounted = false;
    };
  }, [apiKey]);

  // Click outside listener to dismiss suggestion dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
        setSelectedIndex(-1);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Fetch suggestions with debouncing using Places API (New) AutocompleteSuggestion
  const fetchSuggestions = useCallback(
    async (inputStr: string) => {
      if (!inputStr || inputStr.trim().length < 3 || !placesLibRef.current) {
        setSuggestions([]);
        setIsOpen(false);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } = placesLibRef.current;

        // Generate or maintain active session token for cost-efficient session grouping
        if (!sessionTokenRef.current) {
          sessionTokenRef.current = new AutocompleteSessionToken();
        }

        const request: google.maps.places.AutocompleteRequest = {
          input: inputStr,
          sessionToken: sessionTokenRef.current,
          includedRegionCodes: ["us"], // Restrict to US locations
          // Mandatory attribution tracking per Google Maps Platform guidelines
          // @ts-ignore
          internalUsageAttributionIds: ["gmp_git_agentskills_v1"],
        };

        const response = await AutocompleteSuggestion.fetchAutocompleteSuggestions(request);
        setSuggestions(response.suggestions || []);
        setIsOpen((response.suggestions || []).length > 0);
        setSelectedIndex(-1);
      } catch (err: any) {
        console.warn("Autocomplete error:", err);
        setSuggestions([]);
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const handleInputChange = (text: string) => {
    setQuery(text);
    onChange(text);

    if (apiStatus !== "ready") return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      fetchSuggestions(text);
    }, 250);
  };

  // When technician picks a prediction
  const handleSelectSuggestion = async (suggestion: google.maps.places.AutocompleteSuggestion) => {
    if (!suggestion.placePrediction) return;

    setIsLoading(true);
    try {
      const place = suggestion.placePrediction.toPlace();

      // Fetch place fields using the existing session token
      await place.fetchFields({
        fields: ["displayName", "formattedAddress", "addressComponents", "location"],
      });

      const formatted = place.formattedAddress || suggestion.placePrediction.text.toString();
      setQuery(formatted);
      onChange(formatted);

      // Parse address components
      let streetNumber = "";
      let route = "";
      let city = "";
      let county = "";
      let state = "";
      let postalCode = "";
      let country = "";

      if (place.addressComponents) {
        for (const comp of place.addressComponents) {
          const types = comp.types || [];
          if (types.includes("street_number")) streetNumber = comp.longText || comp.shortText || "";
          if (types.includes("route")) route = comp.longText || comp.shortText || "";
          if (types.includes("locality")) city = comp.longText || comp.shortText || "";
          if (types.includes("administrative_area_level_2")) county = comp.longText || comp.shortText || "";
          if (types.includes("administrative_area_level_1")) state = comp.shortText || comp.longText || "";
          if (types.includes("postal_code")) postalCode = comp.longText || comp.shortText || "";
          if (types.includes("country")) country = comp.shortText || comp.longText || "";
        }
      }

      const parsed: ParsedAddressDetails = {
        formattedAddress: formatted,
        streetNumber,
        route,
        city,
        county,
        state,
        postalCode,
        country,
        lat: place.location?.lat(),
        lng: place.location?.lng(),
        placeId: suggestion.placePrediction.placeId,
      };

      setParsedLocation(parsed);
      if (onPlaceSelect) {
        onPlaceSelect(parsed);
      }

      // Reset session token after complete place detail selection (finishes billing session)
      sessionTokenRef.current = null;
      setSuggestions([]);
      setIsOpen(false);
    } catch (err) {
      console.error("Failed to fetch place details:", err);
      const fallback = suggestion.placePrediction.text.toString();
      setQuery(fallback);
      onChange(fallback);
      setIsOpen(false);
    } finally {
      setIsLoading(false);
    }
  };

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!isOpen || suggestions.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
    } else if (e.key === "Enter" && selectedIndex >= 0) {
      e.preventDefault();
      handleSelectSuggestion(suggestions[selectedIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  };

  const quickAddresses = [
    "1518 Old Stage St, Bakersfield, CA 93312",
    "1111 E Planz Rd, Bakersfield, CA 93307",
    "11411 Andretti Ave, Bakersfield, CA 93312",
    "6304 Ellis Ave, Bakersfield, CA 93309",
    "5 Shadowglen Way, Wofford Heights, CA 93285",
  ];

  return (
    <div ref={containerRef} className="space-y-1.5 relative">
      {/* Status Bar / API Indicator */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 mb-0.5">
        <div className="flex items-center space-x-1.5">
          {apiStatus === "ready" && (
            <span className="flex items-center text-emerald-600 font-medium space-x-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span>Google Places API Active</span>
            </span>
          )}
          {apiStatus === "loading" && (
            <span className="flex items-center text-blue-600 space-x-1">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Connecting to Google Places...</span>
            </span>
          )}
          {apiStatus === "no_key" && (
            <span className="flex items-center text-amber-600 space-x-1">
              <AlertCircle className="w-3.5 h-3.5 text-amber-500" />
              <span>Manual Entry (Places API Key not set)</span>
            </span>
          )}
          {apiStatus === "error" && (
            <span className="flex items-center text-red-600 space-x-1">
              <AlertCircle className="w-3.5 h-3.5" />
              <span>Places API Error (Falling back to manual)</span>
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowConfigGuide(!showConfigGuide)}
          className="text-slate-500 hover:text-slate-800 underline flex items-center space-x-1"
        >
          <KeyRound className="w-3 h-3" />
          <span>{showConfigGuide ? "Hide API Key setup" : "Where to add API Key?"}</span>
        </button>
      </div>

      {/* Guide Dropdown / Modal Banner */}
      {showConfigGuide && (
        <div className="p-3 bg-slate-900 text-slate-100 rounded-lg text-xs space-y-2 border border-slate-700 shadow-lg animate-in fade-in slide-in-from-top-1">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-semibold text-emerald-400 flex items-center gap-1.5">
              <KeyRound className="w-3.5 h-3.5" /> Google Places & Maps API Setup
            </span>
            <button
              onClick={() => setShowConfigGuide(false)}
              className="text-slate-400 hover:text-slate-200 text-xs px-1"
            >
              ✕
            </button>
          </div>

          <p className="text-slate-300 leading-relaxed">
            To enable real-time address suggestions and Google auto-populate:
          </p>

          <div className="space-y-1.5">
            <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[11px]">
              <span className="text-slate-400">1. Local Dev: Create or edit </span>
              <strong className="text-amber-300">.env.local</strong>:
              <div className="text-emerald-400 mt-1 select-all">
                NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=&quot;AIzaSy...YOUR_KEY&quot;
              </div>
            </div>

            <div className="bg-slate-950 p-2 rounded border border-slate-800 font-mono text-[11px]">
              <span className="text-slate-400">2. Production (Google Cloud Run):</span>
              <div className="text-emerald-400 mt-1 select-all break-all">
                gcloud run services update alert-disaster-field-estimator \<br />
                &nbsp;&nbsp;--project=mitigation-project \<br />
                &nbsp;&nbsp;--region=us-west2 \<br />
                &nbsp;&nbsp;--set-env-vars=NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=&quot;YOUR_KEY&quot;
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-400">
            <span>Required Google Cloud APIs: Places API (New), Maps JavaScript API</span>
            <a
              href="https://mapsplatform.google.com/maps-demo-key?utm_campaign=gmp_git_agentskills_v1"
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300 flex items-center gap-1 underline"
            >
              Instant Demo Key <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {/* Main Address Search Input */}
      <div className="relative">
        <MapPin className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Enter California property address (e.g. 1518 Old Stage St, Bakersfield)..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (suggestions.length > 0) setIsOpen(true);
          }}
          disabled={disabled}
          className="pl-9 pr-9"
          autoComplete="off"
        />
        <div className="absolute right-3 top-3">
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
          ) : (
            <Search className="h-4 w-4 text-slate-400" />
          )}
        </div>
      </div>

      {/* Live Google Places Predictions Dropdown */}
      {isOpen && suggestions.length > 0 && (
        <div className="absolute z-50 left-0 right-0 mt-1 bg-white rounded-md border border-slate-200 shadow-xl overflow-hidden divide-y divide-slate-100 max-h-72 overflow-y-auto">
          {suggestions.map((suggestion, index) => {
            const mainText = suggestion.placePrediction?.mainText?.toString() || "";
            const secondaryText = suggestion.placePrediction?.secondaryText?.toString() || "";
            const fullText = suggestion.placePrediction?.text?.toString() || "";
            const isSelected = index === selectedIndex;

            return (
              <div
                key={suggestion.placePrediction?.placeId || index}
                onMouseDown={() => handleSelectSuggestion(suggestion)}
                onMouseEnter={() => setSelectedIndex(index)}
                className={`p-2.5 cursor-pointer text-left transition flex items-start space-x-2.5 ${
                  isSelected ? "bg-blue-50 text-blue-900" : "hover:bg-slate-50 text-slate-800"
                }`}
              >
                <Building className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                <div className="flex-1 text-xs">
                  {mainText ? (
                    <>
                      <div className="font-semibold text-slate-900">{mainText}</div>
                      <div className="text-[11px] text-slate-500">{secondaryText}</div>
                    </>
                  ) : (
                    <div className="font-medium text-slate-800">{fullText}</div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Official Google Attribution Footer per Terms of Service */}
          <div className="bg-slate-50 px-3 py-1.5 flex justify-end items-center text-[10px] text-slate-400">
            <span>Powered by Google Places</span>
          </div>
        </div>
      )}

      {/* Verified Address Components Pill (if selected) */}
      {parsedLocation && (
        <div className="text-[11px] text-emerald-800 bg-emerald-50/80 border border-emerald-200 rounded px-2.5 py-1 flex items-center justify-between">
          <span className="flex items-center space-x-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              <strong>Verified:</strong> {parsedLocation.city || "City"},{" "}
              {parsedLocation.state || "CA"} {parsedLocation.postalCode || ""}
            </span>
          </span>
          {parsedLocation.lat && parsedLocation.lng && (
            <span className="text-[10px] text-emerald-600 font-mono">
              GPS: {parsedLocation.lat.toFixed(4)}, {parsedLocation.lng.toFixed(4)}
            </span>
          )}
        </div>
      )}

      {/* Quick Bakersfield & Kern County Presets */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1">
        <span className="text-[10px] text-slate-400 font-semibold self-center">
          Field Presets (Kern County):
        </span>
        {quickAddresses.map((addr) => {
          const street = addr.split(",")[0];
          const cityZip = addr.split(",")[1]?.trim();
          return (
            <button
              key={addr}
              type="button"
              onClick={() => {
                setQuery(addr);
                onChange(addr);
                setIsOpen(false);
              }}
              className="text-[10.5px] bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-0.5 rounded border border-slate-200 transition"
            >
              {street} ({cityZip})
            </button>
          );
        })}
      </div>
    </div>
  );
}
