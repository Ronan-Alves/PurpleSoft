from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


class Office(Base):
    __tablename__ = "offices"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)

    customers: Mapped[list["Customer"]] = relationship(back_populates="office")
    demands: Mapped[list["Demand"]] = relationship(back_populates="office")


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    office_id: Mapped[str] = mapped_column(ForeignKey("offices.id"), nullable=False, index=True)
    legal_name: Mapped[str] = mapped_column(String(180), nullable=False)
    cnpj: Mapped[str] = mapped_column(String(24), nullable=False, unique=True)
    trade_name: Mapped[str | None] = mapped_column(String(160))
    contract_address: Mapped[str | None] = mapped_column(String(240))
    contract_city_state: Mapped[str | None] = mapped_column(String(120))
    contract_email: Mapped[str | None] = mapped_column(String(160))
    other_service_description: Mapped[str | None] = mapped_column(String(240))

    office: Mapped[Office] = relationship(back_populates="customers")
    contacts: Mapped[list["CustomerContact"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    service_interests: Mapped[list["CustomerServiceInterest"]] = relationship(back_populates="customer", cascade="all, delete-orphan")
    demands: Mapped[list["Demand"]] = relationship(back_populates="customer")
    access: Mapped["ClientAccess | None"] = relationship(back_populates="customer", cascade="all, delete-orphan")
    pendings: Mapped[list["ClientPending"]] = relationship(back_populates="customer", cascade="all, delete-orphan")


class CustomerContact(Base):
    __tablename__ = "customer_contacts"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(140), nullable=False)
    role: Mapped[str] = mapped_column(String(120), nullable=False)
    phone: Mapped[str] = mapped_column(String(40), nullable=False)
    email: Mapped[str] = mapped_column(String(160), nullable=False)

    customer: Mapped[Customer] = relationship(back_populates="contacts")


class CustomerServiceInterest(Base):
    __tablename__ = "customer_service_interests"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"), nullable=False, index=True)
    service_type: Mapped[str] = mapped_column(String(40), nullable=False)

    customer: Mapped[Customer] = relationship(back_populates="service_interests")


class ClientAccess(Base):
    __tablename__ = "client_accesses"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"), nullable=False, unique=True, index=True)
    email: Mapped[str] = mapped_column(String(160), nullable=False, unique=True)
    password: Mapped[str] = mapped_column(String(80), nullable=False)
    created_at: Mapped[str] = mapped_column(String(20), nullable=False)

    customer: Mapped[Customer] = relationship(back_populates="access")


class ClientPending(Base):
    __tablename__ = "client_pendings"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    created_at: Mapped[str] = mapped_column(String(20), nullable=False)
    form_type: Mapped[str] = mapped_column(String(80), nullable=False)

    customer: Mapped[Customer] = relationship(back_populates="pendings")


class AccountingClientCompany(Base):
    __tablename__ = "accounting_client_companies"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"), nullable=False, index=True)
    pending_id: Mapped[str] = mapped_column(ForeignKey("client_pendings.id"), nullable=False, index=True)
    company_name: Mapped[str] = mapped_column(String(180), nullable=False)
    cnpj: Mapped[str] = mapped_column(String(24), nullable=False)
    tax_regime: Mapped[str] = mapped_column(String(80), nullable=False)
    sped_ecd_delivery: Mapped[str] = mapped_column(String(80), nullable=False)
    financial_system_reports: Mapped[str] = mapped_column(String(80), nullable=False)
    only_bank_statements: Mapped[str] = mapped_column(String(80), nullable=False)
    banks_used: Mapped[str] = mapped_column(Text, nullable=False)
    average_bank_pages: Mapped[str] = mapped_column(String(120), nullable=False)
    has_application_statements_pdf: Mapped[str] = mapped_column(String(80), nullable=False)
    accounting_delayed: Mapped[str] = mapped_column(String(80), nullable=False)
    wants_accounting_regularization: Mapped[str] = mapped_column(String(80), nullable=False)
    closing_frequency: Mapped[str] = mapped_column(String(80), nullable=False)
    system_used: Mapped[str] = mapped_column(String(160), nullable=False)
    wants_sped_ecd_ecf: Mapped[str] = mapped_column(String(80), nullable=False)
    sped_period: Mapped[str] = mapped_column(String(120), nullable=False)
    created_at: Mapped[str] = mapped_column(String(20), nullable=False)


class WorkArea(Base):
    __tablename__ = "work_areas"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    kind: Mapped[str] = mapped_column(String(40), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    position_x: Mapped[int] = mapped_column(nullable=False)
    position_y: Mapped[int] = mapped_column(nullable=False)
    wip: Mapped[int] = mapped_column(default=0)
    pending: Mapped[int] = mapped_column(default=0)
    priority: Mapped[int] = mapped_column(default=0)

    tasks: Mapped[list["Task"]] = relationship(back_populates="area", cascade="all, delete-orphan")


class Demand(Base):
    __tablename__ = "demands"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    title: Mapped[str] = mapped_column(String(180), nullable=False)
    office_id: Mapped[str] = mapped_column(ForeignKey("offices.id"), nullable=False, index=True)
    customer_id: Mapped[str] = mapped_column(ForeignKey("customers.id"), nullable=False, index=True)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    priority: Mapped[str] = mapped_column(String(40), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False, default="")
    due_date: Mapped[str] = mapped_column(String(20), nullable=False)
    created_at: Mapped[str] = mapped_column(String(20), nullable=False)
    financial_status: Mapped[str] = mapped_column(String(80), nullable=False)

    office: Mapped[Office] = relationship(back_populates="demands")
    customer: Mapped[Customer] = relationship(back_populates="demands")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    client_name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    area_id: Mapped[str] = mapped_column(ForeignKey("work_areas.id"), nullable=False)

    area: Mapped[WorkArea] = relationship(back_populates="tasks")


class Procedure(Base):
    __tablename__ = "procedures"

    station_key: Mapped[str] = mapped_column(String(120), primary_key=True)
    text: Mapped[str] = mapped_column(Text, nullable=False)


class StationTime(Base):
    __tablename__ = "station_times"

    station_key: Mapped[str] = mapped_column(String(120), primary_key=True)
    elapsed_seconds: Mapped[int] = mapped_column(default=0, nullable=False)


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[str] = mapped_column(String(64), primary_key=True)
    occurred_at: Mapped[str] = mapped_column(String(40), nullable=False, index=True)
    actor_type: Mapped[str] = mapped_column(String(40), nullable=False)
    actor_subject: Mapped[str] = mapped_column(String(180), nullable=False)
    action: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entity_type: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    entity_id: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    customer_id: Mapped[str | None] = mapped_column(String(64), index=True)
    details: Mapped[str] = mapped_column(Text, nullable=False, default="{}")
