import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { AnimatePresence, motion } from "framer-motion";
import { BrainCircuit, ChevronLeft, ChevronRight, FileUp, Flame, Loader2, Send, Snowflake, Sparkles } from "lucide-react";
import { clearMemoryVaultCache, fetchNewsHeadlines, runNewsNavigator } from "@/api/atlasClient";
import KeywordHighlighter from "@/components/worldpulse/KeywordHighlighter";

const HORIZON_OPTIONS = [
  { id: "daily", label: "Day" },
  { id: "monthly", label: "Month" },
  { id: "yearly", label: "Year" },
];

const CONTENT_TYPE_OPTIONS = [
  { id: "macroeconomic_releases", label: "Macro Releases" },
  { id: "central_bank_commentary", label: "Central Bank" },
  { id: "geopolitical_developments", label: "Geopolitics" },
  { id: "regulatory_announcements", label: "Regulatory" },
  { id: "sector_specific_events", label: "Sector Events" },
  { id: "fiscal_policy", label: "Fiscal Policy" },
  { id: "trade_policy", label: "Trade Policy" },
  { id: "market_volatility", label: "Market Volatility" },
];

const CONTENT_TYPE_LABELS = Object.fromEntries(CONTENT_TYPE_OPTIONS.map((item) => [item.id, item.label]));
const SOURCE_TYPE_OPTIONS = [
  { id: "wire", label: "Wire" },
  { id: "institutional", label: "Institutional" },
  { id: "publisher", label: "Publisher" },
  { id: "rss", label: "RSS" },
];
const REGION_OPTIONS = [
  { id: "", label: "All Regions" },
  { id: "global", label: "Global" },
  { id: "united_states", label: "United States" },
  { id: "europe", label: "Europe" },
  { id: "china", label: "China" },
  { id: "japan", label: "Japan" },
  { id: "middle_east", label: "Middle East" },
  { id: "emerging_markets", label: "Emerging Markets" },
  { id: "latin_america", label: "Latin America" },
  { id: "asia_pacific", label: "Asia Pacific" },
];
const DEFAULT_FILTERS = {
  country: "",
  region: "",
  search: "",
  contentTypes: [],
  sourceTypes: [],
};

function readAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsText(file);
  });
}

function readAsDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function formatPublishedAt(value) {
  if (!value) return "just now";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "just now";
  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatRegionLabel(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  return raw
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase());
}

function insightStateLabel(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized.includes("hot")) return "Heating";
  if (normalized.includes("warm")) return "Warming";
  if (normalized.includes("cool")) return "Cooling";
  if (normalized.includes("cold")) return "Cooling";
  return "Stable";
}

function trendLabel(value) {
  const normalized = String(value || "").toLowerCase();
  if (normalized === "rising") return "On The Rise";
  if (normalized === "falling") return "On The Fall";
  return "Sideways";
}

