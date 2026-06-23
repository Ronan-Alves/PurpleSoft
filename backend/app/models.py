from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .database import Base


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


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    title: Mapped[str] = mapped_column(String(160), nullable=False)
    client_name: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[str] = mapped_column(String(40), nullable=False)
    area_id: Mapped[str] = mapped_column(ForeignKey("work_areas.id"), nullable=False)

    area: Mapped[WorkArea] = relationship(back_populates="tasks")
