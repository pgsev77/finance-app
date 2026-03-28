from pydantic import BaseModel, ConfigDict


class LoginRequest(BaseModel):
    username: str
    password: str


class AutoRegisterRequest(BaseModel):
    provider: str
    provider_uid: str


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    username: str
    role: str
    is_active: bool
    force_change_password: bool


class LoginResponse(BaseModel):
    token: str
    user: UserOut
