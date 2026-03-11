// ─── AI Utilities ───────────────────────────────────────────────────
export * from './ai.js';
// ─── Enums ───────────────────────────────────────────────────────────
export var EntityType;
(function (EntityType) {
    EntityType["Place"] = "place";
    EntityType["Venue"] = "venue";
    EntityType["Supplier"] = "supplier";
    EntityType["Product"] = "product";
    EntityType["InventorySlot"] = "inventory_slot";
    EntityType["Trip"] = "trip";
    EntityType["User"] = "user";
    EntityType["Reservation"] = "reservation";
    EntityType["Review"] = "review";
    EntityType["Media"] = "media";
})(EntityType || (EntityType = {}));
export var ReservationType;
(function (ReservationType) {
    ReservationType["Dining"] = "dining";
    ReservationType["Experience"] = "experience";
    ReservationType["Stay"] = "stay";
    ReservationType["Rental"] = "rental";
    ReservationType["Cruise"] = "cruise";
    ReservationType["Flight"] = "flight";
    ReservationType["Insurance"] = "insurance";
    ReservationType["Ancillary"] = "ancillary";
})(ReservationType || (ReservationType = {}));
export var ReservationStatus;
(function (ReservationStatus) {
    ReservationStatus["Requested"] = "requested";
    ReservationStatus["Confirmed"] = "confirmed";
    ReservationStatus["Cancelled"] = "cancelled";
    ReservationStatus["Completed"] = "completed";
    ReservationStatus["Failed"] = "failed";
    ReservationStatus["Modified"] = "modified";
})(ReservationStatus || (ReservationStatus = {}));
export var TripStatus;
(function (TripStatus) {
    TripStatus["Draft"] = "draft";
    TripStatus["Active"] = "active";
    TripStatus["Completed"] = "completed";
    TripStatus["Cancelled"] = "cancelled";
})(TripStatus || (TripStatus = {}));
export var UserRole;
(function (UserRole) {
    UserRole["Traveler"] = "traveler";
    UserRole["Concierge"] = "concierge";
    UserRole["Partner"] = "partner";
    UserRole["Admin"] = "admin";
    UserRole["SuperAdmin"] = "super_admin";
})(UserRole || (UserRole = {}));
export function getServiceConfig(name, defaultPort) {
    return {
        name,
        port: Number(process.env['PORT'] ?? defaultPort),
        host: process.env['HOST'] ?? '0.0.0.0',
        logLevel: process.env['LOG_LEVEL'] ?? 'info',
        nodeEnv: process.env['NODE_ENV'] ?? 'development',
    };
}
//# sourceMappingURL=index.js.map