function toNumber(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function extractTerms(text) {
  const words = String(text || "")
    .toLowerCase()
    .match(/[a-z][a-z0-9-]{2,}/g);
  if (!words) return [];
  const stop = new Set([
    "the",
    "and",
    "for",
    "with",
    "from",
    "that",
    "this",
    "into",
    "while",
    "over",
    "under",
    "about",
    "after",
    "before",
    "market",
    "global",
    "today",
  ]);
  const unique = [];
  const seen = new Set();
  words.forEach((word) => {
    if (stop.has(word) || seen.has(word)) return;
    seen.add(word);
    unique.push(word);
  });
  return unique;
}

function headlinePrompt(headline, horizon) {
  return `Analyze this headline for ${horizon} horizon. Cover both local and global impact clearly: ${headline}`;
}

export default function NewsNavigatorPanel({ onHeadlineSelected = null, onThemeSelected = null, borderless = false }) {
  const queryClient = useQueryClient();
  const [horizon, setHorizon] = useState("daily");
  const [prompt, setPrompt] = useState("");
  const [files, setFiles] = useState([]);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [selectedThemeId, setSelectedThemeId] = useState("");
  const [themeHotCoolFilter, setThemeHotCoolFilter] = useState("all");

  const [headlines, setHeadlines] = useState([]);
  const [headlineTotal, setHeadlineTotal] = useState(0);
  const [headlinesLoading, setHeadlinesLoading] = useState(false);
  const [headlinesError, setHeadlinesError] = useState("");
  const [selectedHeadlineId, setSelectedHeadlineId] = useState("");
  const [lastHeadlinesRefreshAt, setLastHeadlinesRefreshAt] = useState(null);
  const [refreshTick, setRefreshTick] = useState(0);

  const autoRunSignatureRef = useRef("");
  const headlinesRef = useRef([]);

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []).slice(0, 4);
    setFiles(selected);
  };

  const buildAttachments = useCallback(async () => {
    const rows = [];
    for (const file of files) {
      const mime = String(file.type || "application/octet-stream");
      const base = {
        file_name: file.name,
        mime_type: mime,
        size_bytes: file.size || 0,
        text_excerpt: "",
        image_data_url: null,
      };

      try {
        if (mime.startsWith("text/") || /\.(txt|md|csv|json|log|xml|yaml|yml|tsv)$/i.test(file.name)) {
          const text = await readAsText(file);
          rows.push({ ...base, text_excerpt: text.slice(0, 6000) });
          continue;
        }
        if (mime.startsWith("image/")) {
          const dataUrl = await readAsDataURL(file);
          rows.push({ ...base, image_data_url: dataUrl.slice(0, 120000) });
          continue;
        }
      } catch {
        rows.push(base);
        continue;
      }
      rows.push(base);
    }
    return rows;
  }, [files]);

  const filterSignature = useMemo(
    () =>
      JSON.stringify({
        country: filters.country,
        region: filters.region,
        search: filters.search,
        contentTypes: [...filters.contentTypes].sort(),
        sourceTypes: [...filters.sourceTypes].sort(),
      }),
    [filters],
  );

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        filters.country.trim() ||
          filters.region.trim() ||
          filters.search.trim() ||
          filters.contentTypes.length ||
          filters.sourceTypes.length,
      ),
    [filters],
  );

  const toggleFilterValue = (key, value) => {
    setFilters((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] : [];
      const exists = current.includes(value);
      return {
        ...prev,
        [key]: exists ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshTick((prev) => prev + 1);
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    headlinesRef.current = headlines;
  }, [headlines]);

  useEffect(() => {
    const controller = new AbortController();
    const debounce = setTimeout(async () => {
      setHeadlinesLoading(true);
      setHeadlinesError("");
      try {
        const payload = await fetchNewsHeadlines(
          {
            horizon,
            country: filters.country,
            region: filters.region,
            contentTypes: filters.contentTypes,
            sourceTypes: filters.sourceTypes,
            search: filters.search,
            limit: 50,
          },
          { signal: controller.signal },
        );
        setHeadlines(Array.isArray(payload?.headlines) ? payload.headlines : []);
        setHeadlineTotal(Number(payload?.total || 0));
        setLastHeadlinesRefreshAt(new Date());
      } catch (loadError) {
        if (loadError?.name === "AbortError" || String(loadError?.message || "").toLowerCase().includes("aborted")) {
          return;
        }
        if ((headlinesRef.current || []).length) {
          setHeadlinesError("Live refresh delayed. Showing last synced headlines.");
        } else {
          setHeadlines([]);
          setHeadlineTotal(0);
          setHeadlinesError(loadError?.message || "Failed to load live headlines.");
        }
      } finally {
        setHeadlinesLoading(false);
      }
    }, 160);

    return () => {
      controller.abort();
      clearTimeout(debounce);
    };
  }, [filterSignature, horizon, refreshTick]);

  useEffect(() => {
    if (!headlines.length) {
      setSelectedHeadlineId("");
      return;
    }
    if (selectedHeadlineId && headlines.some((item) => item.article_id === selectedHeadlineId)) {
      return;
    }
    setSelectedHeadlineId(headlines[0].article_id);
  }, [headlines, selectedHeadlineId]);

  const selectedHeadline = useMemo(() => {
    if (!headlines.length) return null;
    if (!selectedHeadlineId) return headlines[0];
    return headlines.find((item) => item.article_id === selectedHeadlineId) || headlines[0];
  }, [headlines, selectedHeadlineId]);

  const selectedHeadlineIndex = useMemo(
    () => headlines.findIndex((item) => item.article_id === selectedHeadline?.article_id),
    [headlines, selectedHeadline?.article_id],
  );

  const headlineHighlights = useMemo(() => {
    if (!selectedHeadline?.title) return [];

    const fromAnalysis = (result?.highlights || [])
      .filter((item) => selectedHeadline.title.toLowerCase().includes(String(item.term || "").toLowerCase()))
      .slice(0, 8);
    if (fromAnalysis.length) {
      return fromAnalysis;
    }

    return extractTerms(selectedHeadline.title)
      .slice(0, 6)
      .map((term) => ({
        term,
        explanation: `The term "${term}" is a high-signal keyword in the current macro headline.`,
      }));
  }, [result?.highlights, selectedHeadline?.title]);

  const runAnalysis = useCallback(
    async ({ auto = false } = {}) => {
      const manualPrompt = prompt.trim();
      const selectedTitle = selectedHeadline?.title || "";
      const effectivePrompt = manualPrompt || headlinePrompt(selectedTitle, horizon);

      if (!effectivePrompt.trim()) {
        setError("Select a headline or enter a prompt to run News Navigator.");
        return;
      }

      setIsRunning(true);
      setError("");
      try {
        const attachments = await buildAttachments();
        const payload = await runNewsNavigator({
          prompt: effectivePrompt,
          horizon,
          attachments,
          persist_memory: !auto,
          filters: {
            country: filters.country,
            region: filters.region,
            content_types: filters.contentTypes,
            source_types: filters.sourceTypes,
            query: filters.search || selectedTitle,
          },
        });
        setResult(payload);
        setSelectedThemeId(payload?.theme_insights?.[0]?.theme_id || "");
        if (payload?.memory_entry_id) {
          const historyEntry = {
            entry_id: payload.memory_entry_id,
            heading: payload.memory_heading || payload.theme_insights?.[0]?.label || "Saved discussion",
            created_at: payload.as_of || new Date().toISOString(),
            theme_label: payload.theme_insights?.[0]?.label || "Unclassified",
            prompt_preview:
              effectivePrompt.length > 140 ? `${effectivePrompt.slice(0, 140)}...` : effectivePrompt,
            source_count: Array.isArray(payload.sources) ? payload.sources.length : 0,
          };

          queryClient.setQueriesData({ queryKey: ["memory-history"] }, (current) => {
            if (!current || !Array.isArray(current.entries)) {
              return {
                as_of: payload.as_of || new Date().toISOString(),
                entries: [historyEntry],
                explanation: { summary: "Memory history updated from latest News Navigator run.", top_factors: [] },
              };
            }
            const filtered = current.entries.filter((item) => item.entry_id !== payload.memory_entry_id);
            return {
              ...current,
              as_of: payload.as_of || current.as_of,
              entries: [historyEntry, ...filtered],
            };
          });

          queryClient.setQueryData(["memory-entry", payload.memory_entry_id], {
            as_of: payload.as_of || new Date().toISOString(),
            entry_id: payload.memory_entry_id,
            heading: payload.memory_heading || historyEntry.heading,
            created_at: payload.as_of || new Date().toISOString(),
            theme_id: payload.theme_insights?.[0]?.theme_id || "unclassified",
            theme_label: payload.theme_insights?.[0]?.label || "Unclassified",
            prompt: effectivePrompt,
            answer: payload.answer,
            horizon: payload.horizon,
            analysis_mode: payload.analysis_mode,
            importance_analysis: payload.importance_analysis,
            local_impact_analysis: payload.local_impact_analysis,
            global_impact_analysis: payload.global_impact_analysis,
            emerging_theme_analysis: payload.emerging_theme_analysis,
            sources: payload.sources || [],
            attachment_insights: payload.attachment_insights || [],
            theme_insights: payload.theme_insights || [],
            explanation: payload.explanation,
          });

          clearMemoryVaultCache(payload.memory_entry_id);
          queryClient.invalidateQueries({ queryKey: ["memory-history"] });
          queryClient.invalidateQueries({ queryKey: ["memory-entry", payload.memory_entry_id] });
        }
        if (selectedHeadline && typeof onHeadlineSelected === "function") {
          onHeadlineSelected({ headline: selectedHeadline, analysis: payload });
        }
        if (selectedHeadline?.theme_id && typeof onThemeSelected === "function") {
          onThemeSelected(selectedHeadline.theme_id, selectedHeadline, payload);
        }
      } catch (runError) {
        if (!auto) {
          setError(runError?.message || "Failed to run News Navigator.");
        }
      } finally {
        setIsRunning(false);
      }
    },
    [buildAttachments, filters, horizon, onHeadlineSelected, onThemeSelected, prompt, selectedHeadline],
  );

  useEffect(() => {
    if (!selectedHeadline?.article_id) return;
    if (selectedHeadline?.theme_id && typeof onThemeSelected === "function") {
      onThemeSelected(selectedHeadline.theme_id, selectedHeadline, null);
    }
  }, [onThemeSelected, selectedHeadline]);

  useEffect(() => {
    if (!selectedHeadline?.article_id) return;
    const signature = `${horizon}:${selectedHeadline.article_id}:${filterSignature}`;
    if (autoRunSignatureRef.current === signature) return;
    autoRunSignatureRef.current = signature;
    const timer = setTimeout(() => {
      runAnalysis({ auto: true });
    }, 180);
    return () => clearTimeout(timer);
  }, [filterSignature, horizon, runAnalysis, selectedHeadline?.article_id]);

  useEffect(() => {
    const firstThemeId = result?.theme_insights?.[0]?.theme_id || "";
    setSelectedThemeId(firstThemeId);
  }, [result]);

  const activeThemeInsight = useMemo(() => {
    const insights = result?.theme_insights || [];
    if (!insights.length) return null;
    return insights.find((item) => item.theme_id === selectedThemeId) || insights[0];
  }, [result, selectedThemeId]);

  const macroThemeRows = useMemo(() => {
    const rows = Array.isArray(result?.theme_insights) ? result.theme_insights : [];
    const normalized = rows.map((item) => {
      const hotness = toNumber(item.hotness_score, Math.round(toNumber(item.relevance_score) * 100));
      const coolness = toNumber(item.coolness_score, Math.max(0, 100 - hotness));
      return {
        ...item,
        hotness,
        coolness,
        trend_direction: String(item.trend_direction || "stable").toLowerCase(),
        plain_english_story:
          item.plain_english_story ||
          `${item.label} is ${String(item.heat_state || "neutral").toLowerCase()} based on current live source flow and market confirmation.`,
      };
    });

    const filtered = normalized.filter((item) => {
      if (themeHotCoolFilter === "hot") return item.hotness >= item.coolness;
      if (themeHotCoolFilter === "cool") return item.coolness > item.hotness;
      return true;
    });

    const sorted = [...filtered].sort((left, right) => {
      if (themeHotCoolFilter === "cool") {
        return right.coolness - left.coolness;
      }
      return right.hotness - left.hotness;
    });
    return sorted.slice(0, 5);
  }, [result?.theme_insights, themeHotCoolFilter]);

  const liveEvidenceCount = useMemo(() => {
    const rows = Array.isArray(result?.sources) ? result.sources : [];
    return rows.filter((item) => !String(item.article_id || "").startsWith("seed-")).length;
  }, [result?.sources]);

  const goHeadline = (direction) => {
    if (!headlines.length) return;
    const currentIndex = selectedHeadlineIndex >= 0 ? selectedHeadlineIndex : 0;
    const nextIndex = (currentIndex + direction + headlines.length) % headlines.length;
    setSelectedHeadlineId(headlines[nextIndex].article_id);
  };

  return (
    <section
      className={
        borderless ? "space-y-4" : "rounded-2xl border border-white/12 bg-black/38 p-4 shadow-[0_14px_36px_rgba(0,0,0,0.35)] backdrop-blur-xl sm:p-5"
      }
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.12em] text-zinc-300">
            <Sparkles className="h-3.5 w-3.5" />
            News Navigator + Critical Developments
          </div>
          <h3 className="mt-2 text-lg font-semibold text-zinc-100">News Navigator</h3>
          <p className="mt-1 text-xs text-zinc-400">
            Prompt the engine directly or select one of the top 50 trending global headlines.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {HORIZON_OPTIONS.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setHorizon(option.id)}
              className={`atlas-focus-ring rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.11em] transition ${
                horizon === option.id
                  ? "border-white/35 bg-white/[0.14] text-zinc-100"
                  : "border-white/20 bg-white/[0.05] text-zinc-300 hover:border-white/30 hover:text-zinc-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_250px]">
        <div className="space-y-3">
          <div className="rounded-xl border border-white/12 bg-black/30 p-3">
            <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-500">Prompt</div>
            <textarea
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Prompt with whatever you want. Example: Explain this headline's impact on local rates, FX, and global risk assets."
              className="atlas-focus-ring mt-1.5 min-h-[108px] w-full resize-y rounded-xl border border-white/15 bg-black/35 p-3 text-sm leading-relaxed text-zinc-100 placeholder:text-zinc-500"
            />
            <div className="mt-2 text-[11px] text-zinc-400">
              Prompt freely, or select a trending headline below and we will analyze it automatically.
            </div>
          </div>

          <div className="rounded-xl border border-white/12 bg-black/30 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Top 50 Global Headlines</div>
                <div className="text-[11px] text-zinc-500">
                  {headlineTotal} matches
                  {hasActiveFilters ? " | filtered" : ""}
                  {lastHeadlinesRefreshAt ? ` | Updated ${formatPublishedAt(lastHeadlinesRefreshAt.toISOString())}` : ""}
                </div>
              </div>
              {headlinesLoading ? (
                <span className="inline-flex items-center gap-1 text-[11px] text-zinc-400">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Refreshing
                </span>
              ) : (
                <span className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">Auto refresh 30s</span>
              )}
            </div>

            <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-3">
              <input
                value={filters.country}
                onChange={(event) => setFilters((prev) => ({ ...prev, country: event.target.value }))}
                placeholder="Country filter"
                className="atlas-focus-ring rounded-lg border border-white/15 bg-black/35 px-2.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-500"
              />
              <select
                value={filters.region}
                onChange={(event) => setFilters((prev) => ({ ...prev, region: event.target.value }))}
                className="atlas-focus-ring rounded-lg border border-white/15 bg-black/35 px-2.5 py-2 text-xs text-zinc-200"
              >
                {REGION_OPTIONS.map((option) => (
                  <option key={option.id || "all-regions"} value={option.id}>
                    {option.label}
                  </option>
                ))}
              </select>
              <input
                value={filters.search}
                onChange={(event) => setFilters((prev) => ({ ...prev, search: event.target.value }))}
                placeholder="Keyword filter"
                className="atlas-focus-ring rounded-lg border border-white/15 bg-black/35 px-2.5 py-2 text-xs text-zinc-200 placeholder:text-zinc-500"
              />
            </div>

            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">Content Type Filter</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {CONTENT_TYPE_OPTIONS.map((option) => {
                  const active = filters.contentTypes.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleFilterValue("contentTypes", option.id)}
                      className={`atlas-focus-ring rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] transition ${
                        active
                          ? "border-cyan-200/45 bg-cyan-300/18 text-cyan-100"
                          : "border-white/18 bg-white/[0.03] text-zinc-300 hover:border-white/28 hover:text-zinc-100"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="mt-2">
              <div className="text-[10px] uppercase tracking-[0.1em] text-zinc-500">Source Type Filter</div>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {SOURCE_TYPE_OPTIONS.map((option) => {
                  const active = filters.sourceTypes.includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggleFilterValue("sourceTypes", option.id)}
                      className={`atlas-focus-ring rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] transition ${
                        active
                          ? "border-cyan-200/45 bg-cyan-300/18 text-cyan-100"
                          : "border-white/18 bg-white/[0.03] text-zinc-300 hover:border-white/28 hover:text-zinc-100"
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
                {hasActiveFilters ? (
                  <button
                    type="button"
                    onClick={() => setFilters({ ...DEFAULT_FILTERS })}
                    className="atlas-focus-ring rounded-full border border-white/20 bg-white/[0.02] px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] text-zinc-300 transition hover:border-white/35 hover:text-zinc-100"
                  >
                    Clear Filters
                  </button>
                ) : null}
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => goHeadline(-1)}
                disabled={headlines.length <= 1}
                className="atlas-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/[0.05] text-zinc-200 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Previous headline"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>

              <select
                value={selectedHeadline?.article_id || ""}
                onChange={(event) => setSelectedHeadlineId(event.target.value)}
                className="atlas-focus-ring min-w-[260px] flex-1 rounded-lg border border-white/15 bg-black/35 px-2.5 py-2 text-xs text-zinc-200"
              >
                {!headlines.length ? <option value="">No headlines matched current filters</option> : null}
                {headlines.map((item, index) => (
                  <option key={item.article_id} value={item.article_id}>
                    {index + 1}. {item.title}
                  </option>
                ))}
              </select>

              <button
                type="button"
                onClick={() => goHeadline(1)}
                disabled={headlines.length <= 1}
                className="atlas-focus-ring inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/20 bg-white/[0.05] text-zinc-200 transition hover:bg-white/[0.1] disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Next headline"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            {headlinesError ? <div className="mt-2 text-[11px] text-rose-300">{headlinesError}</div> : null}

            <div className="mt-3 rounded-xl border border-white/12 bg-white/[0.04] p-3">
              <div className="text-[10px] uppercase tracking-[0.12em] text-zinc-400">Hottest Headline</div>
              <KeywordHighlighter
                text={selectedHeadline?.title || "No headline available yet."}
                highlights={headlineHighlights}
                tooltipLabel="Headline keyword"
                className="mt-1.5 text-xl font-bold leading-tight text-zinc-100 sm:text-2xl"
              />
              <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-zinc-500">
                <span>{selectedHeadline?.source || "--"}</span>
                <span>|</span>
                <span>{formatPublishedAt(selectedHeadline?.published_at)}</span>
                {selectedHeadline?.region ? (
                  <>
                    <span>|</span>
                    <span>{formatRegionLabel(selectedHeadline.region)}</span>
                  </>
                ) : null}
              </div>
              <div className="mt-2 text-xs leading-relaxed text-zinc-300">
                {selectedHeadline?.summary || "Waiting for reliable source summary..."}
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-3 rounded-xl border border-white/12 bg-black/28 p-3">
          <label className="atlas-focus-ring flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/25 bg-white/[0.03] px-3 py-2 text-xs text-zinc-300 transition hover:border-white/35 hover:text-zinc-100">
            <FileUp className="h-4 w-4" />
            Upload Media/Files
            <input type="file" className="hidden" multiple onChange={handleFileChange} />
          </label>

          <div className="max-h-[110px] space-y-1.5 overflow-auto pr-1">
            {files.length ? (
              files.map((file) => (
                <div key={`${file.name}-${file.size}`} className="rounded-md border border-white/10 bg-white/[0.04] px-2 py-1 text-[11px] text-zinc-300">
                  {file.name}
                </div>
              ))
            ) : (
              <div className="text-[11px] text-zinc-500">No files selected.</div>
            )}
          </div>

          <button
            type="button"
            onClick={() => runAnalysis({ auto: false })}
            disabled={isRunning}
            className="atlas-focus-ring inline-flex w-full items-center justify-center gap-2 rounded-lg border border-white/28 bg-white px-3 py-2 text-xs font-semibold uppercase tracking-[0.11em] text-zinc-950 transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRunning ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            {isRunning ? "Analyzing..." : "Run Navigator"}
          </button>

          <div className="rounded-lg border border-cyan-300/20 bg-cyan-300/8 p-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10px] uppercase tracking-[0.1em] text-cyan-100/85">Macro Theme Temperature</div>
              <div className="rounded-full border border-white/20 px-2 py-0.5 text-[9px] uppercase tracking-[0.08em] text-zinc-200">
                Live evidence {liveEvidenceCount}/{(result?.sources || []).length || 0}
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {[
                { id: "all", label: "All" },
                { id: "hot", label: "Hot" },
                { id: "cool", label: "Cool" },
              ].map((option) => {
                const active = themeHotCoolFilter === option.id;
                return (
                  <button
                    key={`theme-filter-${option.id}`}
                    type="button"
                    onClick={() => setThemeHotCoolFilter(option.id)}
                    className={`atlas-focus-ring rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-[0.08em] transition ${
                      active
                        ? "border-white/35 bg-white/[0.14] text-zinc-100"
                        : "border-white/18 bg-white/[0.03] text-zinc-300 hover:border-white/30 hover:text-zinc-100"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>

            <div className="mt-2.5 space-y-2">
              {macroThemeRows.length ? (
                macroThemeRows.map((item) => (
                  <button
                    key={`macro-theme-${item.theme_id}`}
                    type="button"
                    onClick={() => {
                      setSelectedThemeId(item.theme_id);
                      if (typeof onThemeSelected === "function") {
                        onThemeSelected(item.theme_id, selectedHeadline, result);
                      }
                    }}
                    className="atlas-focus-ring w-full rounded-lg border border-white/14 bg-white/[0.04] px-2.5 py-2 text-left transition hover:border-white/30 hover:bg-white/[0.08]"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-[11px] font-semibold text-zinc-100">{item.label}</div>
                      <div className="text-[9px] uppercase tracking-[0.09em] text-zinc-300">{trendLabel(item.trend_direction)}</div>
                    </div>
                    <div className="mt-1 grid grid-cols-2 gap-1 text-[10px] text-zinc-300">
                      <div className="rounded-md border border-rose-200/20 bg-rose-300/10 px-1.5 py-1">
                        <Flame className="mr-1 inline h-3 w-3 text-rose-100" />
                        Hotness {item.hotness}
                      </div>
                      <div className="rounded-md border border-cyan-200/20 bg-cyan-300/10 px-1.5 py-1">
                        <Snowflake className="mr-1 inline h-3 w-3 text-cyan-100" />
                        Coolness {item.coolness}
                      </div>
                    </div>
                    <div className="mt-1.5 text-[11px] leading-relaxed text-zinc-300">{item.plain_english_story}</div>
                  </button>
                ))
              ) : (
                <div className="rounded-lg border border-white/12 bg-white/[0.02] px-2 py-1.5 text-[11px] text-zinc-400">
                  Run Navigator to populate hot/cool macro themes from live evidence.
                </div>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2.5 text-[11px] leading-relaxed text-zinc-300">
            Responses include both <span className="font-semibold text-zinc-100">local</span> and{" "}
            <span className="font-semibold text-zinc-100">global</span> impact channels when analysis mode is active.
          </div>
        </div>
      </div>

      {error ? <div className="mt-2 text-xs text-rose-300">{error}</div> : null}

      <AnimatePresence>
        {result ? (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="mt-4 space-y-4"
          >
            <div className="rounded-xl border border-white/12 bg-black/35 p-3.5">
              <div className="mb-2 flex items-center gap-2 text-[10px] uppercase tracking-[0.11em] text-zinc-500">
                <BrainCircuit className="h-3.5 w-3.5" />
                Navigator Brief
                <span className="ml-auto rounded-full border border-white/20 px-2 py-0.5 text-[9px] tracking-[0.1em] text-zinc-300">
                  {result.analysis_mode === "informational" ? "Informational Mode" : "Intelligence Mode"}
                </span>
              </div>
              <KeywordHighlighter
                text={result.answer}
                highlights={result.highlights || []}
                tooltipLabel="Analysis keyword"
                className="whitespace-pre-line text-sm leading-relaxed text-zinc-200"
              />
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div className="rounded-xl border border-white/12 bg-black/30 p-3">
                <div className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Local Impact</div>
                <KeywordHighlighter
                  text={result.local_impact_analysis}
                  highlights={result.highlights || []}
                  tooltipLabel="Local signal keyword"
                  className="mt-1 text-[12px] leading-relaxed text-zinc-200"
                />
              </div>
              <div className="rounded-xl border border-white/12 bg-black/30 p-3">
                <div className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Global Impact</div>
                <KeywordHighlighter
                  text={result.global_impact_analysis}
                  highlights={result.highlights || []}
                  tooltipLabel="Global signal keyword"
                  className="mt-1 text-[12px] leading-relaxed text-zinc-200"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
              <div className="rounded-xl border border-white/12 bg-black/28 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Theme Interpretation</div>
                  <select
                    value={activeThemeInsight?.theme_id || ""}
                    onChange={(event) => setSelectedThemeId(event.target.value)}
                    className="atlas-focus-ring rounded-md border border-white/20 bg-black/40 px-2 py-1 text-[11px] text-zinc-200"
                  >
                    {(result.theme_insights || []).map((insight) => (
                      <option key={insight.theme_id} value={insight.theme_id}>
                        {insight.label}
                      </option>
                    ))}
                  </select>
                </div>

                {activeThemeInsight ? (
                  <div className="mt-2 rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-xs font-semibold text-zinc-100">{activeThemeInsight.label}</div>
                      <div className="rounded-full border border-white/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.08em] text-zinc-300">
                        {insightStateLabel(activeThemeInsight.heat_state)}
                      </div>
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-300">{activeThemeInsight.rationale}</div>
                    <div className="mt-1 text-[11px] text-zinc-300">
                      <span className="font-semibold text-zinc-100">Local:</span> {activeThemeInsight.local_impact}
                    </div>
                    <div className="mt-1 text-[11px] text-zinc-400">
                      <span className="font-semibold text-zinc-200">Global:</span> {activeThemeInsight.global_impact}
                    </div>
                  </div>
                ) : (
                  <div className="mt-2 text-[11px] text-zinc-500">No theme interpretation available yet.</div>
                )}

                {result.memory_entry_id ? (
                  <div className="mt-2 text-[10px] text-zinc-500">Saved to Memory Vault entry: {result.memory_entry_id}</div>
                ) : (
                  <div className="mt-2 text-[10px] text-zinc-500">Live analysis only. Use Run Navigator to save this prompt into Memory Vault.</div>
                )}
              </div>

              <div className="rounded-xl border border-white/12 bg-black/28 p-3">
                <div className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Verified Source Articles (Live)</div>
                <div className="mt-2 max-h-[260px] space-y-2 overflow-auto pr-1">
                  {(result.sources || []).length ? (
                    (result.sources || []).map((source) => (
                      <a
                        key={source.article_id}
                        href={source.url}
                        target="_blank"
                        rel="noreferrer"
                        className="block rounded-lg border border-white/10 bg-white/[0.04] p-2.5 transition hover:border-white/25 hover:bg-white/[0.07]"
                      >
                        <div className="text-[11px] text-zinc-100">{source.title}</div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-zinc-500">
                          <span>{source.source}</span>
                          <span>|</span>
                          <span>{formatPublishedAt(source.published_at)}</span>
                          {source.region ? (
                            <>
                              <span>|</span>
                              <span>{formatRegionLabel(source.region)}</span>
                            </>
                          ) : null}
                          {source.source_type ? (
                            <>
                              <span>|</span>
                              <span>{formatRegionLabel(source.source_type)}</span>
                            </>
                          ) : null}
                        </div>
                        {source.reason ? <div className="mt-1 text-[10px] text-zinc-400">{source.reason}</div> : null}
                        {(source.content_types || []).length ? (
                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {source.content_types.slice(0, 3).map((type) => (
                              <span key={`${source.article_id}-${type}`} className="rounded-full border border-white/14 px-1.5 py-0.5 text-[9px] uppercase tracking-[0.08em] text-zinc-300">
                                {CONTENT_TYPE_LABELS[type] || formatRegionLabel(type)}
                              </span>
                            ))}
                          </div>
                        ) : null}
                      </a>
                    ))
                  ) : (
                    <div className="text-[11px] text-zinc-500">No reliable live source articles matched this selection.</div>
                  )}
                </div>
              </div>
            </div>

            {(result.attachment_insights || []).length ? (
              <div className="rounded-xl border border-white/12 bg-black/28 p-3">
                <div className="text-[10px] uppercase tracking-[0.11em] text-zinc-500">Attachment Interpretation</div>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  {(result.attachment_insights || []).map((item) => (
                    <div key={item.file_name} className="rounded-lg border border-white/10 bg-white/[0.04] p-2.5">
                      <div className="text-[11px] font-semibold text-zinc-100">{item.file_name}</div>
                      <div className="mt-0.5 text-[10px] uppercase tracking-[0.08em] text-zinc-400">{item.media_type}</div>
                      <div className="mt-1 text-[11px] text-zinc-300">{item.summary}</div>
                      <div className="mt-1 text-[11px] text-zinc-300">
                        <span className="font-semibold text-zinc-100">Relevance:</span> {item.relevance}
                      </div>
                      <div className="mt-1 text-[11px] text-zinc-400">
                        <span className="font-semibold text-zinc-200">Impact:</span> {item.impact}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </motion.div>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
