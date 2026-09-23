export function orderTotal(items) {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
}

export function orderItemCount(items) {
  return items.reduce((count, item) => count + item.quantity, 0);
}
