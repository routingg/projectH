import { useEffect, useMemo, useState } from "react";
import { getJdcWayfinder, getNearbyStores, postShoppingRoute } from "../api/jdc";
import type { JdcWayfinder, NearbyStore, ShoppingRoute } from "../types/jdc";

const chipClass = (on: boolean) =>
  `px-3 py-1 rounded-full text-xs font-semibold border transition-colors cursor-pointer ${
    on
      ? "bg-brand-500 border-brand-500 text-white"
      : "bg-white border-brand-200 text-stone-500 hover:bg-brand-50"
  }`;

export default function JdcShoppingRoute({
  departureTime,
}: {
  departureTime: string | null | undefined;
}) {
  const [data, setData] = useState<JdcWayfinder | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [gate, setGate] = useState("");
  const [nearby, setNearby] = useState<NearbyStore[] | null>(null);
  const [query, setQuery] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [startTime, setStartTime] = useState("");
  const [route, setRoute] = useState<ShoppingRoute | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getJdcWayfinder()
      .then(setData)
      .catch((e) => {
        console.error("[jdc] 면세점 정보 로드 실패", e);
        setLoadFailed(true);
      });
  }, []);

  // 현재 Gate 기준 가까운 매장 순 (내 주변 매장)
  useEffect(() => {
    if (!gate) {
      setNearby(null);
      return;
    }
    let alive = true;
    getNearbyStores(Number(gate))
      .then((r) => alive && setNearby(r))
      .catch((e) => {
        console.error("[jdc] 주변 매장 조회 실패", e);
        if (alive) setNearby(null);
      });
    return () => {
      alive = false;
    };
  }, [gate]);

  const stores = useMemo(() => {
    if (!data) return [];
    if (!nearby) return data.stores.map((store) => ({ store, near: null as NearbyStore | null }));
    return nearby.map((n) => ({ store: n.store, near: n as NearbyStore | null }));
  }, [data, nearby]);

  if (loadFailed) {
    return <p className="mt-8 text-xs text-stone-400">면세점 정보를 불러오지 못했습니다.</p>;
  }
  if (!data) return null;

  const q = query.trim().toLowerCase();
  const matches = (name: string, aliases: string[]) =>
    !q || [name, ...aliases].some((n) => n.toLowerCase().includes(q));

  function toggle(id: string) {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  async function build() {
    if (!departureTime || picked.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      setRoute(
        await postShoppingRoute({
          departure_time: departureTime,
          categories: picked,
          start_time: startTime || undefined,
          from_gate: gate ? Number(gate) : undefined,
        })
      );
    } catch (e) {
      console.error("[jdc] 쇼핑 경로 생성 실패", e);
      setRoute(null);
      setError("쇼핑 경로를 만들지 못했습니다. 시간 입력을 확인하고 다시 시도해 주세요.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-lg font-extrabold text-stone-900 mb-1">면세점 쇼핑 경로</h2>
      <p className="text-xs text-stone-400 mt-0 mb-3">
        국내선 2층 격리대합실의 JDC 매장 3곳과 입점 브랜드를 출도 시간에 맞춰 안내해요.
      </p>

      {/* 매장 위치 + 내 주변 */}
      <div className="bg-white rounded-2xl border border-brand-100 p-4 shadow-[var(--shadow-soft)] mb-4">
        <div className="flex flex-wrap items-center gap-3 mb-3">
          <label className="flex items-center gap-2 text-xs font-semibold text-stone-600">
            현재 위치
            <select
              value={gate}
              onChange={(e) => setGate(e.target.value)}
              className="px-2 py-1 rounded-lg border border-brand-100 bg-white text-xs text-stone-700"
            >
              <option value="">선택 안 함</option>
              {data.gates.map((g) => (
                <option key={g} value={g}>
                  Gate {g} 근처
                </option>
              ))}
            </select>
          </label>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="브랜드 검색"
            placeholder="브랜드 검색 (예: 샤넬, 발렌타인)"
            className="flex-1 min-w-40 px-3 py-1.5 rounded-lg border border-brand-100 bg-white text-xs text-stone-700 focus:outline-none focus:ring-2 focus:ring-brand-300"
          />
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          {stores.map(({ store, near }) => {
            const shops = data.shops.filter(
              (s) => s.store_id === store.id && matches(s.name, s.aliases)
            );
            const zones = [...new Set(shops.map((s) => s.zone))];
            return (
              <details
                key={store.id}
                open={!!q && shops.length > 0}
                className="rounded-xl border border-brand-100 px-3 py-2 bg-brand-50/40"
              >
                <summary className="cursor-pointer list-none text-sm font-bold text-stone-800">
                  {store.name}
                  {near && (
                    <span className="ml-1 text-[11px] font-bold text-sea-600">
                      도보 약 {near.minutes}분 · {near.meters}m
                    </span>
                  )}
                  <span className="block text-[11px] font-normal text-stone-400">
                    {store.location_label}
                  </span>
                  <span className="block text-[11px] font-normal text-stone-500">
                    입점 {shops.length}곳{q ? " (검색 결과)" : ""}
                  </span>
                </summary>
                <div className="mt-2 space-y-2">
                  {zones.map((z) => (
                    <div key={z}>
                      <div className="text-[11px] font-bold text-stone-500">{z}</div>
                      <ul className="mt-0.5 mb-0 pl-4 space-y-0.5 text-xs text-stone-600">
                        {shops
                          .filter((s) => s.zone === z)
                          .map((s) => (
                            <li key={s.id}>
                              {s.name}
                              {s.aliases.length > 0 && (
                                <span className="text-stone-400"> · {s.aliases.join(", ")}</span>
                              )}
                            </li>
                          ))}
                      </ul>
                    </div>
                  ))}
                  {shops.length === 0 && (
                    <p className="text-xs text-stone-400 m-0">검색 결과가 없어요.</p>
                  )}
                </div>
              </details>
            );
          })}
        </div>
      </div>

      {/* 경로 만들기 */}
      <div className="bg-white rounded-2xl border border-brand-100 p-4 shadow-[var(--shadow-soft)]">
        <div className="text-xs font-semibold text-stone-600 mb-2">관심 카테고리</div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {data.categories.map((c) => (
            <button
              key={c.id}
              type="button"
              aria-pressed={picked.includes(c.id)}
              onClick={() => toggle(c.id)}
              className={chipClass(picked.includes(c.id))}
            >
              {c.label} {c.shop_count}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-3">
          <label className="text-xs font-semibold text-stone-600">
            쇼핑 시작 시간{" "}
            <span className="font-normal text-stone-400">(비우면 출발 80분 전)</span>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="block mt-1 px-2 py-1 rounded-lg border border-brand-100 text-sm text-stone-700"
            />
          </label>
          <button
            type="button"
            onClick={build}
            disabled={loading || picked.length === 0 || !departureTime}
            className="px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-bold disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed"
          >
            {loading ? "만드는 중…" : "쇼핑 경로 만들기"}
          </button>
        </div>
        {!departureTime && (
          <p className="text-xs text-stone-400 mt-2 mb-0">출도 시간을 입력하면 경로를 만들 수 있어요.</p>
        )}
        {error && (
          <p role="alert" className="text-xs text-red-500 mt-2 mb-0">
            {error}
          </p>
        )}

        {route && (
          <div className="mt-4">
            <p className="text-xs text-stone-500 mt-0 mb-2">
              쇼핑 가능 시간 <b>{route.available_minutes}분</b> ({route.start_time} ~{" "}
              {route.shopping_deadline} 탑승 마감)
              {route.stops.length > 0 && (
                <>
                  {" "}
                  · 이동 {route.walk_minutes}분 + 쇼핑 {route.shopping_minutes}분
                </>
              )}
            </p>

            {route.stops.length === 0 && (
              <p role="alert" className="text-sm text-amber-600 m-0">
                {route.available_minutes <= 0
                  ? "탑승 마감까지 남은 시간이 없어요. 쇼핑 시작 시간을 확인해 주세요."
                  : route.missing_categories.length === picked.length
                    ? "선택한 카테고리에 해당하는 매장이 없어요."
                    : "이동 시간을 빼고 나면 쇼핑할 시간이 남지 않아요. 카테고리를 줄이거나 시작 시간을 앞당겨 주세요."}
              </p>
            )}

            <ol className="list-none m-0 p-0 space-y-2">
              {route.stops.map((s) => (
                <li key={s.order} className="flex gap-3 rounded-xl bg-brand-50/50 px-3 py-2">
                  <span className="shrink-0 w-6 h-6 rounded-full bg-brand-500 text-white text-xs font-bold flex items-center justify-center">
                    {s.order}
                  </span>
                  <div className="text-xs text-stone-600">
                    <strong className="text-sm text-stone-800">{s.store.name}</strong>{" "}
                    <span className="text-stone-400">
                      {s.arrive}–{s.leave} · 쇼핑 {s.shop_minutes}분
                      {s.walk_minutes > 0 && ` · 이동 ${s.walk_minutes}분(${s.walk_meters}m)`}
                    </span>
                    <div className="text-[11px] text-stone-400">{s.store.location_label}</div>
                    <p className="mt-1 mb-0">
                      {s.shops.map((shop) => shop.name).join(", ")}
                    </p>
                  </div>
                </li>
              ))}
            </ol>

            {route.stops.length > 0 && !route.feasible && (
              <p role="alert" className="text-xs text-amber-600 mt-2 mb-0">
                탑승 마감을 넘겨요. 카테고리를 줄이거나 시작 시간을 앞당겨 주세요.
              </p>
            )}
            {route.missing_categories.length > 0 && route.stops.length > 0 && (
              <p className="text-xs text-stone-400 mt-2 mb-0">
                매장 정보 없음: {route.missing_categories.join(", ")}
              </p>
            )}
            <ul className="mt-2 mb-0 pl-4 space-y-0.5 text-xs text-stone-400">
              {route.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <p className="text-xs text-stone-400 mt-2 mb-0">
        출처: JDC 웨이파인더 매장·동선 데이터 ({data.extracted_at} 추출). 입점 현황과 위치는 변동될 수 있어요.
      </p>
    </section>
  );
}
