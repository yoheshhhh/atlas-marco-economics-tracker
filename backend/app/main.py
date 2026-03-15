from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.router import api_router
from app.config import get_settings
from app.data.seed import get_data_repository


def create_app() -> FastAPI:
    settings = get_settings()
    allowed_origins = [origin.strip() for origin in str(settings.cors_allowed_origins or "").split(",") if origin.strip()]
    allow_origin_regex = str(settings.cors_allow_origin_regex or "").strip() or None

    @asynccontextmanager
    async def lifespan(_: FastAPI):
        repository = get_data_repository()
        await repository.start_market_streams()
        try:
            yield
        finally:
            await repository.stop_market_streams()

    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=allowed_origins,
        allow_origin_regex=allow_origin_regex,
        allow_credentials=settings.cors_allow_credentials,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    @app.get("/")
    def root() -> dict[str, str]:
        return {"service": "atlas-backend", "status": "running"}

    app.include_router(api_router)
    return app


app = create_app()
