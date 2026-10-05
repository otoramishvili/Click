"use server";

import type { OrderInput, PlaceOrderResult } from "@/lib/orders";
import { placeOrder } from "@/lib/server/place-order";

/*
  A Server Action: the checkout form calls this like a normal function, but it
  runs on the server, where the secret keys are.
*/
export async function placeOrderAction(
  input: OrderInput,
): Promise<PlaceOrderResult> {
  return placeOrder(input);
}
