from functools import lru_cache
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    environment: str = "development"

    database_url: str
    redis_url: str

    @field_validator("database_url")
    @classmethod
    def normalize_database_url(cls, value: str) -> str:
        """Accept provider URLs while configuring SQLAlchemy's async driver."""
        if not value.startswith(("postgres://", "postgresql://")):
            return value

        parsed = urlsplit(value)
        query = dict(parse_qsl(parsed.query, keep_blank_values=True))
        if query.get("sslmode") == "require":
            query.pop("sslmode")
            query["ssl"] = "require"

        return urlunsplit(
            parsed._replace(
                scheme="postgresql+asyncpg",
                query=urlencode(query),
            )
        )

    jwt_signing_key: str
    field_encryption_key: str
    access_token_ttl_minutes: int = 15
    refresh_token_ttl_days: int = 30

    otp_provider: str = "mock"
    otp_bypass_enabled: bool = False
    otp_static_test_accounts_enabled: bool = False
    otp_ttl_minutes: int = 5
    otp_max_attempts: int = 5
    otp_static_login_numbers: str = "9876543210,1234567890"
    otp_static_login_code: str = "123456"
    otp_static_share_numbers: str = "9999988888,4444455555"
    otp_static_share_code: str = "098765"
    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_from_number: str = ""
    gmail_address: str = ""
    gmail_app_password: str = ""

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

    @staticmethod
    def _phone_without_plus(identifier: str) -> str:
        return identifier.strip().removeprefix("+")

    def is_static_login_number(self, identifier: str) -> bool:
        numbers = {number.strip() for number in self.otp_static_login_numbers.split(",")}
        return self._phone_without_plus(identifier) in numbers

    def is_static_share_number(self, identifier: str) -> bool:
        numbers = {number.strip() for number in self.otp_static_share_numbers.split(",")}
        return self._phone_without_plus(identifier) in numbers


@lru_cache
def get_settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
