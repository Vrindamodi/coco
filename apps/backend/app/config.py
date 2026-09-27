from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    DATABASE_URL: str = "postgresql://coco:coco_dev_password@localhost:5432/coco"
    REDIS_URL: str = "redis://localhost:6379/0"
    SECRET_KEY: str = "change-me-to-a-random-secret-in-production"
    BACKEND_CORS_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:8081"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    # Python's default (WARNING) hides the Whisper pass diagnostics, which are
    # the only way to tell a silent clip from a rejected one.
    LOG_LEVEL: str = "INFO"

    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_UPLOAD_FOLDER: str = "coco/my-world"

    GROQ_API_KEY: str = ""
    GROQ_CHAT_MODEL: str = "openai/gpt-oss-20b"
    GROQ_WHISPER_MODEL: str = "whisper-large-v3"

    # "groq" (hosted, needs internet) or "local" (whisper.cpp + Ollama on the
    # host machine, for demos without a connection). See README "Offline demo".
    AI_PROVIDER: str = "groq"
    LOCAL_STT_URL: str = "http://host.docker.internal:8081"
    LOCAL_LLM_URL: str = "http://host.docker.internal:11434"
    LOCAL_LLM_MODEL: str = "gemma3:4b"

    @property
    def ai_is_local(self) -> bool:
        return self.AI_PROVIDER.strip().lower() == "local"

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.BACKEND_CORS_ORIGINS.split(",")]

    @property
    def cloudinary_enabled(self) -> bool:
        return bool(
            self.CLOUDINARY_CLOUD_NAME
            and self.CLOUDINARY_API_KEY
            and self.CLOUDINARY_API_SECRET
        )


settings = Settings()
