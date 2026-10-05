import type { Metadata } from "next";
import { Container } from "@/components/container";
import { OrderStatusForm } from "@/components/order-status/order-status-form";

export const metadata: Metadata = { title: "Order status" };

/* A customer enters their order number and email and sees where the order is. */
export default function OrderStatusPage() {
  return (
    <Container className="py-10 lg:py-14">
      <h1 className="font-wide text-3xl font-bold tracking-tight">Order status</h1>
      <p className="mt-3 max-w-xl text-base-content/70">
        Enter the order number from your invoice and the email address you
        ordered with.
      </p>
      <OrderStatusForm />
    </Container>
  );
}
