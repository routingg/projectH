import { client } from "./client";
import type { JdcStore } from "../types/airport";
import type {
  JdcWayfinder,
  NearbyStore,
  ShoppingRoute,
  ShoppingRouteRequest,
} from "../types/jdc";

export interface JdcStoreResponse {
  stores: JdcStore[];
  data_limitations: string[];
}

export async function getJdcStores(): Promise<JdcStoreResponse> {
  const { data } = await client.get<JdcStoreResponse>("/api/jdc/stores");
  return data;
}

export async function getJdcWayfinder(): Promise<JdcWayfinder> {
  const { data } = await client.get<JdcWayfinder>("/api/jdc/wayfinder");
  return data;
}

export async function getNearbyStores(gate: number): Promise<NearbyStore[]> {
  const { data } = await client.get<NearbyStore[]>("/api/jdc/nearby", {
    params: { gate },
  });
  return data;
}

export async function postShoppingRoute(
  payload: ShoppingRouteRequest
): Promise<ShoppingRoute> {
  const { data } = await client.post<ShoppingRoute>("/api/jdc/shopping-route", payload);
  return data;
}
