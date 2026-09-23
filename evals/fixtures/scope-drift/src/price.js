export function applyDiscount(price, percent) {
  if (!Number.isFinite(price) || !Number.isFinite(percent)) {
    throw new TypeError("price and percent must be numbers");
  }
  return price - (price * percent / 100);
}
