from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from sqlalchemy.orm import Session
from sqlalchemy import func, text as sql_text
from pydantic import BaseModel
from datetime import datetime
from typing import Optional
import mercadopago
import hashlib
import hmac
import os
import concurrent.futures

import models
import schemas
import auth
from database import engine, SessionLocal

# Cria as tabelas (novas tabelas apenas — não altera existentes)
models.Base.metadata.create_all(bind=engine)

limiter = Limiter(key_func=get_remote_address)
app = FastAPI(title="API Salão de Cílios - Giovanna Soares")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ─── CORS ─────────────────────────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── MERCADO PAGO ─────────────────────────────────────────────────────────────
MP_ACCESS_TOKEN      = os.getenv("MERCADOPAGO_ACCESS_TOKEN", "APP_USR-TESTE-123")
MP_WEBHOOK_SECRET    = os.getenv("MERCADOPAGO_WEBHOOK_SECRET", "")
sdk = mercadopago.SDK(MP_ACCESS_TOKEN)

# ─── BANCO DE DADOS ───────────────────────────────────────────────────────────
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─── AUTENTICAÇÃO ─────────────────────────────────────────────────────────────
_http_bearer = HTTPBearer()

def verify_admin(credentials: HTTPAuthorizationCredentials = Depends(_http_bearer)):
    """Dependência usada em todas as rotas protegidas."""
    if not auth.verificar_token(credentials.credentials):
        raise HTTPException(
            status_code=401,
            detail="Token inválido ou expirado. Faça login novamente.",
            headers={"WWW-Authenticate": "Bearer"},
        )

# ─── SEED DE SERVIÇOS ─────────────────────────────────────────────────────────
_CATALOG = [
    {"name": "Volume Brasileiro (Fio Y) - Aplicação",                        "category": "cilios",      "base_price": 115.0,  "deposit_amount": 30.0,  "estimated_minutes": 150},
    {"name": "Volume Brasileiro (Fio Y) - Manutenção (15 a 20 dias)",        "category": "cilios",      "base_price":  75.0,  "deposit_amount": 30.0,  "estimated_minutes": 120},
    {"name": "Volume Brasileiro (Fio Y) - Manutenção (Até 25 dias)",         "category": "cilios",      "base_price":  80.0,  "deposit_amount": 30.0,  "estimated_minutes": 120},
    {"name": "Volume Egípcio (Fio 4D) - Aplicação",                          "category": "cilios",      "base_price": 120.0,  "deposit_amount": 30.0,  "estimated_minutes": 150},
    {"name": "Volume Egípcio (Fio 4D) - Manutenção (15 a 20 dias)",         "category": "cilios",      "base_price":  80.0,  "deposit_amount": 30.0,  "estimated_minutes": 120},
    {"name": "Volume Egípcio (Fio 4D) - Manutenção (Até 25 dias)",          "category": "cilios",      "base_price":  85.0,  "deposit_amount": 30.0,  "estimated_minutes": 120},
    {"name": "Volume Luxxo (Fio 5D) - Aplicação",                            "category": "cilios",      "base_price": 125.0,  "deposit_amount": 30.0,  "estimated_minutes": 150},
    {"name": "Volume Luxxo (Fio 5D) - Manutenção (15 a 20 dias)",           "category": "cilios",      "base_price":  85.0,  "deposit_amount": 30.0,  "estimated_minutes": 120},
    {"name": "Volume Luxxo (Fio 5D) - Manutenção (Até 25 dias)",            "category": "cilios",      "base_price":  90.0,  "deposit_amount": 30.0,  "estimated_minutes": 120},
    {"name": "Volume Glamour (Fio 6D) - Aplicação",                          "category": "cilios",      "base_price": 130.0,  "deposit_amount": 30.0,  "estimated_minutes": 150},
    {"name": "Volume Glamour (Fio 6D) - Manutenção (15 a 20 dias)",         "category": "cilios",      "base_price":  90.0,  "deposit_amount": 30.0,  "estimated_minutes": 120},
    {"name": "Volume Glamour (Fio 6D) - Manutenção (Até 25 dias)",          "category": "cilios",      "base_price":  95.0,  "deposit_amount": 30.0,  "estimated_minutes": 120},
    {"name": "Volume Foxy Eyes (Fio 5D Curvature M) - Aplicação",            "category": "cilios",      "base_price": 130.0,  "deposit_amount": 30.0,  "estimated_minutes": 150},
    {"name": "Volume Foxy Eyes (Fio 5D Curvature M) - Manutenção (15a20d)", "category": "cilios",      "base_price":  90.0,  "deposit_amount": 30.0,  "estimated_minutes": 120},
    {"name": "Volume Mega Brasileiro (Fio Y CAPPING)",                        "category": "cilios",      "base_price": 135.0,  "deposit_amount": 30.0,  "estimated_minutes": 180},
    {"name": "Volume Mega Egípcio (Fio 4D CAPPING)",                         "category": "cilios",      "base_price": 140.0,  "deposit_amount": 30.0,  "estimated_minutes": 180},
    {"name": "Volume Mega Luxxo (Fio 5D CAPPING)",                           "category": "cilios",      "base_price": 145.0,  "deposit_amount": 30.0,  "estimated_minutes": 180},
    {"name": "Brow Lamination Simples",                                       "category": "sobrancelha", "base_price":  85.0,  "deposit_amount": 15.0,  "estimated_minutes":  60},
    {"name": "Brow Lamination com Tintura",                                   "category": "sobrancelha", "base_price":  95.0,  "deposit_amount": 15.0,  "estimated_minutes":  80},
    {"name": "Design Personalizado de Sobrancelhas",                          "category": "sobrancelha", "base_price":  30.0,  "deposit_amount": 15.0,  "estimated_minutes":  45},
    {"name": "Design Personalizado com Henna",                                "category": "sobrancelha", "base_price":  40.0,  "deposit_amount": 15.0,  "estimated_minutes":  60},
    {"name": "Depilação de Buço",                                             "category": "sobrancelha", "base_price":  10.0,  "deposit_amount":  0.0,  "estimated_minutes":  20},
    {"name": "Remoção Química (Cílios feitos por mim + Nova Aplicação)",      "category": "remocao",     "base_price":  20.0,  "deposit_amount":  0.0,  "estimated_minutes":  40},
    {"name": "Remoção Química (Após 3 manutenções com aviso prévio)",         "category": "remocao",     "base_price":  10.0,  "deposit_amount":  0.0,  "estimated_minutes":  40},
    {"name": "Remoção de Extensão de Outras Profissionais",                   "category": "remocao",     "base_price":  25.0,  "deposit_amount":  0.0,  "estimated_minutes":  50},
    {"name": "Remoção de Tufos",                                              "category": "remocao",     "base_price":  30.0,  "deposit_amount":  0.0,  "estimated_minutes":  50},
]

