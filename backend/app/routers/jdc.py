from pydantic import BaseModel
from fastapi import APIRouter, HTTPException

from app.schemas.airport import JdcStore
from app.schemas.jdc import (
    JdcWayfinderResponse,
    NearbyStore,
    ShoppingRouteRequest,
    ShoppingRouteResponse,
)
from app.services import jdc_client, jdc_route_service

router = APIRouter(prefix="/api/jdc", tags=["jdc"])


class JdcStoreResponse(BaseModel):
    stores: list[JdcStore]
    data_limitations: list[str]


@router.get("/stores", response_model=JdcStoreResponse)
def stores() -> JdcStoreResponse:
    return JdcStoreResponse(
        stores=jdc_client.get_stores(),
        data_limitations=jdc_client.DATA_LIMITATIONS,
    )


@router.get("/wayfinder", response_model=JdcWayfinderResponse)
def wayfinder() -> JdcWayfinderResponse:
    return jdc_route_service.get_wayfinder()


@router.get("/nearby", response_model=list[NearbyStore])
def nearby(gate: int) -> list[NearbyStore]:
    try:
        return jdc_route_service.nearby_stores(gate)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc


@router.post("/shopping-route", response_model=ShoppingRouteResponse)
def shopping_route(payload: ShoppingRouteRequest) -> ShoppingRouteResponse:
    try:
        return jdc_route_service.build_shopping_route(payload)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
