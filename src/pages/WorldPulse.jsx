import React, { startTransition, useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  BookOpenText,
  CheckCircle2,
  Expand,
  FlaskConical,
  Globe2,
  Minimize2,
  ShieldAlert,
  Sparkles,
  X,
} from "lucide-react";
import GlobeMap from "@/components/worldpulse/GlobeMap";
import DevelopmentStoryGraph from "@/components/worldpulse/DevelopmentStoryGraph";
import CountryRelationPanel from "@/components/worldpulse/CountryRelationPanel";
import WorldPulseHero from "@/components/worldpulse/WorldPulseHero";
import NewsNavigatorPanel from "@/components/worldpulse/NewsNavigatorPanel";
import KeywordHighlighter from "@/components/worldpulse/KeywordHighlighter";
import { StatBadge } from "@/components/premium/SurfaceCard";
import {
  fetchBriefingFeedStatus,
  fetchCountryDataProof,
  fetchCountryRelation,
  fetchDailyBriefing,
  fetchDevelopmentDetail,
  getCachedBriefingFeedStatus,
  getCachedDailyBriefing,
  getCachedDevelopmentDetail,
} from "@/api/atlasClient";

const PANEL_CLASS = "rounded-2xl border border-white/10";

function toNumeric(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function formatClock(value) {
  if (!value) return "--";
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function publicLensText(value) {
  const text = String(value || "").trim();
  if (!text) return "This signal can affect borrowing costs, prices, and overall market confidence.";
  return text
    .replace(/duration/gi, "bond prices")
    .replace(/liquidity/gi, "cash availability")
    .replace(/volatility/gi, "price swings")
    .replace(/reprice|repricing/gi, "reset")
    .replace(/FX/gi, "currencies");
}

function toConciseSentence(value, maxWords = 16) {
  const words = String(value || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (!words.length) return "";
  if (words.length <= maxWords) return words.join(" ");
  return `${words.slice(0, maxWords).join(" ")}...`;
}

function toActionCue(value) {
  const text = String(value || "").toLowerCase();
  if (/(inflation|price|oil|energy|commodity)/.test(text)) return "Watch inflation-sensitive assets and revise cost assumptions.";
  if (/(rate|yield|policy|treasury|bond)/.test(text)) return "Review duration exposure and policy-sensitive rate risk.";
  if (/(currency|fx|dollar|yen|euro)/.test(text)) return "Recheck currency hedges and cross-border cash flows.";
  if (/(credit|spread|liquidity|funding)/.test(text)) return "Tighten liquidity buffers and monitor credit spreads.";
  if (/(equity|earnings|valuation|volatility|risk)/.test(text)) return "Reduce concentration risk and stress-test downside scenarios.";
  return "Monitor headline risk and keep contingency actions ready.";
}

function playbookSeverityTone(severity) {
  const level = String(severity || "").toLowerCase();
  if (level === "critical") return "border-rose-300/45 text-rose-100";
  if (level === "high") return "border-amber-300/45 text-amber-100";
  if (level === "medium") return "border-yellow-300/45 text-yellow-100";
  return "border-cyan-300/35 text-cyan-100";
}

function severityToProbability(severity) {
  const level = String(severity || "").toLowerCase();
  if (level === "critical") return 82;
  if (level === "high") return 69;
  if (level === "medium") return 54;
  return 38;
}

function probabilityBand(probability) {
  const value = toNumeric(probability);
  if (value >= 70) return "High";
  if (value >= 50) return "Medium";
  return "Low";
}

function directionFromText(value) {
  const text = String(value || "").toLowerCase();
  if (/(rise|higher|up|increase|accelerat|hotter|tighten)/.test(text)) return "Rising";
  if (/(fall|lower|cool|ease|declin|softer)/.test(text)) return "Falling";
  return "Stable";
}

function RiskPlaybookProbabilityGraph({ items, activeId, onSelect }) {
  if (!items.length) {
    return (
      <div className="rounded-lg border border-white/12 bg-white/[0.03] px-2.5 py-2 text-[11px] text-zinc-400">
        Waiting for risk probabilities.
      </div>
    );
  }

  const width = 600;
  const height = 160;
  const paddingX = 18;
  const paddingTop = 16;
  const paddingBottom = 26;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingTop - paddingBottom;
  const spacing = items.length > 1 ? innerWidth / (items.length - 1) : innerWidth / 2;

  const points = items.map((item, index) => {
    const x = paddingX + spacing * index;
    const y = paddingTop + (1 - toNumeric(item.probability) / 100) * innerHeight;
    return { ...item, x, y };
  });
  const path = points.map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`).join(" ");

  return (
    <div className="rounded-xl border border-white/12 bg-black/30 p-2.5">
      <div className="mb-2 text-[10px] uppercase tracking-[0.1em] text-zinc-500">Probability Trail (Interactive)</div>
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full">
        <defs>
          <linearGradient id="risk-playbook-line" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#67e8f9" />
            <stop offset="100%" stopColor="#fda4af" />
          </linearGradient>
        </defs>
        {[25, 50, 75].map((level) => {
          const y = paddingTop + (1 - level / 100) * innerHeight;
          return <line key={`grid-${level}`} x1={paddingX} y1={y} x2={width - paddingX} y2={y} stroke="rgba(255,255,255,0.16)" strokeDasharray="3 3" />;
        })}
        <path d={path} fill="none" stroke="url(#risk-playbook-line)" strokeWidth="2.2" />
        {points.map((point) => {
          const active = point.id === activeId;
          return (
            <g key={point.id} className="cursor-pointer" onClick={() => onSelect(point.id)}>
              <circle cx={point.x} cy={point.y} r={active ? 6 : 4.5} fill={active ? "#f8fafc" : "#67e8f9"} />
              <text x={point.x} y={height - 8} textAnchor="middle" fill="rgba(228,228,231,0.9)" fontSize="10">
                {Math.round(point.probability)}%
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function ProofConsoleOverlay({ open, onToggle, onClose, selectedProof, healthySources, totalSources, feedStatus }) {
  return (
    <div className="pointer-events-none fixed bottom-5 right-4 z-[65] flex max-w-[94vw] flex-col items-end gap-3">
      <AnimatePresence>
        {open ? (
          <motion.div
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className="pointer-events-auto w-[min(430px,calc(100vw-1.5rem))] rounded-2xl border border-white/15 bg-black/45 p-4 shadow-[0_18px_48px_rgba(0,0,0,0.45)] backdrop-blur-xl"
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <CheckCircle2 className="h-4 w-4 text-zinc-200" />
                Proof Console
              </div>
              <button
                type="button"
                onClick={onClose}
                className="atlas-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.04] text-zinc-300 transition hover:bg-white/[0.08] hover:text-zinc-100"
                aria-label="Close proof console"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {selectedProof ? (
              <div className="space-y-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Executive Readout</div>
                  <div className="mt-1 text-sm leading-relaxed text-zinc-200">{selectedProof.conclusion.story}</div>
                  <div className="mt-1 text-[11px] leading-relaxed text-zinc-400">{selectedProof.conclusion.why_now}</div>
                </div>

                <div className="border-t border-white/10 pt-3">
                  <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Source Evidence</div>
                  <div className="mt-1 max-h-[180px] space-y-2 overflow-auto pr-1">
                    {(selectedProof.source_evidence || []).slice(0, 4).map((source) => (
                      <a
                        key={source.article_id}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-md border border-white/12 bg-white/[0.02] px-2.5 py-2 transition hover:border-white/25 hover:bg-white/[0.05]"
                      >
                        <div className="text-[11px] text-zinc-200">{source.title}</div>
                        <div className="mt-1 text-[10px] text-zinc-500">
                          {source.source} | {new Date(source.published_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </div>
                      </a>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-3 border-t border-white/10 pt-3 sm:grid-cols-2">
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Signal Validation</div>
                    {(selectedProof.model_evidence || []).slice(0, 1).map((row, idx) => (
                      <div key={`signal-validation-${idx}`} className="mt-1 text-[11px] leading-relaxed text-zinc-300">
                        <div className="font-semibold text-zinc-100">Confidence {(row.score_confidence * 100).toFixed(0)}%</div>
                        <div className="text-zinc-500">Top signals: {(row.top_features || []).slice(0, 3).join(", ") || "n/a"}</div>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Market Signals</div>
                    <div className="mt-1 space-y-1">
                      {(selectedProof.market_evidence || []).slice(0, 2).map((item, idx) => (
                        <div key={`${item.signal}-${idx}`} className="text-[11px] leading-relaxed text-zinc-300">
                          <span className="font-medium text-zinc-100">{item.signal}</span>: {item.value} ({item.interpretation})
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/10 pt-2 text-xs text-zinc-400">
                  <span className={healthySources > 0 ? "text-emerald-200" : "text-amber-200"}>
                    {healthySources}/{totalSources || 0}
                  </span>{" "}
                  reliable sources healthy. Polling every {feedStatus?.polling_interval_seconds || 60}s.
                </div>
              </div>
            ) : (
              <div className="text-xs text-zinc-500">Proof data unavailable.</div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      <button
        type="button"
        onClick={onToggle}
        className="pointer-events-auto atlas-focus-ring inline-flex items-center gap-2 rounded-full border border-white/20 bg-black/35 px-4 py-2 text-xs font-medium uppercase tracking-[0.12em] text-zinc-100 transition hover:bg-black/55"
      >
        <CheckCircle2 className="h-4 w-4" />
        <span>{open ? "Hide Proof Console" : "Proof Console"}</span>
      </button>
    </div>
  );
}

function CountryIntelCard({ country, intelRows, healthySources, totalSources, countryProof, isLoadingProof, onClose }) {
  if (!country) return null;

  return (
    <div className="absolute bottom-5 left-5 z-[1300] w-[min(430px,calc(100%-2.5rem))] overflow-hidden rounded-2xl border border-white/15 bg-black/70 p-4 shadow-[0_24px_54px_rgba(0,0,0,0.55)] backdrop-blur-xl">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-[10px] uppercase tracking-[0.14em] text-zinc-500">Country Intelligence</div>
          <div className="mt-1 flex items-center gap-2 text-base font-semibold text-zinc-100">
            <Globe2 className="h-4 w-4 text-zinc-300" />
            {country.name}
          </div>
          <div className="mt-1 text-[11px] text-zinc-400">
            Heat {country.heat}/100 | Confidence {country.confidence}%
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="atlas-focus-ring inline-flex h-7 w-7 items-center justify-center rounded-full border border-white/15 bg-white/[0.05] text-zinc-300 transition hover:bg-white/[0.12] hover:text-zinc-100"
          aria-label="Close country intelligence"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <p className="mt-3 text-[12px] leading-relaxed text-zinc-300">{country.narrative}</p>

      <div className="mt-3 rounded-lg border border-white/12 bg-white/[0.03] p-2.5">
        <div className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Reliable Feed Snapshot</div>
        <div className="mt-1 text-[11px] text-zinc-300">
          {healthySources}/{totalSources || "--"} healthy sources powering briefing evidence.
        </div>
      </div>

      <div className="mt-3">
        <div className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Latest News Evidence</div>
        <div className="mt-1.5 max-h-[190px] space-y-2 overflow-auto pr-1">
          {intelRows.length ? (
            intelRows.map((item) => (
              <a
                key={item.article_id}
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="block rounded-lg border border-white/12 bg-white/[0.03] px-2.5 py-2 transition hover:border-white/25 hover:bg-white/[0.08]"
              >
                <div className="line-clamp-2 text-[11px] text-zinc-100">{item.title}</div>
                <div className="mt-1 text-[10px] text-zinc-500">
                  {item.source} | {item.developmentLabel || "Signal Desk"} |{" "}
                  {new Date(item.published_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                </div>
              </a>
            ))
          ) : (
            <div className="text-[11px] text-zinc-500">No verified country-specific source rows yet.</div>
          )}
        </div>
      </div>

      <div className="mt-3 border-t border-white/10 pt-3">
        <div className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Backend Data Proof</div>
        {isLoadingProof ? (
          <div className="mt-1 text-[11px] text-zinc-500">Loading source provenance...</div>
        ) : (
          <div className="mt-1 space-y-1">
            <div className="text-[11px] text-zinc-400">{countryProof?.methodology || "Deterministic proof unavailable."}</div>
            {(countryProof?.sources || []).slice(0, 3).map((source) => (
              <a
                key={source.url}
                href={source.url}
                target="_blank"
                rel="noreferrer"
                className="block text-[11px] text-zinc-300 transition hover:text-zinc-100"
              >
                {source.name}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorldPulse({ embedded = false }) {
  const cachedDailyBrief = getCachedDailyBriefing();
  const cachedFeedStatus = getCachedBriefingFeedStatus();

  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [selectedDevelopmentLabel, setSelectedDevelopmentLabel] = useState("");
  const [selectedGraphNode, setSelectedGraphNode] = useState(null);
  const [mapStartCountry, setMapStartCountry] = useState(null);
  const [mapEndCountry, setMapEndCountry] = useState(null);
  const [mapSelectionMode, setMapSelectionMode] = useState(null);
  const [focusedCountry, setFocusedCountry] = useState(null);
  const [mapFullscreenOpen, setMapFullscreenOpen] = useState(false);
  const [proofConsoleOpen, setProofConsoleOpen] = useState(false);
  const [navigatorHeadline, setNavigatorHeadline] = useState(null);
  const [navigatorHighlights, setNavigatorHighlights] = useState([]);
  const [activeRiskPlaybookId, setActiveRiskPlaybookId] = useState("");

  const { data, isLoading, isError, error, isFetching } = useQuery({
    queryKey: ["briefing-daily"],
    queryFn: () => fetchDailyBriefing({ windowHours: 72, limit: 6 }),
    initialData: cachedDailyBrief || undefined,
    staleTime: 12 * 1000,
    refetchInterval: 15000,
  });

  const { data: feedStatusData } = useQuery({
    queryKey: ["briefing-feed-status", 72],
    queryFn: () => fetchBriefingFeedStatus({ windowHours: 72 }),
    initialData: cachedFeedStatus || data?.feed_status || undefined,
    staleTime: 15 * 1000,
    refetchInterval: 20000,
  });

  const developments = data?.developments ?? [];
  const selectedDevelopmentBase = useMemo(() => {
    if (!developments.length) return null;
    if (!selectedDevelopmentId) return developments[0];
    return developments.find((item) => item.development_id === selectedDevelopmentId) || developments[0];
  }, [developments, selectedDevelopmentId]);

  const cachedDevelopmentDetail = selectedDevelopmentId ? getCachedDevelopmentDetail(selectedDevelopmentId) : null;
  const { data: developmentDetail, isFetching: isFetchingDevelopmentDetail } = useQuery({
    queryKey: ["briefing-development-detail", selectedDevelopmentId],
    queryFn: () => fetchDevelopmentDetail(selectedDevelopmentId),
    enabled: Boolean(selectedDevelopmentId),
    initialData: cachedDevelopmentDetail || undefined,
    staleTime: 20 * 1000,
    refetchInterval: selectedDevelopmentId ? 25000 : false,
  });

  useEffect(() => {
    if (!developments.length) {
      setSelectedDevelopmentId("");
      setSelectedThemeId("");
      setSelectedDevelopmentLabel("");
      return;
    }
    if (selectedDevelopmentId && developments.some((item) => item.development_id === selectedDevelopmentId)) {
      return;
    }

    if (selectedThemeId) {
      const themeMatch = developments.find((item) => item.theme_id === selectedThemeId);
      if (themeMatch) {
        setSelectedDevelopmentId(themeMatch.development_id);
        setSelectedThemeId(themeMatch.theme_id || "");
        setSelectedDevelopmentLabel(themeMatch.label || themeMatch.title || "");
        return;
      }
    }

    if (selectedDevelopmentLabel) {
      const labelNeedle = String(selectedDevelopmentLabel).toLowerCase().trim();
      const labelMatch = developments.find((item) => {
        const label = String(item.label || item.title || "").toLowerCase().trim();
        return label === labelNeedle;
      });
      if (labelMatch) {
        setSelectedDevelopmentId(labelMatch.development_id);
        setSelectedThemeId(labelMatch.theme_id || "");
        setSelectedDevelopmentLabel(labelMatch.label || labelMatch.title || "");
        return;
      }
    }

    setSelectedDevelopmentId(developments[0].development_id);
    setSelectedThemeId(developments[0].theme_id);
    setSelectedDevelopmentLabel(developments[0].label || developments[0].title || "");
  }, [developments, selectedDevelopmentId, selectedThemeId, selectedDevelopmentLabel]);

  useEffect(() => {
    setSelectedGraphNode(null);
  }, [selectedDevelopmentId]);

  const selectedDevelopment = developmentDetail?.development || selectedDevelopmentBase;
  const feedStatus = feedStatusData || data?.feed_status;
  const sourceRows = Array.isArray(feedStatus?.sources) ? feedStatus.sources : [];

  const derivedHealthySources = sourceRows.filter((row) => Boolean(row?.is_healthy ?? row?.isHealthy)).length;
  const healthySources = toNumeric(feedStatus?.healthy_sources ?? feedStatus?.healthySources, derivedHealthySources);
  const totalSources = toNumeric(feedStatus?.total_sources ?? feedStatus?.totalSources, sourceRows.length);
  const selectedProof = selectedDevelopment?.proof_bundle;

  useEffect(() => {
    if (!selectedProof) {
      setProofConsoleOpen(false);
    }
  }, [selectedProof]);

  useEffect(() => {
    if (!mapFullscreenOpen) return undefined;
    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setMapFullscreenOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [mapFullscreenOpen]);

  const signalDeskRows = useMemo(() => {
    const rows = [];
    const seen = new Set();

    developments.forEach((development) => {
      (development?.proof_bundle?.source_evidence || []).forEach((item) => {
        const articleId = item?.article_id;
        if (!articleId || seen.has(articleId)) {
          return;
        }
        seen.add(articleId);
        rows.push({
          ...item,
          developmentLabel: development.label,
          publishedTs: Date.parse(item.published_at) || 0,
        });
      });
    });

    return rows.sort((a, b) => b.publishedTs - a.publishedTs).slice(0, 10);
  }, [developments]);

  const healthySourceSet = useMemo(() => {
    return new Set(
      sourceRows
        .filter((row) => Boolean(row?.is_healthy ?? row?.isHealthy))
        .map((row) => String(row?.source || "").toLowerCase())
        .filter(Boolean),
    );
  }, [sourceRows]);

  const spilloverHotspots = data?.spillover_map?.hotspots || [];
  const spilloverArcs = data?.spillover_map?.arcs || [];
  const spilloverHotspotById = useMemo(() => {
    return new Map(spilloverHotspots.map((spot) => [String(spot.id || ""), spot]));
  }, [spilloverHotspots]);
  const spilloverHotspotOptions = useMemo(() => {
    return [...spilloverHotspots].sort((left, right) => String(left?.name || "").localeCompare(String(right?.name || "")));
  }, [spilloverHotspots]);

  const countryIntelRows = useMemo(() => {
    if (!focusedCountry?.name) return [];
    const countryNeedle = focusedCountry.name.toLowerCase();
    const seen = new Set();
    const matched = [];

    developments.forEach((development) => {
      (development?.proof_bundle?.source_evidence || []).forEach((item) => {
        const articleId = item?.article_id;
        if (!articleId || seen.has(articleId)) return;

        const title = String(item?.title || "").toLowerCase();
        const snippet = String(item?.snippet || "").toLowerCase();
        if (!title.includes(countryNeedle) && !snippet.includes(countryNeedle)) return;

        const sourceName = String(item?.source || "").toLowerCase();
        if (healthySourceSet.size && !healthySourceSet.has(sourceName)) return;

        seen.add(articleId);
        matched.push({
          ...item,
          developmentLabel: development.label,
        });
      });
    });

    if (matched.length) {
      return matched
        .sort((a, b) => (Date.parse(b.published_at) || 0) - (Date.parse(a.published_at) || 0))
        .slice(0, 5);
    }

    return signalDeskRows
      .filter((row) => {
        if (!healthySourceSet.size) return true;
        return healthySourceSet.has(String(row?.source || "").toLowerCase());
      })
      .slice(0, 5);
  }, [focusedCountry, developments, healthySourceSet, signalDeskRows]);

  const { data: countryProof, isFetching: isFetchingCountryProof } = useQuery({
    queryKey: ["world-pulse-country-proof", focusedCountry?.id],
    queryFn: () => fetchCountryDataProof(focusedCountry.id),
    enabled: Boolean(focusedCountry?.id),
    staleTime: 20 * 1000,
  });

  const { data: relationData, isFetching: isFetchingRelation } = useQuery({
    queryKey: ["country-relation", mapStartCountry?.id, mapEndCountry?.id],
    queryFn: () => fetchCountryRelation(mapStartCountry.id, mapEndCountry.id),
    enabled: Boolean(mapStartCountry?.id && mapEndCountry?.id),
    staleTime: 20 * 1000,
  });

  const manualArc = useMemo(() => {
    if (relationData?.arc?.from && relationData?.arc?.to) {
      return relationData.arc;
    }
    if (mapStartCountry?.id && mapEndCountry?.id) {
      return {
        from: mapStartCountry.id,
        to: mapEndCountry.id,
        color: "#fafafa",
      };
    }
    return null;
  }, [mapStartCountry, mapEndCountry, relationData]);

  useEffect(() => {
    if (mapStartCountry?.id && !spilloverHotspotById.has(String(mapStartCountry.id))) {
      setMapStartCountry(null);
    }
    if (mapEndCountry?.id && !spilloverHotspotById.has(String(mapEndCountry.id))) {
      setMapEndCountry(null);
    }
    if (focusedCountry?.id && !spilloverHotspotById.has(String(focusedCountry.id))) {
      setFocusedCountry(null);
    }
  }, [mapStartCountry, mapEndCountry, focusedCountry, spilloverHotspotById]);

  const handleSelectCountry = (spot) => {
    if (!spot) return;
    setFocusedCountry(spot);

    if (mapSelectionMode === "start") {
      setMapStartCountry(spot);
      if (mapEndCountry?.id === spot.id) {
        setMapEndCountry(null);
      }
      setMapSelectionMode(null);
      return;
    }

    if (mapSelectionMode === "end") {
      if (mapStartCountry?.id === spot.id) {
        setMapEndCountry(null);
      } else {
        setMapEndCountry(spot);
      }
      setMapSelectionMode(null);
      return;
    }
  };

  const setMapStartById = (countryId) => {
    setMapSelectionMode(null);
    const key = String(countryId || "").trim();
    if (!key) {
      setMapStartCountry(null);
      return;
    }
    const spot = spilloverHotspotById.get(key);
    if (!spot) return;
    setMapStartCountry(spot);
    if (mapEndCountry?.id === spot.id) {
      setMapEndCountry(null);
    }
    setFocusedCountry(spot);
  };

  const setMapEndById = (countryId) => {
    setMapSelectionMode(null);
    const key = String(countryId || "").trim();
    if (!key) {
      setMapEndCountry(null);
      return;
    }
    const spot = spilloverHotspotById.get(key);
    if (!spot) return;
    if (mapStartCountry?.id === spot.id) {
      setMapEndCountry(null);
      setFocusedCountry(spot);
      return;
    }
    setMapEndCountry(spot);
    setFocusedCountry(spot);
  };

  const clearMapSelection = () => {
    setMapStartCountry(null);
    setMapEndCountry(null);
    setFocusedCountry(null);
    setMapSelectionMode(null);
  };

  const clearMapRelation = () => {
    setMapEndCountry(null);
  };

  const scenarioTarget = selectedDevelopment?.development_id
    ? `/?development_id=${encodeURIComponent(selectedDevelopment.development_id)}#scenario-lab`
    : "/#scenario-lab";

  const handleThemeSelectionFromNavigator = (themeId, headline, analysis) => {
    if (headline) {
      setNavigatorHeadline(headline);
    }
    if (analysis?.highlights) {
      setNavigatorHighlights(analysis.highlights);
    }
    if (!themeId) return;

    const match = developments.find((item) => item.theme_id === themeId);
    if (!match) return;
    if (match.development_id === selectedDevelopmentId) return;

    startTransition(() => {
      setSelectedDevelopmentId(match.development_id);
      setSelectedThemeId(match.theme_id || "");
      setSelectedDevelopmentLabel(match.label || match.title || "");
    });
  };

  const handleHeadlineSelectionFromNavigator = ({ headline, analysis }) => {
    if (headline) {
      setNavigatorHeadline(headline);
      if (headline.theme_id) {
        handleThemeSelectionFromNavigator(headline.theme_id, headline, analysis || null);
      }
    }
    if (analysis?.highlights) {
      setNavigatorHighlights(analysis.highlights);
    }
  };

  const displayedHeadlineTitle = navigatorHeadline?.title || selectedDevelopment?.title || "";
  const displayedNarrative =
    navigatorHeadline?.summary || selectedDevelopment?.narrative_story || selectedDevelopment?.executive_summary || "";

  const whatThisMeansItems = useMemo(() => {
    if (!selectedDevelopment) return [];
    if (selectedGraphNode) {
      const detail = selectedGraphNode.detail || "";
      return [
        {
          id: `focused-${selectedGraphNode.node_id || selectedGraphNode.label}`,
          title: selectedGraphNode.label || "Focused signal",
          insight: toConciseSentence(publicLensText(detail), 20),
          action: toActionCue(detail),
        },
      ];
    }
    return (selectedDevelopment.causal_chain || []).slice(0, 3).map((step) => ({
      id: `${selectedDevelopment.development_id}-step-${step.step}`,
      title: step.title || `Step ${step.step}`,
      insight: toConciseSentence(publicLensText(step.detail), 20),
      action: toActionCue(step.detail),
    }));
  }, [selectedDevelopment, selectedGraphNode]);

  const riskPlaybookItems = useMemo(() => {
    if (!selectedDevelopment) return [];
    const riskRows = (selectedDevelopment.risk_implications || []).slice(0, 3).map((item, idx) => ({
      id: `${selectedDevelopment.development_id}-risk-${idx}`,
      title: `${item.asset_class || "Cross-asset"} | ${item.direction || "monitor"}`,
      insight: toConciseSentence(item.rationale, 18),
      action: toActionCue(item.rationale),
      severity: String(item.severity || "medium").toLowerCase(),
      direction: directionFromText(item.rationale),
      probability: severityToProbability(item.severity),
      confidence: Math.min(95, 58 + idx * 8),
    }));
    const actionRows = (selectedDevelopment.recommended_actions || []).slice(0, 2).map((item, idx) => ({
      id: `${selectedDevelopment.development_id}-recommended-${idx}`,
      title: "Recommended action",
      insight: toConciseSentence(item.action, 18),
      action: toConciseSentence(item.rationale || item.action, 16) || "Apply this action with local risk limits.",
      severity: "info",
      direction: "Stable",
      probability: 32 + idx * 6,
      confidence: 52 + idx * 7,
    }));
    return [...riskRows, ...actionRows].slice(0, 4).map((item, index) => ({
      ...item,
      probability: Math.min(98, Math.max(8, item.probability + index * 2)),
    }));
  }, [selectedDevelopment]);

  useEffect(() => {
    if (!riskPlaybookItems.length) {
      setActiveRiskPlaybookId("");
      return;
    }
    if (activeRiskPlaybookId && riskPlaybookItems.some((item) => item.id === activeRiskPlaybookId)) {
      return;
    }
    setActiveRiskPlaybookId(riskPlaybookItems[0].id);
  }, [activeRiskPlaybookId, riskPlaybookItems]);

  const mapInstructionText = mapSelectionMode
    ? `Selecting ${mapSelectionMode} country: click a map pin`
    : "Rotate, zoom, and click red country markers to inspect spillovers.";

  const renderInlineRelationPicker = () => (
    <div className="flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.1em]">
      <button
        type="button"
        onClick={() => setMapSelectionMode("start")}
        className={`atlas-focus-ring rounded-full border px-2.5 py-1 transition ${
          mapSelectionMode === "start"
            ? "border-white/40 bg-white/[0.11] text-zinc-100"
            : "border-white/20 bg-white/[0.05] text-zinc-300 hover:border-white/30 hover:text-zinc-100"
        }`}
      >
        {mapSelectionMode === "start" ? "Pick Start..." : "Set Start"}
      </button>
      <button
        type="button"
        onClick={() => setMapSelectionMode("end")}
        className={`atlas-focus-ring rounded-full border px-2.5 py-1 transition ${
          mapSelectionMode === "end"
            ? "border-white/40 bg-white/[0.11] text-zinc-100"
            : "border-white/20 bg-white/[0.05] text-zinc-300 hover:border-white/30 hover:text-zinc-100"
        }`}
      >
        {mapSelectionMode === "end" ? "Pick End..." : "Set End"}
      </button>
      <div className="text-zinc-500">{mapStartCountry?.name ? `Start: ${mapStartCountry.name}` : "Start: --"}</div>
      <div className="text-zinc-500">{mapEndCountry?.name ? `End: ${mapEndCountry.name}` : "End: --"}</div>
      {(mapStartCountry || mapEndCountry) ? (
        <button
          type="button"
          onClick={clearMapSelection}
          className="atlas-focus-ring rounded-full border border-white/15 px-2.5 py-1 text-zinc-400 transition hover:border-white/28 hover:text-zinc-100"
        >
          Clear
        </button>
      ) : null}
    </div>
  );

  const renderFullscreenRelationPicker = () => (
    <div className="absolute left-4 top-[78px] z-[1300] w-[min(680px,calc(100%-2rem))] rounded-2xl border border-cyan-300/20 bg-black/62 p-3 shadow-[0_18px_42px_rgba(0,0,0,0.52)] backdrop-blur-xl">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-[0.15em] text-cyan-100/90">Route Builder</div>
          <div className="mt-1 text-[11px] text-zinc-400">Set start/end directly or pick pins on the globe.</div>
        </div>
        {(mapStartCountry || mapEndCountry) ? (
          <button
            type="button"
            onClick={clearMapSelection}
            className="atlas-focus-ring rounded-full border border-white/20 px-3 py-1 text-[10px] uppercase tracking-[0.1em] text-zinc-300 transition hover:border-white/30 hover:text-zinc-100"
          >
            Clear Route
          </button>
        ) : null}
      </div>

      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
        <label className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Start Country</div>
          <select
            value={mapStartCountry?.id || ""}
            onChange={(event) => setMapStartById(event.target.value)}
            className="atlas-focus-ring w-full rounded-lg border border-white/18 bg-black/40 px-2.5 py-2 text-sm text-zinc-100 outline-none transition hover:border-white/28"
          >
            <option value="">Select start country</option>
            {spilloverHotspotOptions.map((spot) => (
              <option key={`start-${spot.id}`} value={spot.id}>
                {spot.name}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <div className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">End Country</div>
          <select
            value={mapEndCountry?.id || ""}
            onChange={(event) => setMapEndById(event.target.value)}
            className="atlas-focus-ring w-full rounded-lg border border-white/18 bg-black/40 px-2.5 py-2 text-sm text-zinc-100 outline-none transition hover:border-white/28"
          >
            <option value="">Select end country</option>
            {spilloverHotspotOptions.map((spot) => (
              <option key={`end-${spot.id}`} value={spot.id}>
                {spot.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] uppercase tracking-[0.1em]">
        <button
          type="button"
          onClick={() => setMapSelectionMode("start")}
          className={`atlas-focus-ring rounded-full border px-2.5 py-1 transition ${
            mapSelectionMode === "start"
              ? "border-white/40 bg-white/[0.12] text-zinc-100"
              : "border-white/18 bg-white/[0.04] text-zinc-300 hover:border-white/30 hover:text-zinc-100"
          }`}
        >
          {mapSelectionMode === "start" ? "Picking Start..." : "Pick Start On Globe"}
        </button>
        <button
          type="button"
          onClick={() => setMapSelectionMode("end")}
          className={`atlas-focus-ring rounded-full border px-2.5 py-1 transition ${
            mapSelectionMode === "end"
              ? "border-white/40 bg-white/[0.12] text-zinc-100"
              : "border-white/18 bg-white/[0.04] text-zinc-300 hover:border-white/30 hover:text-zinc-100"
          }`}
        >
          {mapSelectionMode === "end" ? "Picking End..." : "Pick End On Globe"}
        </button>
        {relationData ? (
          <span className="rounded-full border border-cyan-300/35 bg-cyan-300/12 px-2.5 py-1 text-cyan-100">
            Quality {String(relationData.relation_quality_label || "mixed")} {relationData.relation_quality_score}/100
          </span>
        ) : null}
      </div>
    </div>
  );

  const heroSpilloverPanel = (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-2">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-zinc-400">Cross-Region Spillover Globe</div>
          <div className="text-[10px] text-zinc-500">Blue oceans, green landmasses, red pins, and directed spillover paths.</div>
        </div>
        <button
          type="button"
          onClick={() => setMapFullscreenOpen(true)}
          className="atlas-focus-ring inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.04] px-3 py-1 text-[10px] uppercase tracking-[0.11em] text-zinc-200 transition hover:border-white/30 hover:bg-white/[0.08]"
        >
          <Expand className="h-3.5 w-3.5" />
          Fullscreen
        </button>
      </div>
      {renderInlineRelationPicker()}

      <div className="relative h-[348px] overflow-hidden rounded-2xl border border-white/12 bg-black/25 backdrop-blur-sm">
        <GlobeMap
          mapKey="hero-spillover-inline"
          hotspots={spilloverHotspots}
          arcs={spilloverArcs}
          manualArc={manualArc}
          onSelectCountry={handleSelectCountry}
          instructionText={mapInstructionText}
        />

        {(mapStartCountry || relationData) && (
          <CountryRelationPanel
            startCountry={mapStartCountry}
            endCountry={mapEndCountry}
            relation={relationData || null}
            isLoadingRelation={isFetchingRelation}
            onClearSelection={clearMapSelection}
            onClearRelation={clearMapRelation}
          />
        )}
      </div>
    </div>
  );

  return (
    <div className={`${embedded ? "min-h-0" : "min-h-[calc(100vh-74px)]"} px-3 py-3 sm:px-4 sm:py-4 lg:px-6 lg:py-6`}>
      <div className="mx-auto max-w-[1650px] space-y-4">
        <WorldPulseHero
          selectedDevelopment={selectedDevelopment}
          themeBoard={data?.theme_board || []}
          rightPanel={heroSpilloverPanel}
        />

        <section className={`${PANEL_CLASS} space-y-4 bg-black/24 p-3 backdrop-blur-sm sm:p-4`}>
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-xl font-semibold tracking-tight text-zinc-100 sm:text-2xl">Critical Developments</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <StatBadge label="As Of" value={formatClock(data?.as_of)} />
              <StatBadge label="Confidence" value={data?.confidence?.score ?? "--"} />
              <StatBadge
                label="Healthy Sources"
                value={`${healthySources}/${totalSources || "--"}`}
                tone={healthySources > 0 ? "text-emerald-200" : "text-amber-200"}
              />
              <StatBadge label="Status" value={isFetching ? "Refreshing" : "Live"} />
            </div>
          </div>

          <NewsNavigatorPanel
            borderless
            onHeadlineSelected={handleHeadlineSelectionFromNavigator}
            onThemeSelected={handleThemeSelectionFromNavigator}
          />

          {selectedDevelopment ? (
            <div className="space-y-4 rounded-xl bg-white/[0.03] p-3 sm:p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="max-w-4xl">
                  <div className="text-[11px] uppercase tracking-[0.14em] text-zinc-500">Critical Developments</div>
                  <KeywordHighlighter
                    text={displayedHeadlineTitle}
                    highlights={navigatorHighlights}
                    tooltipLabel="Headline keyword"
                    className="mt-1 text-2xl font-bold leading-tight text-zinc-100"
                  />
                  <KeywordHighlighter
                    text={displayedNarrative}
                    highlights={navigatorHighlights}
                    tooltipLabel="Narrative keyword"
                    className="mt-2 text-sm leading-relaxed text-zinc-300"
                  />
                  {isFetchingDevelopmentDetail ? <div className="mt-1 text-[10px] text-zinc-500">Refreshing detailed intelligence...</div> : null}
                </div>
                <a
                  href={scenarioTarget}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/25 px-3 py-1.5 text-[11px] font-medium text-zinc-100 transition duration-300 hover:border-white/40 hover:tracking-[0.02em]"
                >
                  <FlaskConical className="h-3.5 w-3.5" />
                  Run Scenario
                  <ArrowRight className="h-3.5 w-3.5" />
                </a>
              </div>

              <DevelopmentStoryGraph graph={selectedDevelopment.story_graph} onSelectNode={setSelectedGraphNode} borderless />

              <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                <div className="rounded-xl bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <BookOpenText className="h-4 w-4 text-zinc-300" />
                    What This Means
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">Concise takeaways with practical next steps</div>

                  <div className="mt-2 space-y-2">
                    {whatThisMeansItems.length ? (
                      whatThisMeansItems.map((item) => (
                        <div key={item.id} className="rounded-lg border border-white/12 bg-white/[0.04] px-2.5 py-2">
                          <div className="text-[11px] font-semibold text-zinc-100">{item.title}</div>
                          <div className="mt-1 text-[11px] text-zinc-300">{item.insight}</div>
                          <div className="mt-1 rounded-md border border-cyan-300/25 bg-cyan-300/10 px-2 py-1 text-[10px] text-cyan-100">
                            Action: {item.action}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-[11px] text-zinc-400">
                        Theme interpretation is loading.
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-xl bg-white/[0.02] p-3">
                  <div className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-100">
                    <ShieldAlert className="h-4 w-4 text-zinc-300" />
                    Risk Playbook
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">
                    Interactive, probabilistic view of what can rise or cool next
                  </div>

                  <div className="mt-2">
                    <RiskPlaybookProbabilityGraph
                      items={riskPlaybookItems}
                      activeId={activeRiskPlaybookId}
                      onSelect={setActiveRiskPlaybookId}
                    />
                  </div>

                  <div className="mt-2 space-y-2">
                    {riskPlaybookItems.length ? (
                      riskPlaybookItems.map((item) => (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => setActiveRiskPlaybookId(item.id)}
                          className={`atlas-focus-ring block w-full rounded-lg border bg-white/[0.04] px-2.5 py-2 text-left transition ${
                            activeRiskPlaybookId === item.id
                              ? "border-cyan-300/45 bg-cyan-300/10"
                              : "border-white/12 hover:border-white/25"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-[11px] font-semibold text-zinc-100">{item.title}</div>
                            <span className={`rounded-full border px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] ${playbookSeverityTone(item.severity)}`}>
                              {item.severity}
                            </span>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[9px] uppercase tracking-[0.08em] text-zinc-300">
                            <span className="rounded-full border border-white/18 px-1.5 py-0.5">{item.direction}</span>
                            <span className="rounded-full border border-white/18 px-1.5 py-0.5">
                              Probability {Math.round(item.probability)}% ({probabilityBand(item.probability)})
                            </span>
                            <span className="rounded-full border border-white/18 px-1.5 py-0.5">
                              Confidence {Math.round(item.confidence)}%
                            </span>
                          </div>
                          <div className="mt-1 text-[11px] text-zinc-300">{item.insight}</div>
                          <div className="mt-1 flex items-start gap-1.5 text-[10px] text-zinc-200">
                            <Sparkles className="mt-[1px] h-3.5 w-3.5 shrink-0 text-zinc-300" />
                            <span>{item.action}</span>
                          </div>
                        </button>
                      ))
                    ) : (
                      <div className="rounded-lg border border-white/10 bg-white/[0.02] px-2.5 py-2 text-[11px] text-zinc-400">
                        Risk actions are loading.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-sm text-zinc-500">Select a development to view analysis.</div>
          )}
        </section>
        {isLoading ? <div className="text-xs text-zinc-500">Loading live signal desk...</div> : null}
        {isError ? <div className="text-xs text-rose-300">Failed to load briefing: {error?.message || "Unknown error"}</div> : null}
      </div>

      <AnimatePresence>
        {mapFullscreenOpen ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-x-0 bottom-0 top-[74px] z-[120] bg-black/92 p-2 backdrop-blur-sm sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 8 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
              className="relative mx-auto h-full max-w-[1700px] overflow-hidden rounded-2xl border border-cyan-300/20 bg-black/70 shadow-[0_26px_72px_rgba(0,0,0,0.62)]"
            >
              <div className="absolute inset-x-0 top-0 z-[1300] flex items-center justify-between border-b border-white/10 bg-black/56 px-4 py-3">
                <div>
                  <div className="text-sm font-semibold uppercase tracking-[0.12em] text-zinc-100">Cross-Region Spillover Globe</div>
                  <div className="text-[11px] text-zinc-400">
                    Elevated 3D markers and bilateral relation tracing for selected countries.
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setMapFullscreenOpen(false)}
                  className="atlas-focus-ring inline-flex items-center gap-1 rounded-full border border-white/20 bg-white/[0.05] px-3 py-1 text-[10px] uppercase tracking-[0.11em] text-zinc-200 transition hover:bg-white/[0.12]"
                >
                  <Minimize2 className="h-3.5 w-3.5" />
                  Minimize & Return
                </button>
              </div>

              <div className="absolute inset-0 pt-[64px]">
                {renderFullscreenRelationPicker()}
                <GlobeMap
                  mapKey="hero-spillover-fullscreen"
                  hotspots={spilloverHotspots}
                  arcs={spilloverArcs}
                  manualArc={manualArc}
                  onSelectCountry={handleSelectCountry}
                  initialZoom={3}
                  minZoom={2.2}
                  maxZoom={7}
                  markerVariant="elevated"
                  instructionText={mapInstructionText}
                />

                {(mapStartCountry || mapEndCountry || relationData) ? (
                  <CountryRelationPanel
                    startCountry={mapStartCountry}
                    endCountry={mapEndCountry}
                    relation={relationData || null}
                    isLoadingRelation={isFetchingRelation}
                    onClearSelection={clearMapSelection}
                    onClearRelation={clearMapRelation}
                    className="right-4 top-[236px] md:top-[190px]"
                  />
                ) : null}

                {focusedCountry ? (
                  <CountryIntelCard
                    country={focusedCountry}
                    intelRows={countryIntelRows}
                    healthySources={healthySources}
                    totalSources={totalSources}
                    countryProof={countryProof}
                    isLoadingProof={isFetchingCountryProof}
                    onClose={() => setFocusedCountry(null)}
                  />
                ) : null}

                <button
                  type="button"
                  onClick={() => setMapFullscreenOpen(false)}
                  className="atlas-focus-ring absolute bottom-5 right-5 z-[1300] inline-flex items-center gap-1 rounded-full border border-white/20 bg-black/62 px-4 py-2 text-xs font-medium uppercase tracking-[0.1em] text-zinc-100 transition hover:bg-black/78"
                >
                  <Minimize2 className="h-4 w-4" />
                  Return To Website
                </button>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ProofConsoleOverlay
        open={proofConsoleOpen}
        onToggle={() => setProofConsoleOpen((prev) => !prev)}
        onClose={() => setProofConsoleOpen(false)}
        selectedProof={selectedProof}
        healthySources={healthySources}
        totalSources={totalSources}
        feedStatus={feedStatus}
      />
    </div>
  );
}


