from pydantic import BaseModel


class LoginRequest(BaseModel):
    email: str
    password: str


class LoginResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    name: str
    role: str


class WorkAreaOut(BaseModel):
    id: str
    name: str
    kind: str
    status: str
    position_x: int
    position_y: int
    wip: int
    pending: int
    priority: int


class TaskOut(BaseModel):
    id: int
    title: str
    client_name: str
    status: str
    area_id: str


class OperationMap(BaseModel):
    areas: list[WorkAreaOut]
    tasks: list[TaskOut]
    summary: dict[str, int | float]
