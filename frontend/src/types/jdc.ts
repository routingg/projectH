export interface JdcStoreInfo {
  id: string;
  name: string;
  short_name: string;
  location_label: string;
  near_gates: number[];
}

export interface JdcShop {
  id: string;
  name: string;
  code: string | null;
  category: string;
  category_label: string;
  store_id: string;
  zone: string;
  aliases: string[];
}

export interface JdcCategory {
  id: string;
  label: string;
  shop_count: number;
}

export interface JdcWayfinder {
  stores: JdcStoreInfo[];
  shops: JdcShop[];
  categories: JdcCategory[];
  gates: number[];
  source: string;
  extracted_at: string;
}

export interface NearbyStore {
  store: JdcStoreInfo;
  meters: number;
  minutes: number;
  shop_count: number;
}

export interface ShoppingRouteRequest {
  departure_time: string;
  categories: string[];
  start_time?: string;
  from_gate?: number;
}

export interface ShoppingStop {
  order: number;
  store: JdcStoreInfo;
  walk_meters: number;
  walk_minutes: number;
  arrive: string;
  leave: string;
  shop_minutes: number;
  shops: JdcShop[];
}

export interface ShoppingRoute {
  feasible: boolean;
  start_time: string;
  shopping_deadline: string;
  available_minutes: number;
  walk_minutes: number;
  shopping_minutes: number;
  stops: ShoppingStop[];
  missing_categories: string[];
  assumptions: string[];
  source: string;
}
