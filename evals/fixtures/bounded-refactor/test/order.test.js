import test from "node:test";
import assert from "node:assert/strict";
import { orderItemCount, orderTotal } from "../src/order.js";

test("computes order totals", () => {
  assert.equal(orderTotal([{ price: 10, quantity: 2 }, { price: 5, quantity: 1 }]), 25);
});

test("computes item count", () => {
  assert.equal(orderItemCount([{ price: 10, quantity: 2 }, { price: 5, quantity: 1 }]), 3);
});
