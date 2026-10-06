"""출도 시간 기반 JDC 면세점 쇼핑 경로.

데이터: JDC 웨이파인더(jdc-shopping-guide) 의 실제 매장·입점 브랜드·Gate 동선 그래프.
이동 시간은 그 사이트와 같은 환산식을 쓴다 (미터 = 1.2 × 가중치, 분 = 미터 / 70).

선택한 카테고리의 입점 매장이 있는 면세점(동편·본·서편)을 복도 순서대로 방문하도록 짜고,
탑승 마감까지 남은 시간에서 이동 시간을 뺀 나머지를 매장별 입점 수에 비례해 배분한다.
카테고리별 체류 시간 같은 근거 없는 수치는 쓰지 않는다. 매장 내부 이동은 반영하지 않는다.
"""
import heapq
from functools import lru_cache

from app.schemas.jdc import (
    JdcCategory,
    JdcShop,
    JdcStoreInfo,
    JdcWayfinderResponse,
    NearbyStore,
    ShoppingRouteRequest,
    ShoppingRouteResponse,
    ShoppingStop,
)
from app.services import data_loader

# 안내용 가정값 — 응답 assumptions 로 사용자에게 노출한다.
BOARDING_CLOSE_BUFFER_MIN = 20   # 탑승 마감: 출발 20분 전
DEFAULT_SHOP_WINDOW_MIN = 80     # start_time 미지정 시: 출발 80분 전부터 (도착 2시간 전 + 수속·보안 40분)
# 쇼핑 대상이 아닌 구획 (이벤트 팝업, 결제 데스크 등)
EXCLUDED_CATEGORIES = {"event", "service"}


def _to_min(hhmm: str) -> int | None:
    try:
        h, m = (int(x) for x in hhmm.split(":"))
    except (ValueError, AttributeError):
        return None
    if not (0 <= h < 24 and 0 <= m < 60):
        return None
    return h * 60 + m


def _fmt(minutes: int) -> str:
    minutes %= 24 * 60
    return f"{minutes // 60:02d}:{minutes % 60:02d}"


@lru_cache
def _graph() -> dict[str, list[tuple[str, int]]]:
    adj: dict[str, list[tuple[str, int]]] = {}
    for e in data_loader.load_jdc_wayfinder()["edges"]:
        adj.setdefault(e["from"], []).append((e["to"], e["weight"]))
        adj.setdefault(e["to"], []).append((e["from"], e["weight"]))
    return adj


@lru_cache(maxsize=None)
def _dijkstra(src: str) -> dict[str, int]:
    dist = {src: 0}
    heap = [(0, src)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, float("inf")):
            continue
        for v, w in _graph().get(u, []):
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return dist


def _walk(weight: int) -> tuple[int, int]:
    """그래프 가중치 → (미터, 분). JDC 웨이파인더와 동일 환산."""
    w = data_loader.load_jdc_wayfinder()["walk"]
    meters = round(w["outer_meters_per_weight"] * weight)
    return meters, max(1, round(meters / w["outer_meters_per_minute"]))


def _store_infos() -> list[JdcStoreInfo]:
    d = data_loader.load_jdc_wayfinder()
    node_x = {n["id"]: n["x"] for n in d["nodes"]}
    stores = sorted(d["stores"], key=lambda s: node_x[s["node_id"]])  # 복도 순서
    keys = ("id", "name", "short_name", "location_label", "near_gates")
    return [JdcStoreInfo(**{k: s[k] for k in keys}) for s in stores]


def _shops() -> list[JdcShop]:
    d = data_loader.load_jdc_wayfinder()
    labels = d["category_labels"]
    return [
        JdcShop(**s, category_label=labels.get(s["category"], s["category"]))
        for s in d["shops"]
    ]


def _node_of_store() -> dict[str, str]:
    return {s["id"]: s["node_id"] for s in data_loader.load_jdc_wayfinder()["stores"]}


def get_wayfinder() -> JdcWayfinderResponse:
    d = data_loader.load_jdc_wayfinder()
    shops = _shops()
    counts: dict[str, int] = {}
    for s in shops:
        counts[s.category] = counts.get(s.category, 0) + 1
    cats = [
        JdcCategory(id=c, label=d["category_labels"].get(c, c), shop_count=n)
        for c, n in sorted(counts.items(), key=lambda kv: -kv[1])
        if c not in EXCLUDED_CATEGORIES
    ]
    gates = sorted(int(n["id"].split("-")[1]) for n in d["nodes"] if n["type"] == "gate")
    return JdcWayfinderResponse(
        stores=_store_infos(),
        shops=shops,
        categories=cats,
        gates=gates,
        source=d["source"],
        extracted_at=d["extracted_at"],
    )


def nearby_stores(gate: int) -> list[NearbyStore]:
    """Gate 기준 가까운 매장 순."""
    src = f"gate-{gate}"
    if src not in _graph():
        raise ValueError(f"존재하지 않는 Gate 입니다: {gate}")
    dist = _dijkstra(src)
    node_of = _node_of_store()
    shops = _shops()
    out = []
    for st in _store_infos():
        meters, minutes = _walk(dist[node_of[st.id]])
        count = sum(
            1 for s in shops
            if s.store_id == st.id and s.category not in EXCLUDED_CATEGORIES
        )
        out.append(NearbyStore(store=st, meters=meters, minutes=minutes, shop_count=count))
    return sorted(out, key=lambda n: n.meters)


