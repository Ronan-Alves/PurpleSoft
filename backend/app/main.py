from datetime import datetime, timedelta, timezone

from fastapi import Depends, FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from jose import jwt
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import Base, SessionLocal, engine, get_db
from .models import Task, WorkArea
from .schemas import LoginRequest, LoginResponse, OperationMap, TaskOut, WorkAreaOut
from .seed import seed_database
from .settings import settings

app = FastAPI(title="PurpleSoft API", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        seed_database(db)


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/auth/login", response_model=LoginResponse)
def login(payload: LoginRequest) -> LoginResponse:
    if not payload.email or not payload.password:
        raise HTTPException(status_code=400, detail="Informe email e senha.")

    expires_at = datetime.now(timezone.utc) + timedelta(hours=8)
    token = jwt.encode({"sub": payload.email, "exp": expires_at}, settings.jwt_secret, algorithm="HS256")
    return LoginResponse(access_token=token, name="Gerente Operacional", role="Operacao")


@app.get("/operation-map", response_model=OperationMap)
def operation_map(db: Session = Depends(get_db)) -> OperationMap:
    areas = db.scalars(select(WorkArea)).all()
    tasks = db.scalars(select(Task)).all()
    running = sum(1 for task in tasks if task.status == "running")
    blocked = sum(1 for task in tasks if task.status == "blocked")
    attention = sum(area.priority for area in areas)
    done = sum(1 for task in tasks if task.status == "done")

    return OperationMap(
        areas=[WorkAreaOut.model_validate(area, from_attributes=True) for area in areas],
        tasks=[TaskOut.model_validate(task, from_attributes=True) for task in tasks],
        summary={
            "running": running,
            "pending": sum(area.pending for area in areas),
            "priority": attention,
            "blocked": blocked,
            "productivity": 78,
            "quality": 96,
            "done": done,
        },
    )
