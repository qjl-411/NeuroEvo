from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NeuroEvo API"
    api_prefix: str = "/api/v1"
    environment: str = "development"
    cors_origins: str = "http://localhost:5173"

    # DMSA-Net runtime configuration. Keep the checkpoint outside Git.
    model_checkpoint: str | None = None
    model_device: str = "auto"
    model_metrics: str | None = None
    max_upload_bytes: int = 500 * 1024 * 1024
    log_level: str = "INFO"
    request_id_header: str = "X-Request-ID"

    literature_database: str = "data/neuroevo_papers.db"
    literature_pdf_directory: str = "data/pdfs"
    openalex_api_key: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_prefix="NEUROEVO_", extra="ignore")


settings = Settings()
