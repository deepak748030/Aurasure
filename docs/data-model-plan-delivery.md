# Delivery Partner MVP — implementation notes

This session added the Delivery Partner app (`RiderApp/`) and the backend
endpoints it needs. The flow is intentionally simple but end-to-end:

1. A delivery partner registers with a unique phone → role `delivery`.
2. They complete KYC (personal, ID, vehicle, bank, documents) → submit.
3. Admin verifies each document and approves the partner in the admin panel.
4. The partner goes online and sees `available` delivery tasks.
5. A task is created automatically when a vendor (or admin) marks an order
   `out_for_delivery`.
6. The rider accepts (first accept wins), collects the pickup OTP from the
   vendor, then enters the drop OTP at the customer's door.
7. On successful delivery the rider earns `deliveryFee` (minimum ₹25),
   COD is added to `codInHand`, and the order becomes `delivered`.

Customer and vendor apps already read the order status, so once the rider
delivers, both sides show the finished order.

```
Customer ──place order──▶ Vendor accepts ──out_for_delivery──▶ DeliveryTask created
                                          │
RiderApp ──go online──▶ fetch offers ──accept──▶ pickup OTP ──▶ drop OTP ──▶ delivered
                                          │
                                    order.status = delivered
                                    vendor.payout += net
                                    rider.payout += deliveryFee
                                    rider.codInHand += total (for COD)
```

## Admin-side additions

- `AdminAudit` model + `GET /admin/audit`: every mutating admin mutation (order
  status, KYC decisions, catalogue CRUD, wallet/loyalty adjustments) writes an
  immutable server-side audit row. The panel's Activity Log now reads this API
  instead of being browser-local only.
- `GET /admin/delivery/tasks`, `GET /admin/delivery/tasks/:id`,
  `GET /admin/delivery/riders`, `POST /admin/delivery/tasks/:id/assign` and
  `POST /admin/orders/:id/assign-rider`: a new **Delivery tasks** page in the
  admin panel tracks every dispatch and lets an operator manually assign an
  approved, online rider (with a COD-limit guard).
- Rider KYC is server-gated: `PATCH /admin/riders/:id` refuses `approved`
  until `allDocsVerified(rider)` is true (Aadhaar, DL, PAN, vehicle RC, photo).