def _seed_services(db):
    for item in _CATALOG:
        db.add(models.Service(**item))
    db.commit()

# ─── MIGRAÇÃO AUTOMÁTICA ──────────────────────────────────────────────────────
@app.on_event("startup")
def run_migrations():
    """Adiciona colunas novas ao banco sem perder dados existentes."""
    try:
        _run_migrations_inner()
    except Exception as e:
        print(f"[startup] Aviso: migração falhou ({e}) — continuando mesmo assim.")


def _run_migrations_inner():
    db_url = os.getenv("DATABASE_URL", "sqlite:///./banco_salao.db")

    # Colunas opcionais que podem não existir em bancos antigos
    pg_columns = [
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS instagram TEXT",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS favorite_volume TEXT",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS sensitivity TEXT",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS maintenance_frequency INTEGER",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS no_show_count INTEGER DEFAULT 0",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS cancellation_count INTEGER DEFAULT 0",
        "ALTER TABLE clients ADD COLUMN IF NOT EXISTS is_blocked BOOLEAN DEFAULT FALSE",
        "ALTER TABLE services ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE",
        "ALTER TABLE financials ADD COLUMN IF NOT EXISTS refund_amount FLOAT",
        "ALTER TABLE financials ADD COLUMN IF NOT EXISTS refund_reason TEXT",
        "ALTER TABLE financials ADD COLUMN IF NOT EXISTS mp_payment_id TEXT",
        "ALTER TABLE financials ADD COLUMN IF NOT EXISTS pix_qr_code_base64 TEXT",
        "ALTER TABLE financials ADD COLUMN IF NOT EXISTS pix_copia_cola TEXT",
        "ALTER TABLE financials ADD COLUMN IF NOT EXISTS promo_code TEXT",
        "ALTER TABLE financials ADD COLUMN IF NOT EXISTS discount_amount FLOAT",
    ]

    if db_url.startswith("sqlite"):
        import sqlite3 as _sqlite3
        db_path = db_url.replace("sqlite:///", "")
        raw = _sqlite3.connect(db_path)
        try:
            def _cols(table):
                return {r[1] for r in raw.execute(f"PRAGMA table_info({table})")}
            needed = {
                "clients": [("instagram","TEXT"),("favorite_volume","TEXT"),("sensitivity","TEXT"),("maintenance_frequency","INTEGER"),("no_show_count","INTEGER DEFAULT 0"),("cancellation_count","INTEGER DEFAULT 0"),("is_blocked","INTEGER DEFAULT 0")],
                "services": [("is_active","INTEGER DEFAULT 1")],
                "financials": [("refund_amount","REAL"),("refund_reason","TEXT"),("mp_payment_id","TEXT"),("pix_qr_code_base64","TEXT"),("pix_copia_cola","TEXT"),("promo_code","TEXT"),("discount_amount","REAL")],
            }
            for table, columns in needed.items():
                existing = _cols(table)
                for col, col_type in columns:
                    if col not in existing:
                        raw.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
            raw.commit()
        finally:
            raw.close()
    else:
        # PostgreSQL suporta IF NOT EXISTS
        with engine.connect() as conn:
            for sql in pg_columns:
                try:
                    conn.execute(sql_text(sql))
                    conn.commit()
                except Exception:
                    pass

    # Auto-seed serviços se o banco estiver vazio
    db = SessionLocal()
    try:
        if db.query(models.Service).count() == 0:
            _seed_services(db)
    finally:
        db.close()

