from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    app_name: str = "Atlas Backend"
    app_env: str = Field(default="dev", alias="APP_ENV")
    api_v1_prefix: str = "/api/v1"
    cors_allowed_origins: str = Field(
        default="http://localhost:5173,http://127.0.0.1:5173",
        alias="CORS_ALLOWED_ORIGINS",
    )
    cors_allow_origin_regex: str = Field(default=r"^https://.*\.vercel\.app$", alias="CORS_ALLOW_ORIGIN_REGEX")
    cors_allow_credentials: bool = Field(default=False, alias="CORS_ALLOW_CREDENTIALS")

    supabase_url: str = Field(default="", alias="SUPABASE_URL")
    supabase_anon_key: str = Field(default="", alias="SUPABASE_ANON_KEY")
    supabase_service_role_key: str = Field(default="", alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_query_timeout_seconds: float = Field(default=2.8, alias="SUPABASE_QUERY_TIMEOUT_SECONDS")
    auth_timeout_seconds: float = Field(default=10.0, alias="AUTH_TIMEOUT_SECONDS")
    test_login_email: str = Field(default="atlas.test@demo.local", alias="TEST_LOGIN_EMAIL")
    test_login_password: str = Field(default="AtlasDemo123!", alias="TEST_LOGIN_PASSWORD")
    test_login_display_name: str = Field(default="Atlas Test User", alias="TEST_LOGIN_DISPLAY_NAME")

    auth_required: bool = Field(default=False, alias="AUTH_REQUIRED")
    auth_jwks_cache_ttl_seconds: int = Field(default=300, alias="AUTH_JWKS_CACHE_TTL_SECONDS")

    stooq_base_url: str = Field(default="https://stooq.com/q/l/", alias="STOOQ_BASE_URL")
    stooq_interval: int = Field(default=5, alias="STOOQ_INTERVAL")
    twelvedata_api_key: str = Field(default="", alias="TWELVEDATA_API_KEY")
    twelvedata_rest_url: str = Field(default="https://api.twelvedata.com", alias="TWELVEDATA_REST_URL")
    twelvedata_ws_url: str = Field(
        default="wss://ws.twelvedata.com/v1/quotes/price",
        alias="TWELVEDATA_WS_URL",
    )
    twelvedata_ws_enabled: bool = Field(default=False, alias="TWELVEDATA_WS_ENABLED")

    alpha_vantage_api_key: str = Field(default="", alias="ALPHAVANTAGE_API_KEY")
    alpha_vantage_base_url: str = Field(
        default="https://www.alphavantage.co/query",
        alias="ALPHAVANTAGE_BASE_URL",
    )

    yahoo_enabled: bool = Field(default=True, alias="YAHOO_ENABLED")
    yahoo_base_url: str = Field(
        default="https://query1.finance.yahoo.com/v8/finance/chart",
        alias="YAHOO_BASE_URL",
    )

    fred_api_key: str = Field(default="", alias="FRED_API_KEY")
    fred_api_base_url: str = Field(
        default="https://api.stlouisfed.org/fred/series/observations",
        alias="FRED_API_BASE_URL",
    )
    fred_csv_fallback_enabled: bool = Field(default=False, alias="FRED_CSV_FALLBACK_ENABLED")
    fred_csv_base_url: str = Field(
        default="https://fred.stlouisfed.org/graph/fredgraph.csv",
        alias="FRED_CSV_BASE_URL",
    )

    market_background_enabled: bool = Field(default=True, alias="MARKET_BACKGROUND_ENABLED")
    market_poll_enabled: bool = Field(default=False, alias="MARKET_POLL_ENABLED")
    market_realtime_poll_seconds: float = Field(default=2.5, alias="MARKET_REALTIME_POLL_SECONDS")
    market_cache_ttl_seconds: float = Field(default=2.0, alias="MARKET_CACHE_TTL_SECONDS")
    market_refresh_max_concurrency: int = Field(default=4, alias="MARKET_REFRESH_MAX_CONCURRENCY")
    market_refresh_fail_backoff_seconds: float = Field(default=15.0, alias="MARKET_REFRESH_FAIL_BACKOFF_SECONDS")
    supabase_quote_upsert_interval_seconds: float = Field(
        default=5.0,
        alias="SUPABASE_QUOTE_UPSERT_INTERVAL_SECONDS",
    )
    supabase_snapshot_upsert_interval_seconds: float = Field(
        default=20.0,
        alias="SUPABASE_SNAPSHOT_UPSERT_INTERVAL_SECONDS",
    )

    theme_news_live_enabled: bool = Field(default=True, alias="THEME_NEWS_LIVE_ENABLED")
    theme_news_window_hours: int = Field(default=72, alias="THEME_NEWS_WINDOW_HOURS")
    theme_live_cache_seconds: float = Field(default=18.0, alias="THEME_LIVE_CACHE_SECONDS")
    theme_news_rss_timeout_seconds: float = Field(default=6.0, alias="THEME_NEWS_RSS_TIMEOUT_SECONDS")
    theme_news_max_articles: int = Field(default=80, alias="THEME_NEWS_MAX_ARTICLES")
    mediastack_api_key: str = Field(default="", alias="MEDIASTACK_API_KEY")
    mediastack_base_url: str = Field(default="http://api.mediastack.com/v1", alias="MEDIASTACK_BASE_URL")
    mediastack_timeout_seconds: float = Field(default=6.0, alias="MEDIASTACK_TIMEOUT_SECONDS")
    mediastack_max_articles: int = Field(default=80, alias="MEDIASTACK_MAX_ARTICLES")
    mediastack_keywords: str = Field(
        default=(
            "inflation,central bank,interest rates,fiscal policy,trade policy,geopolitical risk,"
            "energy market,recession,liquidity,regulation"
        ),
        alias="MEDIASTACK_KEYWORDS",
    )
    mediastack_categories: str = Field(default="business,general", alias="MEDIASTACK_CATEGORIES")
    mediastack_languages: str = Field(default="en", alias="MEDIASTACK_LANGUAGES")

    openai_api_key: str = Field(default="", alias="OPENAI_API_KEY")
    openai_model: str = Field(default="gpt-4o-mini", alias="OPENAI_MODEL")
    openai_base_url: str = Field(default="https://api.openai.com/v1", alias="OPENAI_BASE_URL")

    time_decay_half_life_hours: float = Field(default=48.0, alias="TIME_DECAY_HALF_LIFE_HOURS")


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
