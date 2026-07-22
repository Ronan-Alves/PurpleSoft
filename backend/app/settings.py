from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str = "postgresql+psycopg://purplesoft:purplesoft@localhost:5438/purplesoft"
    cors_origins: str = "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5178,http://127.0.0.1:5178"
    jwt_secret: str = "dev-only-change-before-production-8f9f6c7b4f2a4a22"
    operational_email: str = "gerente@purplebpo.com.br"
    operational_password: str = "purple123"
    manager_email: str = "gerente@purplebpo.com.br"
    load_demo_data: bool = False

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
