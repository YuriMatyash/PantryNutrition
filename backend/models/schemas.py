"""Pydantic request/response schemas for API routes."""

from pydantic import BaseModel, Field


class RegisterRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class LoginRequest(BaseModel):
    username: str = Field(..., min_length=1)
    password: str = Field(..., min_length=1)


class PantryItem(BaseModel):
    name: str
    amount: float
    unit: str


class PantryUpdateRequest(BaseModel):
    items: list[PantryItem]
