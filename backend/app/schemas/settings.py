from pydantic import BaseModel, ConfigDict


class SettingsOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    default_needs_confirm: bool
    confirm_rules: list


class SettingsUpdate(BaseModel):
    default_needs_confirm: bool | None = None
    confirm_rules: list | None = None


class PasswordChange(BaseModel):
    old_password: str
    new_password: str


class BindFeishu(BaseModel):
    provider_uid: str
