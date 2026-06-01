import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

# Puxa a URL do banco de dados do Render, ou usa um banco local SQLite se não achar
SQLALCHEMY_DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./banco_salao.db")

# Configuração do "Motor" do banco de dados
if SQLALCHEMY_DATABASE_URL.startswith("sqlite"):
    # Configuração específica para o SQLite não travar no computador
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
    )
else:
    # Se você adicionar um PostgreSQL no Render depois, ele ajusta o link automaticamente
    if SQLALCHEMY_DATABASE_URL.startswith("postgres://"):
        SQLALCHEMY_DATABASE_URL = SQLALCHEMY_DATABASE_URL.replace("postgres://", "postgresql://", 1)
    engine = create_engine(
        SQLALCHEMY_DATABASE_URL,
        pool_pre_ping=True,
        pool_timeout=10,
        connect_args={"connect_timeout": 10},
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# AQUI ESTÁ A VARIÁVEL QUE FALTAVA!
Base = declarative_base()