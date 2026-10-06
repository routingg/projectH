from pydantic import BaseModel, Field


class JdcStoreInfo(BaseModel):
    id: str
    name: str
    short_name: str
    location_label: str
    near_gates: list[int]


class JdcShop(BaseModel):
    id: str
    name: str
    code: str | None = None      # 매장(POS) 코드
    category: str
    category_label: str
    store_id: str
    zone: str                    # 매장 내부 구획 (주류/패션/화장품·향수 ...)
    aliases: list[str] = []      # 이 매장에서 취급하는 다른 브랜드명


class JdcCategory(BaseModel):
    id: str
    label: str
    shop_count: int


class JdcWayfinderResponse(BaseModel):
    stores: list[JdcStoreInfo]
    shops: list[JdcShop]
    categories: list[JdcCategory]
    gates: list[int]
    source: str
    extracted_at: str


class NearbyStore(BaseModel):
    store: JdcStoreInfo
    meters: int
    minutes: int
    shop_count: int


class ShoppingRouteRequest(BaseModel):
    departure_time: str = Field(examples=["18:30"])
    categories: list[str] = Field(min_length=1, examples=[["cosmetics", "liquor"]])
    # 쇼핑 시작 시각. 없으면 출발 시각 - DEFAULT_SHOP_WINDOW 분으로 가정한다.
    start_time: str | None = Field(default=None, examples=["17:10"])
    # 현재 위치(Gate 번호). 있으면 첫 매장까지의 이동과 방문 방향을 반영한다.
    from_gate: int | None = Field(default=None, ge=1, le=12)


class ShoppingStop(BaseModel):
    order: int
    store: JdcStoreInfo
    walk_meters: int             # 직전 위치에서 이 매장까지
    walk_minutes: int
    arrive: str
    leave: str
    shop_minutes: int            # 이 매장에서 쓸 수 있는 쇼핑 시간
    shops: list[JdcShop]


class ShoppingRouteResponse(BaseModel):
    feasible: bool
    start_time: str
    shopping_deadline: str       # 탑승 마감 시각 (출발 - 마감 버퍼)
    available_minutes: int
    walk_minutes: int
    shopping_minutes: int
    stops: list[ShoppingStop]
    missing_categories: list[str]
    assumptions: list[str]
    source: str
