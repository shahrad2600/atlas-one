export * from './ai.js';
export type UUID = string;
export interface Timestamps {
    created_at: string;
    updated_at: string;
}
export interface PaginationParams {
    cursor?: string;
    limit?: number;
}
export interface PaginatedResponse<T> {
    data: T[];
    cursor: {
        next: string | null;
        prev: string | null;
    };
    total: number;
}
export interface ErrorResponse {
    error: {
        code: string;
        message: string;
        details?: Record<string, unknown>;
    };
}
export declare enum EntityType {
    Place = "place",
    Venue = "venue",
    Supplier = "supplier",
    Product = "product",
    InventorySlot = "inventory_slot",
    Trip = "trip",
    User = "user",
    Reservation = "reservation",
    Review = "review",
    Media = "media"
}
export declare enum ReservationType {
    Dining = "dining",
    Experience = "experience",
    Stay = "stay",
    Rental = "rental",
    Cruise = "cruise",
    Flight = "flight",
    Insurance = "insurance",
    Ancillary = "ancillary"
}
export declare enum ReservationStatus {
    Requested = "requested",
    Confirmed = "confirmed",
    Cancelled = "cancelled",
    Completed = "completed",
    Failed = "failed",
    Modified = "modified"
}
export declare enum TripStatus {
    Draft = "draft",
    Active = "active",
    Completed = "completed",
    Cancelled = "cancelled"
}
export declare enum UserRole {
    Traveler = "traveler",
    Concierge = "concierge",
    Partner = "partner",
    Admin = "admin",
    SuperAdmin = "super_admin"
}
export interface ServiceHealthResponse {
    status: 'ok' | 'degraded' | 'down';
    service: string;
    timestamp: string;
    version?: string;
    uptime?: number;
}
export interface RequestContext {
    userId: string;
    sessionId: string;
    traceId: string;
    roles: UserRole[];
    tenantId?: string;
}
export interface ServiceConfig {
    name: string;
    port: number;
    host: string;
    logLevel: string;
    nodeEnv: string;
}
export declare function getServiceConfig(name: string, defaultPort: number): ServiceConfig;
export interface Money {
    amount: number;
    currency: string;
}
export interface DateRange {
    start: string;
    end: string;
}
export interface GeoPoint {
    lat: number;
    lng: number;
}
export interface Address {
    line1: string;
    line2?: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: string;
}
//# sourceMappingURL=index.d.ts.map