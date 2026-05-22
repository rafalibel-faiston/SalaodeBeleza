"""
Módulo de autenticação — JWT + senha via variável de ambiente.

Configurar no Render:
  ADMIN_PASSWORD  → senha que a Giovanna vai digitar no painel
  JWT_SECRET      → string aleatória longa (ex: gere em https://randomkeygen.com)
  JWT_EXPIRE_HOURS → opcional, padrão 48h
"""

import os
import secrets
from datetime import datetime, timedelta, timezone

import jwt

JWT_SECRET       = os.getenv("JWT_SECRET", "dev-secret-MUDE-EM-PRODUCAO-12345")
JWT_ALGORITHM    = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", "48"))


def criar_token() -> str:
    """Gera um JWT de admin com validade de JWT_EXPIRE_HOURS horas."""
    expire = datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRE_HOURS)
    return jwt.encode({"sub": "admin", "exp": expire}, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verificar_token(token: str) -> bool:
    """Valida o JWT — retorna True se válido e não expirado."""
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub") == "admin"
    except Exception:
        return False


def verificar_senha(plain: str) -> bool:
    """
    Comparação de tempo constante para evitar timing attacks.
    A senha correta vem da variável de ambiente ADMIN_PASSWORD.
    Se não estiver definida, bloqueia tudo (seguro por padrão).
    """
    stored = os.getenv("ADMIN_PASSWORD", "")
    if not stored:
        return False
    return secrets.compare_digest(plain.encode("utf-8"), stored.encode("utf-8"))
