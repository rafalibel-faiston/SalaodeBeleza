from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# --- SCHEMAS PARA SERVIÇOS ---
class ServiceBase(BaseModel):
    name: str
    category: str
    base_price: float
    deposit_amount: float
    estimated_minutes: int

class ServiceCreate(ServiceBase):
    pass

class ServiceResponse(ServiceBase):
    id: int
    is_active: Optional[bool] = True

    class Config:
        from_attributes = True

# --- SCHEMAS PARA CLIENTES ---
class ClientBase(BaseModel):
    name: str
    phone: str
    has_henna_allergy: bool = False
    medical_restrictions: Optional[str] = None

class ClientCreate(ClientBase):
    pass

class ClientUpdate(BaseModel):
    instagram: Optional[str] = None
    favorite_volume: Optional[str] = None
    sensitivity: Optional[str] = None
    maintenance_frequency: Optional[int] = None
    has_henna_allergy: Optional[bool] = None
    medical_restrictions: Optional[str] = None

class ClientResponse(ClientBase):
    id: int
    instagram: Optional[str] = None
    favorite_volume: Optional[str] = None
    sensitivity: Optional[str] = None
    maintenance_frequency: Optional[int] = None
    no_show_count: Optional[int] = 0
    cancellation_count: Optional[int] = 0
    is_blocked: Optional[bool] = False
    created_at: datetime

    class Config:
        from_attributes = True

# --- SCHEMAS PARA O FINANCEIRO ---
class FinancialBase(BaseModel):
    total_value: float
    deposit_paid: float
    balance_due: float
    payment_method: Optional[str] = None
    machine_fee_applied: Optional[bool] = False

class FinancialResponse(FinancialBase):
    id: int
    appointment_id: int
    refund_amount: Optional[float] = None
    refund_reason: Optional[str] = None

    class Config:
        from_attributes = True

# --- SCHEMAS PARA BLOQUEIO DE AGENDA ---
class BlockedSlotCreate(BaseModel):
    date: str
    reason: Optional[str] = None

class BlockedSlotResponse(BlockedSlotCreate):
    id: int
    created_at: datetime

    class Config:
        from_attributes = True

# --- SCHEMAS PARA AGENDAMENTOS ---
class AppointmentBase(BaseModel):
    client_id: int
    service_id: int
    scheduled_at: datetime
    is_maintenance: bool = False

class AppointmentCreate(AppointmentBase):
    pass

class AppointmentResponse(AppointmentBase):
    id: int
    status: str
    client: Optional[ClientResponse] = None
    service: Optional[ServiceResponse] = None
    financial: Optional[FinancialResponse] = None

    class Config:
        from_attributes = True
