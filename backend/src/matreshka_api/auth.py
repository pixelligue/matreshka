"""Email/password login, public register, and Redis bearer sessions."""

from __future__ import annotations

import secrets
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Response
from pwdlib import PasswordHash
from pydantic import BaseModel, ConfigDict
from redis.asyncio import Redis
from sqlalchemy.exc import IntegrityError
from sqlmodel import SQLModel, Session, select

from matreshka_api.db import RedisDep, SessionDep, SettingsDep, create_sync_engine
from matreshka_api.models import User
from matreshka_api.settings import Settings, load_settings, sync_database_url

password_hasher = PasswordHash.recommended()
_DUMMY_PASSWORD_HASH = password_hasher.hash("__matreshka-timing-dummy__")
DESKTOP_CODE_TTL_SECONDS = 60
MIN_PASSWORD_LENGTH = 8

router = APIRouter(prefix="/v1/auth", tags=["auth"])


class UserAlreadyExistsError(Exception):
    def __init__(self, email: str) -> None:
        super().__init__(f"User already exists: {email}")
        self.email = email


class LoginRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    email: str
    password: str


class LoginResponse(BaseModel):
    token: str
    email: str


class DesktopCodeResponse(BaseModel):
    code: str
    expiresIn: int


class ExchangeRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    code: str = ""


def hash_password(password: str) -> str:
    return password_hasher.hash(password)


def verify_password(password: str, password_hash: str) -> bool:
    return password_hasher.verify(password, password_hash)


def provision_user(
    email: str,
    password: str,
    settings: Settings | None = None,
) -> User:
    """Create an operator user. Raises UserAlreadyExistsError on duplicate email."""
    resolved = settings if settings is not None else load_settings()
    engine = create_sync_engine(sync_database_url(resolved.database_url))
    try:
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            existing = session.exec(select(User).where(User.email == email)).first()
            if existing is not None:
                raise UserAlreadyExistsError(email)
            user = User(email=email, password_hash=hash_password(password))
            session.add(user)
            try:
                session.commit()
            except IntegrityError as exc:
                session.rollback()
                raise UserAlreadyExistsError(email) from exc
            session.refresh(user)
            return user
    finally:
        engine.dispose()


def session_key(token: str) -> str:
    return f"session:{token}"


def desktop_code_key(code: str) -> str:
    return f"desktop-code:{code}"


def register_email_ok(email: str) -> bool:
    if "@" not in email:
        return False
    local, _, domain = email.partition("@")
    return bool(local) and "." in domain


async def issue_session(redis: Redis, settings: Settings, user: User) -> LoginResponse:
    token = secrets.token_urlsafe(32)
    await redis.set(session_key(token), str(user.id), ex=settings.session_ttl_seconds)
    return LoginResponse(token=token, email=user.email)


async def get_current_user(
    session: SessionDep,
    redis: RedisDep,
    authorization: Annotated[str | None, Header()] = None,
) -> User:
    if authorization is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    scheme, separator, token = authorization.partition(" ")
    if separator == "" or scheme.lower() != "bearer" or not token:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_id = await redis.get(session_key(token))
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    try:
        pk = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid credentials") from None
    user = await session.get(User, pk)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return user


CurrentUserDep = Annotated[User, Depends(get_current_user)]


@router.post("/login")
async def login(
    body: LoginRequest,
    session: SessionDep,
    redis: RedisDep,
    settings: SettingsDep,
) -> LoginResponse:
    result = await session.exec(select(User).where(User.email == body.email))
    user = result.first()
    password_hash = user.password_hash if user is not None else _DUMMY_PASSWORD_HASH
    password_ok = verify_password(body.password, password_hash)
    if user is None or not password_ok:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    return await issue_session(redis, settings, user)


@router.post("/register", status_code=201)
async def register(
    body: LoginRequest,
    session: SessionDep,
    redis: RedisDep,
    settings: SettingsDep,
) -> LoginResponse:
    email = body.email.strip()
    if not register_email_ok(email) or len(body.password) < MIN_PASSWORD_LENGTH:
        raise HTTPException(status_code=400, detail="Invalid email or password")
    existing = await session.exec(select(User).where(User.email == email))
    if existing.first() is not None:
        raise HTTPException(status_code=409, detail="User already exists")
    user = User(email=email, password_hash=hash_password(body.password))
    session.add(user)
    try:
        await session.commit()
    except IntegrityError as exc:
        await session.rollback()
        raise HTTPException(status_code=409, detail="User already exists") from exc
    await session.refresh(user)
    return await issue_session(redis, settings, user)


@router.post("/desktop-code")
async def mint_desktop_code(
    user: CurrentUserDep,
    redis: RedisDep,
) -> DesktopCodeResponse:
    code = secrets.token_urlsafe(16)
    await redis.set(desktop_code_key(code), str(user.id), ex=DESKTOP_CODE_TTL_SECONDS)
    return DesktopCodeResponse(code=code, expiresIn=DESKTOP_CODE_TTL_SECONDS)


@router.post("/exchange")
async def exchange_desktop_code(
    body: ExchangeRequest,
    session: SessionDep,
    redis: RedisDep,
    settings: SettingsDep,
) -> LoginResponse:
    code = body.code.strip()
    if not code:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    user_id = await redis.getdel(desktop_code_key(code))
    if user_id is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    try:
        pk = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(status_code=401, detail="Invalid credentials") from None
    user = await session.get(User, pk)
    if user is None:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return await issue_session(redis, settings, user)


@router.post("/logout", status_code=204)
async def logout(
    redis: RedisDep,
    authorization: Annotated[str | None, Header()] = None,
) -> Response:
    """Delete the Redis session for a bearer token. Always 204."""
    if authorization is not None:
        scheme, separator, token = authorization.partition(" ")
        if separator != "" and scheme.lower() == "bearer" and token:
            await redis.delete(session_key(token))
    return Response(status_code=204)
