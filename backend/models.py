from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base

class Client(Base):
    __tablename__ = "clients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    phone = Column(String, unique=True, index=True, nullable=False)
    instagram = Column(String, nullable=True)
    has_henna_allergy = Column(Boolean, default=False)
    medical_restrictions = Column(Text, nullable=True)
    # Preferências
    favorite_volume = Column(String, nullable=True)          # Ex: "Volume Russo", "Clássico"
    sensitivity = Column(String, nullable=True)              # baixa | media | alta
    maintenance_frequency = Column(Integer, nullable=True)   # dias: 14, 21, 28
    # Controle de faltas
    no_show_count = Column(Integer, default=0)
    cancellation_count = Column(Integer, default=0)
    is_blocked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    appointments = relationship("Appointment", back_populates="client", cascade="all, delete-orphan")

class Service(Base):
    __tablename__ = "services"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, index=True, nullable=False)
    category = Column(String, nullable=False)  # 'cilios', 'sobrancelha', 'remocao'
    base_price = Column(Float, nullable=False)
    deposit_amount = Column(Float, nullable=False)
    estimated_minutes = Column(Integer, nullable=False)
    is_active = Column(Boolean, default=True)

    appointments = relationship("Appointment", back_populates="service")

class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(Integer, primary_key=True, index=True)
    client_id = Column(Integer, ForeignKey("clients.id"), nullable=False)
    service_id = Column(Integer, ForeignKey("services.id"), nullable=False)
    scheduled_at = Column(DateTime, index=True, nullable=False)
    is_maintenance = Column(Boolean, default=False)
    status = Column(String, default="scheduled") # Opções: scheduled, completed, cancelled

    # Relações
    client = relationship("Client", back_populates="appointments")
    service = relationship("Service", back_populates="appointments")
    # uselist=False garante relação 1 para 1 (Um agendamento tem apenas um registro financeiro)
    financial = relationship("Financial", back_populates="appointment", uselist=False, cascade="all, delete-orphan")

class BlockedSlot(Base):
    __tablename__ = "blocked_slots"

    id = Column(Integer, primary_key=True, index=True)
    date = Column(String, nullable=False)        # Formato: YYYY-MM-DD
    reason = Column(String, nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class Financial(Base):
    __tablename__ = "financials"

    id = Column(Integer, primary_key=True, index=True)
    appointment_id = Column(Integer, ForeignKey("appointments.id"), unique=True, nullable=False)
    total_value = Column(Float, nullable=False) # Preço final calculado (pode variar se for manutenção de 15, 20 ou 25 dias)
    deposit_paid = Column(Float, default=0.0) # Valor efetivamente pago no Pix de sinal
    balance_due = Column(Float, nullable=False) # O que falta pagar na hora (total_value - deposit_paid)
    payment_method = Column(String, nullable=True) # 'dinheiro', 'pix', 'cartao'
    machine_fee_applied = Column(Boolean, default=False) # True se a cliente passou cartão

    refund_amount = Column(Float, nullable=True)
    refund_reason = Column(String, nullable=True)
    mp_payment_id = Column(String, nullable=True)
    pix_qr_code_base64 = Column(Text, nullable=True)
    pix_copia_cola = Column(Text, nullable=True)

    appointment = relationship("Appointment", back_populates="financial")