def _allocate(slack: int, weights: list[int]) -> list[int]:
    """slack 분을 weights 비례로 배분 (매장당 최소 1분, 합계 = slack)."""
    total = sum(weights)
    raw = [slack * w / total for w in weights]
    alloc = [max(1, int(r)) for r in raw]
    by_remainder = sorted(range(len(weights)), key=lambda i: raw[i] - int(raw[i]), reverse=True)
    for i in by_remainder:
        if sum(alloc) >= slack:
            break
        alloc[i] += 1
    while sum(alloc) > slack:  # 최소 1분 보정으로 초과한 경우 가장 큰 곳에서 회수
        j = max(range(len(alloc)), key=lambda i: alloc[i])
        alloc[j] -= 1
    return alloc


def build_shopping_route(req: ShoppingRouteRequest) -> ShoppingRouteResponse:
    source = data_loader.load_jdc_wayfinder()["source"]
    dep = _to_min(req.departure_time)
    if dep is None:
        raise ValueError("departure_time 형식이 올바르지 않습니다 (HH:MM).")
    start = _to_min(req.start_time) if req.start_time else dep - DEFAULT_SHOP_WINDOW_MIN
    if start is None:
        raise ValueError("start_time 형식이 올바르지 않습니다 (HH:MM).")
    deadline = dep - BOARDING_CLOSE_BUFFER_MIN
    avail = deadline - start

    known = {c.id for c in get_wayfinder().categories}
    picked = [c for c in dict.fromkeys(req.categories) if c in known]
    missing = [c for c in dict.fromkeys(req.categories) if c not in known]
    shops = [s for s in _shops() if s.category in picked]

    by_store = {st.id: st for st in _store_infos()}
    node_of = _node_of_store()
    order = [sid for sid in by_store if any(s.store_id == sid for s in shops)]  # 복도 순서

    assumptions = [
        f"탑승 마감은 출발 {BOARDING_CLOSE_BUFFER_MIN}분 전으로 가정했습니다.",
        "이동 시간은 JDC 웨이파인더의 환산식(보행 70m/분)이며 휠체어 이동 속도·엘리베이터 대기를 반영하지 않았습니다.",
        "매장 내부 이동 시간은 반영하지 않았습니다. 남는 시간은 매장별 입점 수에 비례해 나눴습니다.",
    ]
    if not req.start_time:
        assumptions.append(
            f"쇼핑 시작 시각을 입력하지 않아 출발 {DEFAULT_SHOP_WINDOW_MIN}분 전({_fmt(start)})으로 가정했습니다."
        )
    if not req.from_gate:
        assumptions.append("현재 Gate 를 선택하지 않아 첫 매장까지의 이동 시간은 포함하지 않았습니다.")

    def response(feasible, stops, walk_total, shop_total) -> ShoppingRouteResponse:
        return ShoppingRouteResponse(
            feasible=feasible,
            start_time=_fmt(start),
            shopping_deadline=_fmt(deadline),
            available_minutes=max(avail, 0),
            walk_minutes=walk_total,
            shopping_minutes=shop_total,
            stops=stops,
            missing_categories=missing,
            assumptions=assumptions,
            source=source,
        )

    if avail <= 0 or not order:
        return response(False, [], 0, 0)

    def legs(seq: list[str]) -> list[tuple[int, int]]:
        """seq 순서로 방문할 때 각 구간의 (미터, 분). 시작 Gate 가 없으면 첫 구간은 0."""
        out: list[tuple[int, int]] = []
        prev = f"gate-{req.from_gate}" if req.from_gate else None
        for sid in seq:
            node = node_of[sid]
            out.append((0, 0) if prev is None else _walk(_dijkstra(prev)[node]))
            prev = node
        return out

    # 현재 Gate 에서 시작하면 양방향 중 이동이 짧은 쪽을 택한다
    candidates = [order, order[::-1]] if req.from_gate and len(order) > 1 else [order]
    seq = min(candidates, key=lambda s: sum(m for _, m in legs(s)))
    seg = legs(seq)
    walk_total = sum(m for _, m in seg)

    slack = avail - walk_total
    if slack < len(seq):  # 매장당 최소 1분도 못 쓰면 불가
        return response(False, [], walk_total, 0)

    alloc = _allocate(slack, [sum(1 for s in shops if s.store_id == sid) for sid in seq])

    stops: list[ShoppingStop] = []
    t = start
    for i, sid in enumerate(seq):
        meters, minutes = seg[i]
        t += minutes
        stops.append(
            ShoppingStop(
                order=i + 1,
                store=by_store[sid],
                walk_meters=meters,
                walk_minutes=minutes,
                arrive=_fmt(t),
                leave=_fmt(t + alloc[i]),
                shop_minutes=alloc[i],
                shops=[s for s in shops if s.store_id == sid],
            )
        )
        t += alloc[i]
    return response(t <= deadline, stops, walk_total, sum(alloc))
