from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = "NeuroEvo API"
    api_prefix: str = "/api/v1"
    environment: str = "development"
    cors_origins: str = "http://localhost:5173"
    model_checkpoint: str | None = None

    model_config = SettingsConfigDict(env_file=".env", env_prefix="NEUROEVO_", extra="ignore")


settings = Settings()