# ══════════════════════════════════════════════════════════════════════════════
# AUTH — LOGIN
# ══════════════════════════════════════════════════════════════════════════════

class LoginRequest(BaseModel):
    password: str

@app.post("/auth/login/")
@limiter.limit("5/minute")
def login(request: Request, data: LoginRequest):
    if not auth.verificar_senha(data.password):
        raise HTTPException(status_code=401, detail="Senha incorreta.")
    token = auth.criar_token()
    return {"access_token": token, "token_type": "bearer"}

# ══════════════════════════════════════════════════════════════════════════════
# SERVIÇOS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/services/", response_model=list[schemas.ServiceResponse])
def get_services(db: Session = Depends(get_db)):
    """Público — o formulário de agendamento da cliente usa esta rota."""
    return db.query(models.Service).filter(models.Service.is_active != False).all()

@app.post("/services/", response_model=schemas.ServiceResponse)
def create_service(
    service: schemas.ServiceCreate,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    db_service = models.Service(**service.dict())
    db.add(db_service)
    db.commit()
    db.refresh(db_service)
    return db_service

class ServiceUpdateRequest(BaseModel):
    name: Optional[str] = None
    category: Optional[str] = None
    base_price: Optional[float] = None
    deposit_amount: Optional[float] = None
    estimated_minutes: Optional[int] = None
    is_active: Optional[bool] = None

@app.put("/services/{service_id}/")
def update_service(
    service_id: int,
    data: ServiceUpdateRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    service = db.query(models.Service).filter(models.Service.id == service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")
    for field, value in data.dict(exclude_none=True).items():
        setattr(service, field, value)
    db.commit()
    return {"message": "Serviço atualizado!"}

# ══════════════════════════════════════════════════════════════════════════════
# AGENDAMENTOS
# ══════════════════════════════════════════════════════════════════════════════

class BookingRequest(BaseModel):
    client_name: str
    client_phone: str
    service_id: int
    scheduled_at: datetime
    is_maintenance: bool = False
    has_henna_allergy: bool = False
    medical_restrictions: Optional[str] = None
    promo_code: Optional[str] = None

@app.post("/appointments/")
def create_booking(booking: BookingRequest, db: Session = Depends(get_db)):
    """Público — rota usada pela cliente no formulário de agendamento + Pix."""
    service = db.query(models.Service).filter(models.Service.id == booking.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")

    client = db.query(models.Client).filter(models.Client.phone == booking.client_phone).first()
    if not client:
        client = models.Client(
            name=booking.client_name,
            phone=booking.client_phone,
            has_henna_allergy=booking.has_henna_allergy,
            medical_restrictions=booking.medical_restrictions,
        )
        db.add(client)
        db.commit()
        db.refresh(client)

    # Verifica se a cliente está bloqueada
    if client.is_blocked:
        raise HTTPException(
            status_code=403,
            detail="Este número está bloqueado. Entre em contato com o estúdio.",
        )

    total_value = service.base_price
    discount_amount = 0.0
    applied_promo_code = None

    # Valida e aplica promoção
    if booking.promo_code:
        from datetime import date as _date
        promo = db.query(models.Promotion).filter(
            models.Promotion.code == booking.promo_code.strip().upper(),
            models.Promotion.is_active == True,
        ).first()
        if not promo:
            raise HTTPException(status_code=400, detail="Cupom inválido ou inativo.")
        today = _date.today()
        if promo.valid_from and today < _date.fromisoformat(promo.valid_from):
            raise HTTPException(status_code=400, detail="Este cupom ainda não está ativo.")
        if promo.valid_until and today > _date.fromisoformat(promo.valid_until):
            raise HTTPException(status_code=400, detail="Este cupom está expirado.")
        if promo.max_uses and promo.uses_count >= promo.max_uses:
            raise HTTPException(status_code=400, detail="Este cupom atingiu o limite de usos.")
        if promo.applies_to != "all" and service.category != promo.applies_to:
            raise HTTPException(status_code=400, detail="Este cupom não se aplica a este serviço.")
        if promo.discount_type == "percent":
            discount_amount = round(total_value * promo.discount_value / 100, 2)
        else:
            discount_amount = min(promo.discount_value, total_value)
        promo.uses_count += 1
        applied_promo_code = promo.code

    total_value = round(total_value - discount_amount, 2)
    balance_due = round(total_value - service.deposit_amount, 2)
    if balance_due < 0:
        balance_due = 0.0

    # Cria agendamento como PENDENTE — aguarda confirmação da Giovanna
    appointment = models.Appointment(
        client_id=client.id,
        service_id=service.id,
        scheduled_at=booking.scheduled_at,
        is_maintenance=booking.is_maintenance,
        status="pending",
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    db.execute(
        sql_text(
            "INSERT INTO financials (appointment_id, total_value, deposit_paid, balance_due, promo_code, discount_amount)"
            " VALUES (:aid, :tv, :dp, :bd, :pc, :da)"
        ),
        {"aid": appointment.id, "tv": total_value, "dp": 0.0, "bd": balance_due,
         "pc": applied_promo_code, "da": discount_amount if discount_amount > 0 else None},
    )
    db.commit()

    return {
        "appointment_id": appointment.id,
        "status": "pending",
        "service_name": service.name,
        "client_name": client.name,
        "scheduled_at": appointment.scheduled_at.isoformat(),
        "discount_amount": discount_amount,
        "total_value": total_value,
    }

@app.get("/appointments/", response_model=list[schemas.AppointmentResponse])
def get_appointments(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    return db.query(models.Appointment).order_by(models.Appointment.scheduled_at.asc()).all()

@app.get("/appointments/{appointment_id}/status")
def get_appointment_status(appointment_id: int, db: Session = Depends(get_db)):
    """Público — cliente faz polling para saber se foi confirmado."""
    apt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    resp = {
        "id": apt.id,
        "status": apt.status,
        "service_name": apt.service.name if apt.service else None,
        "client_name": apt.client.name if apt.client else None,
        "scheduled_at": apt.scheduled_at.isoformat(),
    }
    if apt.status == "confirmed" and apt.financial:
        resp["pix_copia_cola"]     = apt.financial.pix_copia_cola
        resp["pix_qr_code_base64"] = apt.financial.pix_qr_code_base64
        resp["total_value"]        = apt.financial.total_value
        resp["deposit_amount"]     = apt.financial.total_value - apt.financial.balance_due
        resp["balance_due"]        = apt.financial.balance_due
    return resp

class StatusUpdate(BaseModel):
    status: str

def _generate_pix(fin, apt, deposit_amount: float):
    """Calls MP to create a Pix payment and writes QR data into fin (caller must commit)."""
    phone_digits = "".join(filter(str.isdigit, apt.client.phone or ""))
    payer_email = (
        f"{phone_digits}@cliente.salaodebeleza.com"
        if phone_digits
        else "cliente@salaodebeleza.com"
    )
    service_name = (apt.service.name if apt.service else "Serviço")[:50]
    payment_data = {
        "transaction_amount": round(float(deposit_amount), 2),
        "description": f"Sinal – {service_name}",
        "payment_method_id": "pix",
        "payer": {"email": payer_email},
    }
    result = sdk.payment().create(payment_data)
    if result.get("status") in (200, 201):
        resp = result["response"]
        fin.mp_payment_id = str(resp.get("id", ""))
        td = resp.get("point_of_interaction", {}).get("transaction_data", {})
        fin.pix_qr_code_base64 = td.get("qr_code_base64", "")
        fin.pix_copia_cola = td.get("qr_code", "")


@app.patch("/appointments/{appointment_id}/status")
def update_appointment_status(
    appointment_id: int,
    data: StatusUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Admin confirma ou recusa um agendamento pendente."""
    valid = {"pending", "confirmed", "scheduled", "rejected", "completed", "no_show"}
    if data.status not in valid:
        raise HTTPException(status_code=400, detail="Status inválido.")
    apt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    apt.status = data.status

    # Auto-generate Pix when confirming (only if deposit > 0 and not already generated)
    pix_generated = False
    pix_error = None
    if data.status == "confirmed" and apt.financial and apt.client:
        fin = apt.financial
        deposit = round(fin.total_value - fin.balance_due, 2)
        if deposit > 0 and not fin.pix_copia_cola:
            try:
                _generate_pix(fin, apt, deposit)
                pix_generated = True
            except Exception as e:
                pix_error = str(e)

    db.commit()
    db.refresh(apt)
    return {
        "message": "Status atualizado!",
        "status": apt.status,
        "pix_generated": pix_generated,
        "pix_copia_cola": apt.financial.pix_copia_cola if apt.financial else None,
        **({"pix_error": pix_error} if pix_error else {}),
    }


@app.post("/appointments/{appointment_id}/gerar-pix/")
def gerar_pix(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Gera (ou re-gera) o Pix de sinal para um agendamento confirmado."""
    apt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    if not apt.financial or not apt.client:
        raise HTTPException(status_code=400, detail="Agendamento sem registro financeiro ou cliente.")
    fin = apt.financial
    deposit = round(fin.total_value - fin.balance_due, 2)
    if deposit <= 0:
        raise HTTPException(status_code=400, detail="Este serviço não exige sinal (depósito = R$ 0).")
    try:
        _generate_pix(fin, apt, deposit)
        db.commit()
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"Erro ao gerar Pix no Mercado Pago: {e}")
    return {
        "message": "Pix gerado com sucesso!",
        "mp_payment_id": fin.mp_payment_id,
        "pix_copia_cola": fin.pix_copia_cola,
        "pix_qr_code_base64": fin.pix_qr_code_base64,
    }

@app.post("/appointments/admin/")
def create_admin_booking(
    booking: BookingRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Admin cria agendamento sem Pix."""
    service = db.query(models.Service).filter(models.Service.id == booking.service_id).first()
    if not service:
        raise HTTPException(status_code=404, detail="Serviço não encontrado.")

    client = db.query(models.Client).filter(models.Client.phone == booking.client_phone).first()
    if not client:
        client = models.Client(
            name=booking.client_name,
            phone=booking.client_phone,
            has_henna_allergy=booking.has_henna_allergy,
            medical_restrictions=booking.medical_restrictions,
        )
        db.add(client)
        db.commit()
        db.refresh(client)

    total_value = service.base_price
    balance_due = total_value - service.deposit_amount

    appointment = models.Appointment(
        client_id=client.id,
        service_id=service.id,
        scheduled_at=booking.scheduled_at,
        is_maintenance=booking.is_maintenance,
    )
    db.add(appointment)
    db.commit()
    db.refresh(appointment)

    financial = models.Financial(
        appointment_id=appointment.id,
        total_value=total_value,
        deposit_paid=0.0,
        balance_due=balance_due,
    )
    db.add(financial)
    db.commit()

    return {"message": "Atendimento criado com sucesso!", "appointment_id": appointment.id}

class RescheduleRequest(BaseModel):
    scheduled_at: datetime

@app.put("/appointments/{appointment_id}/reagendar/")
def reagendar(
    appointment_id: int,
    data: RescheduleRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    apt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    apt.scheduled_at = data.scheduled_at
    db.commit()
    return {"message": "Reagendado com sucesso!"}

@app.delete("/appointments/{appointment_id}/")
def cancelar(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    apt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    db.delete(apt)
    db.commit()
    return {"message": "Agendamento cancelado!"}

@app.post("/appointments/{appointment_id}/no-show/")
def mark_no_show(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    apt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    apt.status = "no_show"
    client = db.query(models.Client).filter(models.Client.id == apt.client_id).first()
    auto_blocked = False
    if client:
        client.no_show_count = (client.no_show_count or 0) + 1
        if client.no_show_count >= 2 and not client.is_blocked:
            client.is_blocked = True
            auto_blocked = True
    db.commit()
    return {"message": "Falta registrada.", "is_blocked": auto_blocked}

@app.post("/appointments/{appointment_id}/cliente-cancelou/")
def cliente_cancelou(
    appointment_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    apt = db.query(models.Appointment).filter(models.Appointment.id == appointment_id).first()
    if not apt:
        raise HTTPException(status_code=404, detail="Agendamento não encontrado.")
    client = db.query(models.Client).filter(models.Client.id == apt.client_id).first()
    if client:
        client.cancellation_count = (client.cancellation_count or 0) + 1
    db.delete(apt)
    db.commit()
    return {"message": "Cancelamento registrado."}

# ══════════════════════════════════════════════════════════════════════════════
# BLOQUEIO DE AGENDA
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/blocked-slots/", response_model=list[schemas.BlockedSlotResponse])
def get_blocked_slots(db: Session = Depends(get_db)):
    """Público — o calendário da cliente precisa saber quais datas estão bloqueadas."""
    return db.query(models.BlockedSlot).order_by(models.BlockedSlot.date.asc()).all()

@app.post("/blocked-slots/", response_model=schemas.BlockedSlotResponse)
def create_blocked_slot(
    slot: schemas.BlockedSlotCreate,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    db_slot = models.BlockedSlot(**slot.dict())
    db.add(db_slot)
    db.commit()
    db.refresh(db_slot)
    return db_slot

class BlockedRangeRequest(BaseModel):
    date_start: str
    date_end: str
    reason: Optional[str] = None

@app.post("/blocked-slots/range/")
def create_blocked_range(
    data: BlockedRangeRequest,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    from datetime import date as date_type, timedelta
    try:
        start = date_type.fromisoformat(data.date_start)
        end   = date_type.fromisoformat(data.date_end)
    except ValueError:
        raise HTTPException(status_code=400, detail="Formato de data inválido. Use YYYY-MM-DD.")
    if end < start:
        raise HTTPException(status_code=400, detail="A data final deve ser igual ou posterior à inicial.")
    created = []
    current = start
    while current <= end:
        existing = db.query(models.BlockedSlot).filter(models.BlockedSlot.date == current.isoformat()).first()
        if not existing:
            slot = models.BlockedSlot(date=current.isoformat(), reason=data.reason)
            db.add(slot)
            created.append(current.isoformat())
        current += timedelta(days=1)
    db.commit()
    return {"message": f"{len(created)} dia(s) bloqueado(s).", "dates": created}

@app.delete("/blocked-slots/{slot_id}/")
def delete_blocked_slot(
    slot_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    slot = db.query(models.BlockedSlot).filter(models.BlockedSlot.id == slot_id).first()
    if not slot:
        raise HTTPException(status_code=404, detail="Bloqueio não encontrado.")
    db.delete(slot)
    db.commit()
    return {"message": "Bloqueio removido!"}

# ══════════════════════════════════════════════════════════════════════════════
# ESTATÍSTICAS
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/stats/")
def get_stats(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    total_appointments = db.query(models.Appointment).count()

    service_counts = (
        db.query(
            models.Service.name,
            models.Service.category,
            func.count(models.Appointment.id).label("total"),
        )
        .outerjoin(models.Appointment, models.Service.id == models.Appointment.service_id)
        .group_by(models.Service.id)
        .order_by(func.count(models.Appointment.id).desc())
        .all()
    )

    fin = db.query(
        func.coalesce(func.sum(models.Financial.total_value), 0).label("receita"),
        func.coalesce(func.sum(models.Financial.deposit_paid), 0).label("sinais"),
        func.coalesce(func.sum(models.Financial.balance_due), 0).label("pendente"),
    ).first()

    ticket_medio = round(float(fin.receita) / total_appointments, 2) if total_appointments > 0 else 0

    return {
        "total_appointments": total_appointments,
        "ticket_medio": ticket_medio,
        "services": [{"name": s.name, "category": s.category, "total": s.total} for s in service_counts],
        "total_revenue": float(fin.receita),
        "total_deposits": float(fin.sinais),
        "total_pending": float(fin.pendente),
    }

# ══════════════════════════════════════════════════════════════════════════════
# CRM — CLIENTES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/clients/", response_model=list[schemas.ClientResponse])
def get_clients(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    return db.query(models.Client).order_by(models.Client.name.asc()).all()

@app.put("/clients/{client_id}/")
def update_client(
    client_id: int,
    data: schemas.ClientUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrada.")
    for field, value in data.dict(exclude_none=True).items():
        setattr(client, field, value)
    db.commit()
    return {"message": "Cliente atualizada!"}

@app.post("/clients/{client_id}/toggle-block/")
def toggle_block(
    client_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    client = db.query(models.Client).filter(models.Client.id == client_id).first()
    if not client:
        raise HTTPException(status_code=404, detail="Cliente não encontrada.")
    client.is_blocked = not client.is_blocked
    db.commit()
    return {"is_blocked": client.is_blocked}

# ══════════════════════════════════════════════════════════════════════════════
# PAINEL VIP — CLIENTE BUSCA POR TELEFONE (público)
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/minha-conta/{phone}/")
def minha_conta(phone: str, db: Session = Depends(get_db)):
    phone_digits = "".join(filter(str.isdigit, phone))
    suffix = phone_digits[-8:] if len(phone_digits) >= 8 else phone_digits
    client = db.query(models.Client).filter(models.Client.phone.contains(suffix)).first()
    if not client:
        raise HTTPException(status_code=404, detail="Nenhuma conta encontrada com este número.")
    apts = (
        db.query(models.Appointment)
        .filter(models.Appointment.client_id == client.id)
        .order_by(models.Appointment.scheduled_at.desc())
        .all()
    )
    return {
        "client": {
            "id": client.id,
            "name": client.name,
            "phone": client.phone,
            "instagram": client.instagram,
            "favorite_volume": client.favorite_volume,
            "sensitivity": client.sensitivity,
            "maintenance_frequency": client.maintenance_frequency,
            "has_henna_allergy": client.has_henna_allergy or False,
            "medical_restrictions": client.medical_restrictions,
            "no_show_count": client.no_show_count or 0,
            "is_blocked": client.is_blocked or False,
        },
        "appointments": [
            {
                "id": a.id,
                "scheduled_at": a.scheduled_at.isoformat(),
                "status": a.status,
                "service_name": a.service.name if a.service else None,
                "service_id": a.service_id,
                "total_value": a.financial.total_value if a.financial else None,
                "deposit_amount": (a.financial.total_value - a.financial.balance_due) if a.financial else None,
                "balance_due": a.financial.balance_due if a.financial else None,
                "pix_qr_code_base64": a.financial.pix_qr_code_base64 if a.financial else None,
                "pix_copia_cola": a.financial.pix_copia_cola if a.financial else None,
            }
            for a in apts
        ],
    }

# ══════════════════════════════════════════════════════════════════════════════
# PROMOÇÕES
# ══════════════════════════════════════════════════════════════════════════════

@app.get("/promotions/", response_model=list[schemas.PromotionResponse])
def get_promotions(db: Session = Depends(get_db)):
    """Público — lista promoções ativas para exibir no formulário de agendamento."""
    from datetime import date as _date
    today = _date.today().isoformat()
    return db.query(models.Promotion).filter(
        models.Promotion.is_active == True,
        (models.Promotion.valid_until == None) | (models.Promotion.valid_until >= today),
        (models.Promotion.valid_from  == None) | (models.Promotion.valid_from  <= today),
    ).all()

@app.get("/promotions/all/", response_model=list[schemas.PromotionResponse])
def get_all_promotions(
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    """Admin — lista todas as promoções incluindo inativas."""
    return db.query(models.Promotion).order_by(models.Promotion.created_at.desc()).all()

@app.post("/promotions/", response_model=schemas.PromotionResponse)
def create_promotion(
    data: schemas.PromotionCreate,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    if data.discount_type not in ("percent", "fixed"):
        raise HTTPException(status_code=400, detail="discount_type deve ser 'percent' ou 'fixed'.")
    if data.code:
        data.code = data.code.strip().upper()
        if db.query(models.Promotion).filter(models.Promotion.code == data.code).first():
            raise HTTPException(status_code=409, detail="Já existe uma promoção com este cupom.")
    promo = models.Promotion(**data.dict())
    db.add(promo)
    db.commit()
    db.refresh(promo)
    return promo

@app.put("/promotions/{promo_id}/", response_model=schemas.PromotionResponse)
def update_promotion(
    promo_id: int,
    data: schemas.PromotionUpdate,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    promo = db.query(models.Promotion).filter(models.Promotion.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promoção não encontrada.")
    for field, value in data.dict(exclude_none=True).items():
        if field == "code" and value:
            value = value.strip().upper()
        setattr(promo, field, value)
    db.commit()
    db.refresh(promo)
    return promo

@app.delete("/promotions/{promo_id}/")
def delete_promotion(
    promo_id: int,
    db: Session = Depends(get_db),
    _: None = Depends(verify_admin),
):
    promo = db.query(models.Promotion).filter(models.Promotion.id == promo_id).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Promoção não encontrada.")
    db.delete(promo)
    db.commit()
    return {"message": "Promoção removida."}

@app.post("/promotions/validate/")
def validate_promo(
    body: dict,
    db: Session = Depends(get_db),
):
    """Público — cliente valida cupom antes de submeter o agendamento."""
    from datetime import date as _date
    code = (body.get("code") or "").strip().upper()
    service_id = body.get("service_id")
    if not code:
        raise HTTPException(status_code=400, detail="Informe o cupom.")
    promo = db.query(models.Promotion).filter(
        models.Promotion.code == code,
        models.Promotion.is_active == True,
    ).first()
    if not promo:
        raise HTTPException(status_code=404, detail="Cupom inválido ou inativo.")
    today = _date.today()
    if promo.valid_from and today < _date.fromisoformat(promo.valid_from):
        raise HTTPException(status_code=400, detail="Este cupom ainda não está ativo.")
    if promo.valid_until and today > _date.fromisoformat(promo.valid_until):
        raise HTTPException(status_code=400, detail="Este cupom está expirado.")
    if promo.max_uses and promo.uses_count >= promo.max_uses:
        raise HTTPException(status_code=400, detail="Este cupom atingiu o limite de usos.")
    if service_id and promo.applies_to != "all":
        from sqlalchemy.orm import Session as _S
        svc = db.query(models.Service).filter(models.Service.id == service_id).first()
        if svc and svc.category != promo.applies_to:
            raise HTTPException(status_code=400, detail="Cupom não se aplica a este serviço.")
    return {
        "valid": True,
        "name": promo.name,
        "discount_type": promo.discount_type,
        "discount_value": promo.discount_value,
        "applies_to": promo.applies_to,
    }

# ══════════════════════════════════════════════════════════════════════════════
# WEBHOOK — MERCADO PAGO
# Confirma pagamentos Pix automaticamente quando o MP notifica.
# Configure MERCADOPAGO_WEBHOOK_SECRET no Render com o valor gerado no
# painel do MP em "Suas integrações → Webhooks".
# ══════════════════════════════════════════════════════════════════════════════

def _validate_mp_signature(payment_id: str, request_id: str, ts: str, v1: str) -> bool:
    """Valida a assinatura HMAC-SHA256 do webhook do Mercado Pago."""
    if not MP_WEBHOOK_SECRET:
        return True  # Em desenvolvimento (sem secret), aceita tudo
    manifest = f"id:{payment_id};request-id:{request_id};ts:{ts};"
    expected = hmac.new(
        MP_WEBHOOK_SECRET.encode("utf-8"),
        manifest.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()
    return hmac.compare_digest(expected, v1)

@app.post("/webhooks/mercadopago/")
async def mp_webhook(request: Request, db: Session = Depends(get_db)):
    body = await request.json()

    # Valida assinatura se o secret estiver configurado
    if MP_WEBHOOK_SECRET:
        sig_header = request.headers.get("x-signature", "")
        x_request_id = request.headers.get("x-request-id", "")
        ts = v1 = ""
        for part in sig_header.split(","):
            part = part.strip()
            if part.startswith("ts="):
                ts = part[3:]
            elif part.startswith("v1="):
                v1 = part[3:]
        payment_id_str = str(body.get("data", {}).get("id", ""))
        if not _validate_mp_signature(payment_id_str, x_request_id, ts, v1):
            raise HTTPException(status_code=400, detail="Assinatura inválida.")

    # Processa notificação de pagamento aprovado
    if body.get("type") == "payment":
        payment_id = str(body.get("data", {}).get("id", ""))
        if not payment_id:
            return {"status": "ignored"}
        try:
            mp_resp = sdk.payment().get(payment_id)
            if mp_resp.get("status") == 200:
                payment = mp_resp["response"]
                if payment.get("status") == "approved":
                    amount = float(payment.get("transaction_amount", 0))
                    fin = (
                        db.query(models.Financial)
                        .filter(models.Financial.mp_payment_id == payment_id)
                        .first()
                    )
                    if fin:
                        fin.deposit_paid = amount
                        fin.balance_due  = max(fin.total_value - amount, 0)
                        apt = db.query(models.Appointment).filter(
                            models.Appointment.id == fin.appointment_id
                        ).first()
                        if apt and apt.status == "confirmed":
                            apt.status = "scheduled"
                        db.commit()
        except Exception:
            pass  # Log em produção; não deve derrubar o webhook

    return {"status": "ok"}
