from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, Field

from app.schemas.common import ConfidenceTrace, ExplanationTrace, TimestampedResponse
from app.schemas.historical import HistoricalRegime
from app.schemas.risk import RiskSummaryCard
from app.schemas.themes import ThemeSourceArticle, ThemeTimelinePoint
from app.schemas.world_pulse import Hotspot, TransmissionArc


class CausalChainStep(BaseModel):
    step: int = Field(..., ge=1)
    title: str
    detail: str


class StandardizedScore(BaseModel):
    metric: str
    value: int = Field(..., ge=0, le=100)
    percentile: float = Field(..., ge=0.0, le=1.0)
    confidence: float = Field(..., ge=0.0, le=1.0)
    model_version: str
    status: str = "ok"


class ThemeRiskImplication(BaseModel):
    asset_class: str
    direction: str
    severity: str
    rationale: str


class RecommendedAction(BaseModel):
    action: str
    rationale: str
    horizon: str


class WatchTrigger(BaseModel):
    signal: str
    hotter_if: str
    cooler_if: str


class ScenarioPreset(BaseModel):
    driver: str
    event: str
    region: str
    severity: int = Field(..., ge=10, le=100)
    horizon: str
    baseline_mode: str = "live_blend"


class StoryGraphNode(BaseModel):
    node_id: str
    label: str
    node_type: str
    detail: str
    score: int | None = Field(default=None, ge=0, le=100)


class StoryGraphEdge(BaseModel):
    from_node: str = Field(alias="from")
    to_node: str = Field(alias="to")
    label: str
    weight: float = Field(..., ge=0.0)

    model_config = {"populate_by_name": True}


class StoryGraph(BaseModel):
    nodes: list[StoryGraphNode]
    edges: list[StoryGraphEdge]


class SourceProof(BaseModel):
    article_id: str
    title: str
    url: str
    source: str
    published_at: datetime
    snippet: str
    relevance_score: float = Field(..., ge=0.0, le=1.0)


class MarketProofSignal(BaseModel):
    signal: str
    value: float
    unit: str
    observed_at: str
    interpretation: str


class ModelProof(BaseModel):
    model_name: str
    model_version: str
    score_confidence: float = Field(..., ge=0.0, le=1.0)
    top_features: list[str]


class ConclusionProof(BaseModel):
    story: str
    why_now: str
    confidence_note: str


class ProofBundle(BaseModel):
    source_evidence: list[SourceProof]
    market_evidence: list[MarketProofSignal]
    model_evidence: list[ModelProof]
    conclusion: ConclusionProof


class ThemeBoardItem(BaseModel):
    theme_id: str
    label: str
    state: str
    outlook_state: str
    temperature: int = Field(..., ge=0, le=100)
    momentum: float
    top_regions: list[str]
    top_assets: list[str]
    market_reaction_score: int = Field(..., ge=0, le=100)
    scorecard: list[StandardizedScore] = Field(default_factory=list)


class MacroDevelopment(BaseModel):
    development_id: str
    theme_id: str
    label: str
    title: str
    executive_summary: str
    state: str
    outlook_state: str
    importance: int = Field(..., ge=0, le=100)
    mention_count: int = Field(..., ge=0)
    source_diversity: int = Field(..., ge=0)
    market_confirmation: str
    regions: list[str]
    asset_classes: list[str]
    causal_chain: list[CausalChainStep]
    risk_implications: list[ThemeRiskImplication]
    recommended_actions: list[RecommendedAction]
    watch_triggers: list[WatchTrigger]
    source_articles: list[ThemeSourceArticle]
    scenario_preset: ScenarioPreset
    narrative_story: str
    scorecard: list[StandardizedScore] = Field(default_factory=list)
    proof_bundle: ProofBundle
    story_graph: StoryGraph
    trace_id: str


class RiskPosture(BaseModel):
    summary_cards: list[RiskSummaryCard]
    assessment_summary: str
    overall_regime: str


class SpilloverMap(BaseModel):
    hotspots: list[Hotspot]
    arcs: list[TransmissionArc]


class MemoryPreviewItem(BaseModel):
    regime_id: str
    label: str
    year: int
    similarity: int = Field(..., ge=0, le=100)
    why_it_matters: str
    trace_id: str


class FeedSourceStatus(BaseModel):
    source: str
    is_healthy: bool
    last_published_at: str
    ingested_articles: int = Field(..., ge=0)
    trust_score: float = Field(..., ge=0.0, le=1.0)


class FeedStatus(BaseModel):
    updated_at: str
    polling_interval_seconds: int = Field(..., ge=10, le=900)
    healthy_sources: int = Field(..., ge=0)
    total_sources: int = Field(..., ge=0)
    sources: list[FeedSourceStatus]


class DailyBriefResponse(TimestampedResponse):
    headline_brief: str
    feed_status: FeedStatus
    developments: list[MacroDevelopment]
    theme_board: list[ThemeBoardItem]
    risk_posture: RiskPosture
    spillover_map: SpilloverMap
    institutional_memory_preview: list[MemoryPreviewItem]
    confidence: ConfidenceTrace
    explanation: ExplanationTrace


