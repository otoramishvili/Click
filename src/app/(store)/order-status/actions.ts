"use server";

import type { StatusLookup, StatusLookupResult } from "@/lib/order-status";
import { lookupOrderStatus } from "@/lib/server/order-status";

/* Runs on the server when a customer asks for an order's status. */
export async function lookupOrderStatusAction(
  input: StatusLookup,
): Promise<StatusLookupResult> {
  return lookupOrderStatus(input);
}
