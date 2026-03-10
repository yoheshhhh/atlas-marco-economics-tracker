import React from "react";
import { Activity, ArrowRightLeft, X } from "lucide-react";

export default function CountryRelationPanel({
  startCountry,
  endCountry,
  relation,
  isLoadingRelation,
  onClearSelection,
  onClearRelation,
  className = "",
}) {
  return (
    <div className={`absolute right-4 top-4 z-[1200] w-[360px] max-w-[calc(100%-2rem)] space-y-2 ${className}`}>
      <div className="atlas-surface-strong rounded-xl p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-zinc-300">
            <ArrowRightLeft className="h-3.5 w-3.5 text-zinc-200" />
            Country Link Builder
          </div>
          <button
            type="button"
            onClick={onClearSelection}
            className="atlas-focus-ring rounded px-1 text-[10px] text-zinc-500 transition-colors hover:text-zinc-100"
          >
            Reset
          </button>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
            <div className="text-[10px] text-zinc-500">Start</div>
            <div className="truncate text-xs text-zinc-200">{startCountry?.name || "Select country"}</div>
          </div>
          <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
            <div className="text-[10px] text-zinc-500">End</div>
            <div className="truncate text-xs text-zinc-200">{endCountry?.name || "Select country"}</div>
          </div>
        </div>
        {isLoadingRelation ? <div className="mt-2 text-[11px] text-zinc-300">Computing bilateral transmission...</div> : null}
      </div>

      {relation ? (
        <div className="atlas-surface-strong rounded-xl border border-white/20 p-3">
          <div className="flex items-center justify-between gap-2">
            <div className="text-xs font-semibold text-zinc-100">Relation Intelligence</div>
            <button type="button" onClick={onClearRelation} className="atlas-focus-ring rounded text-zinc-400 transition hover:text-zinc-100">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="mt-2 text-[11px] text-zinc-300">{relation.narrative}</div>
          <RelationQualitySummary relation={relation} />
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Metric label="Transmission Strength" value={`${relation.relation_strength}%`} tone="text-zinc-100" />
            <Metric label="Spillover (bps)" value={relation.estimated_spillover_bps} tone="text-zinc-200" />
            <Metric label="Trade Intensity" value={relation.trade_intensity} tone="text-zinc-200" />
            <Metric label="Financial Link" value={relation.financial_linkage} tone="text-zinc-200" />
          </div>
          <div className="mt-3 rounded-lg border border-white/10 bg-white/[0.03] p-2">
            <div className="mb-1 flex items-center gap-1 text-[10px] text-zinc-500">
              <Activity className="h-3 w-3" />
              Dominant Channel
            </div>
            <div className="text-xs uppercase tracking-wide text-zinc-200">{relation.dominant_channel}</div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Metric({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-2">
      <div className="text-[10px] text-zinc-500">{label}</div>
      <div className={`text-sm font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function RelationQualitySummary({ relation }) {
  const label = String(relation?.relation_quality_label || "mixed").toLowerCase();
  const score = Number(relation?.relation_quality_score ?? 0);
  const style = qualityStyle(label);

  return (
    <div className={`mt-2 rounded-lg border p-2 ${style.card}`}>
      <div className="flex items-center justify-between gap-2">
        <div className="text-[10px] uppercase tracking-[0.08em] text-zinc-400">Relation Quality</div>
        <span className={`rounded-full border px-2 py-0.5 text-[10px] ${style.badge}`}>
          {style.title} {score}/100
        </span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
        <div className={`h-full ${style.fill}`} style={{ width: `${Math.max(0, Math.min(score, 100))}%` }} />
      </div>
      <div className="mt-1 text-[10px] text-zinc-500">Good: 67-100 | Mixed: 40-66 | Bad: 0-39</div>
    </div>
  );
}

function qualityStyle(label) {
  if (label === "good") {
    return {
      title: "Good",
      card: "border-emerald-300/30 bg-emerald-300/8",
      badge: "border-emerald-300/40 bg-emerald-300/8 text-emerald-200",
      fill: "bg-emerald-300",
    };
  }
  if (label === "bad") {
    return {
      title: "Bad",
      card: "border-amber-300/30 bg-amber-300/8",
      badge: "border-amber-300/40 bg-amber-300/8 text-amber-200",
      fill: "bg-amber-300",
    };
  }
  return {
    title: "Mixed",
    card: "border-zinc-200/30 bg-zinc-200/5",
    badge: "border-zinc-200/35 bg-zinc-200/6 text-zinc-200",
    fill: "bg-zinc-200",
  };
}