class ThemeDiscussionSnapshot(BaseModel):
    as_of: datetime
    title: str
    summary: str
    state: str
    outlook_state: str
    importance: int = Field(..., ge=0, le=100)
    primary_action: str


class ThemeMemoryBrief(BaseModel):
    memory_mandate: str
    last_consensus: str
    what_changed: list[str]
    recurring_patterns: list[str]
    carry_forward_actions: list[str]
    unresolved_questions: list[str]
    institutional_notes: list[str]


class ThemeMemoryResponse(TimestampedResponse):
    theme_id: str
    label: str
    memory_brief: ThemeMemoryBrief
    discussion_history: list[ThemeDiscussionSnapshot]
    timeline_points: list[ThemeTimelinePoint]
    source_articles: list[ThemeSourceArticle]
    related_analogues: list[HistoricalRegime]
    confidence: ConfidenceTrace
    explanation: ExplanationTrace


class MemoryHistoryItem(BaseModel):
    entry_id: str
    heading: str
    created_at: datetime
    theme_label: str
    prompt_preview: str
    source_count: int = Field(default=0, ge=0)


class MemoryHistoryResponse(TimestampedResponse):
    entries: list[MemoryHistoryItem]
    explanation: ExplanationTrace


class MemoryEntryResponse(TimestampedResponse):
    entry_id: str
    heading: str
    created_at: datetime
    theme_id: str
    theme_label: str
    prompt: str
    answer: str
    horizon: str
    analysis_mode: str
    importance_analysis: str
    local_impact_analysis: str
    global_impact_analysis: str
    emerging_theme_analysis: str
    sources: list[NavigatorSourceItem]
    attachment_insights: list[NavigatorAttachmentInsight] = Field(default_factory=list)
    theme_insights: list[NavigatorThemeInsight] = Field(default_factory=list)
    explanation: ExplanationTrace


class DevelopmentDetailResponse(TimestampedResponse):
    development: MacroDevelopment
    confidence: ConfidenceTrace
    explanation: ExplanationTrace


class NavigatorAttachment(BaseModel):
    file_name: str
    mime_type: str
    size_bytes: int = Field(..., ge=0)
    text_excerpt: str = ""
    image_data_url: str | None = None


class NewsNavigatorFilters(BaseModel):
    country: str = Field(default="", max_length=120)
    region: str = Field(default="", max_length=80)
    content_types: list[str] = Field(default_factory=list)
    source_types: list[str] = Field(default_factory=list)
    query: str = Field(default="", max_length=320)


class NewsNavigatorRequest(BaseModel):
    prompt: str = Field(..., min_length=4, max_length=4000)
    horizon: str = Field(default="daily", min_length=4, max_length=12)
    attachments: list[NavigatorAttachment] = Field(default_factory=list)
    filters: NewsNavigatorFilters = Field(default_factory=NewsNavigatorFilters)
    persist_memory: bool = True


class NavigatorHighlight(BaseModel):
    term: str
    explanation: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class NavigatorThemeInsight(BaseModel):
    theme_id: str
    label: str
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    heat_state: str
    hotness_score: int = Field(default=0, ge=0, le=100)
    coolness_score: int = Field(default=0, ge=0, le=100)
    trend_direction: str = "stable"
    trend_velocity: float = 0.0
    evidence_count: int = Field(default=0, ge=0)
    source_diversity: int = Field(default=0, ge=0)
    plain_english_story: str = ""
    local_impact: str
    global_impact: str
    rationale: str


class NavigatorSourceItem(BaseModel):
    article_id: str
    title: str
    url: str
    source: str
    published_at: datetime
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    reason: str
    region: str = ""
    content_types: list[str] = Field(default_factory=list)
    source_type: str = "live"
    summary: str = ""


class NavigatorHeadlineItem(BaseModel):
    article_id: str
    title: str
    url: str
    source: str
    published_at: datetime
    summary: str
    relevance_score: float = Field(..., ge=0.0, le=1.0)
    region: str = ""
    content_types: list[str] = Field(default_factory=list)
    source_type: str = "live"
    theme_id: str = ""
    theme_label: str = ""


class NavigatorAttachmentInsight(BaseModel):
    file_name: str
    media_type: str
    summary: str
    relevance: str
    impact: str
    confidence: float = Field(..., ge=0.0, le=1.0)


class NewsNavigatorResponse(TimestampedResponse):
    prompt: str
    horizon: str
    analysis_mode: str = "intelligence"
    answer: str
    importance_analysis: str
    local_impact_analysis: str
    global_impact_analysis: str
    emerging_theme_analysis: str
    highlights: list[NavigatorHighlight]
    theme_insights: list[NavigatorThemeInsight]
    sources: list[NavigatorSourceItem]
    attachment_insights: list[NavigatorAttachmentInsight] = Field(default_factory=list)
    memory_entry_id: str
    memory_heading: str = ""
    explanation: ExplanationTrace


class NewsHeadlinesResponse(TimestampedResponse):
    horizon: str
    filters: NewsNavigatorFilters
    total: int = Field(..., ge=0)
    headlines: list[NavigatorHeadlineItem]
    explanation: ExplanationTrace
