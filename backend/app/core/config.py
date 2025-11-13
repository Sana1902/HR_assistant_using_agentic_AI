from pydantic_settings import BaseSettings, SettingsConfigDict

class Settings(BaseSettings):
    # API Key
    GEMINI_API_KEY: str = "AIzaSyBhobHkOe3ede9TAgNB3ZGJNzg__SdROhI"
    
    # Email Config
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 465
    SENDER_EMAIL: str = "sanamujawar1902@gmail.com"
    SENDER_APP_PASSWORD: str = "zitwmwpbswjbuksa"
    
    # MongoDB
    MONGODB_URL: str = "mongodb+srv://sanamujawar1902:Sana2004@cluster-project.3zty3z8.mongodb.net/8"
    DATABASE_NAME: str = "HR_AGENT"
    
    # JWT
    JWT_SECRET: str = "your-secret-key-change-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    
    # Model Paths
    MODEL_DIR: str = "models"
    
    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=True,
        extra="ignore",
    )

settings = Settings()

