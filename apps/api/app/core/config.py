from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    database_url: str
    redis_url: str

    jwt_signing_key: str
    field_encryption_key: str
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30

    otp_provider: str = "mock"
    otp_ttl_minutes: int = 5
    otp_max_attempts: int = 5
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""

    storage_provider: str = "s3_compatible"
    storage_endpoint_url: str | None = None
    storage_bucket: str = "healthy-documents"
    storage_access_key: str = ""
    storage_secret_key: str = ""
    storage_region: str = "us-east-1"
    storage_local_dir: str = "./storage"

    virus_scan_provider: str = "mock"

    ai_provider: str = "mock"

    notification_provider: str = "mock"

    cors_allow_origins: str = "http://localhost:3000"

    share_link_base_url: str = "http://localhost:3000/s"
    share_access_token_ttl_minutes: int = 20

    @property
    def is_production(self) -> bool:
        return self.environment == "production"

    @property
    def cors_allow_origins_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_allow_origins.split(",") if origin.strip()]


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
