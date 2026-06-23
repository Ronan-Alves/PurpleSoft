from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://purplesoft:purplesoft@localhost:5438/purplesoft"
    cors_origins: str = "http://localhost:5178,http://127.0.0.1:5178"
    jwt_secret: str = "change-me-in-production"

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
