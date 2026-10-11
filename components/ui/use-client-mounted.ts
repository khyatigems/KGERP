"use client";

import { useSyncExternalStore } from "react";

const subscribe = () => () => {};
const clientSnapshot = () => true;
const serverSnapshot = () => false;

/** Hydration-safe browser availability without a redundant mount effect. */
export function useClientMounted() {
  return useSyncExternalStore(subscribe, clientSnapshot, serverSnapshot);
}
