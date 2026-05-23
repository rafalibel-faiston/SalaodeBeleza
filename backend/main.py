from fastapi import FastAPI, Depends, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
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

app = FastAPI(title="API Salão de Cílios - Giovanna Soares")

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
    db_url = os.getenv("DATABASE_URL", "sqlite:///./banco_salao.db")

    if db_url.startswith("sqlite"):
        import sqlite3 as _sqlite3
        db_path = db_url.replace("sqlite:///", "")
        raw = _sqlite3.connect(db_path)
        try:
            def _cols(table):
                return {r[1] for r in raw.execute(f"PRAGMA table_info({table})")}

            needed = {
                "clients": [
                    ("instagram", "TEXT"),
                    ("favorite_volume", "TEXT"),
                    ("sensitivity", "TEXT"),
                    ("maintenance_frequency", "INTEGER"),
                    ("no_show_count", "INTEGER DEFAULT 0"),
                    ("cancellation_count", "INTEGER DEFAULT 0"),
                    ("is_blocked", "INTEGER DEFAULT 0"),
                ],
                "services": [
                    ("is_active", "INTEGER DEFAULT 1"),
                ],
                "financials": [
                    ("refund_amount", "REAL"),
                    ("refund_reason", "TEXT"),
                    ("mp_payment_id", "TEXT"),
                    ("pix_qr_code_base64", "TEXT"),
                    ("pix_copia_cola", "TEXT"),
                ],
            }

            for table, columns in needed.items():
                existing = _cols(table)
                for col, col_type in columns:
                    if col not in existing:
                        raw.execute(f"ALTER TABLE {table} ADD COLUMN {col} {col_type}")
            raw.commit()
        finally:
            raw.close()

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
def login(data: LoginRequest):
    """
    Autentica a Giovanna. Retorna JWT válido por JWT_EXPIRE_HOURS horas.
    Configure ADMIN_PASSWORD e JWT_SECRET nas variáveis de ambiente do Render.
    """
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
    balance_due = total_value - service.deposit_amount

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
            "INSERT INTO financials (appointment_id, total_value, deposit_paid, balance_due)"
            " VALUES (:aid, :tv, :dp, :bd)"
        ),
        {"aid": appointment.id, "tv": total_value, "dp": 0.0, "bd": balance_due},
    )
    db.commit()

    return {
        "appointment_id": appointment.id,
        "status": "pending",
        "service_name": service.name,
        "client_name": client.name,
        "scheduled_at": appointment.scheduled_at.isoformat(),
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
    db.commit()
    return {"message": "Status atualizado!", "status": apt.status}

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
                "total_value": a.financial.total_value if a.financial else None,
                "balance_due": a.financial.balance_due if a.financial else None,
            }
            for a in apts
        ],
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
                        db.commit()
        except Exception:
            pass  # Log em produção; não deve derrubar o webhook

    return {"status": "ok"}
