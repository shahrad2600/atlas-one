-- ============================================================================
-- Migration 021: Extended Commerce Schema
-- Atlas One - Enterprise AI-Powered Travel Super-Platform
--
-- Purpose: Additional commerce verticals — rental cars, cruises,
--          vacation rentals, bundle deals, and price comparison/metasearch.
--
-- Dependencies:
--   - 001: tg schema (tg.set_updated_at trigger function)
--   - 004: commerce schema
--   - 007: stay schema (stay.stay_property)
-- ============================================================================

BEGIN;

-- ============================================================================
-- RENTAL CAR SCHEMA
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS rental;

-- rental.rental_provider
-- Provider entities (Hertz, Avis, Enterprise, etc.)
CREATE TABLE rental.rental_provider (
  provider_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  rating NUMERIC(3,2),
  review_count INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- rental.rental_location
-- Pickup / dropoff locations (airports, downtown offices, hotels, etc.)
CREATE TABLE rental.rental_location (
  location_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES rental.rental_provider(provider_id),
  name VARCHAR(300) NOT NULL,
  location_type VARCHAR(30) NOT NULL, -- airport, downtown, hotel, train_station
  address TEXT,
  city VARCHAR(100),
  country_code VARCHAR(3),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  airport_code VARCHAR(10),
  hours JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_rental_location_provider ON rental.rental_location(provider_id);
CREATE INDEX idx_rental_location_airport ON rental.rental_location(airport_code);
CREATE INDEX idx_rental_location_city ON rental.rental_location(city);

-- rental.rental_vehicle_class
-- Vehicle categories (economy, compact, SUV, luxury, etc.)
CREATE TABLE rental.rental_vehicle_class (
  class_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(30) NOT NULL, -- economy, compact, midsize, fullsize, premium, luxury, suv, minivan, convertible, truck
  passengers INT,
  luggage_capacity INT,
  doors INT,
  transmission VARCHAR(20), -- automatic, manual
  features TEXT[] DEFAULT '{}',
  image_url TEXT,
  sort_order INT DEFAULT 0
);

-- rental.rental_offer
-- A priced rental car offer for a specific pickup/dropoff/date combination
CREATE TABLE rental.rental_offer (
  offer_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider_id UUID NOT NULL REFERENCES rental.rental_provider(provider_id),
  vehicle_class_id UUID NOT NULL REFERENCES rental.rental_vehicle_class(class_id),
  pickup_location_id UUID NOT NULL REFERENCES rental.rental_location(location_id),
  dropoff_location_id UUID NOT NULL REFERENCES rental.rental_location(location_id),
  pickup_date DATE NOT NULL,
  dropoff_date DATE NOT NULL,
  price_per_day_cents INT NOT NULL,
  total_price_cents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  includes TEXT[] DEFAULT '{}', -- unlimited_mileage, insurance, gps, child_seat
  cancellation_policy VARCHAR(30), -- free, partial, non_refundable
  status VARCHAR(20) NOT NULL DEFAULT 'available',
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_rental_offer_pickup ON rental.rental_offer(pickup_location_id, pickup_date);
CREATE INDEX idx_rental_offer_status ON rental.rental_offer(status);

-- rental.rental_booking
-- Confirmed rental car bookings
CREATE TABLE rental.rental_booking (
  booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  offer_id UUID NOT NULL REFERENCES rental.rental_offer(offer_id),
  reservation_id UUID, -- links to commerce.commerce_reservation
  confirmation_number VARCHAR(30),
  driver_name VARCHAR(200),
  driver_license VARCHAR(50),
  driver_email VARCHAR(255),
  extras TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed', -- confirmed, picked_up, returned, cancelled
  total_price_cents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_rental_booking_user ON rental.rental_booking(user_id);

-- ============================================================================
-- CRUISE SCHEMA
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS cruise;

-- cruise.cruise_line
-- Cruise companies (Royal Caribbean, Carnival, Norwegian, etc.)
CREATE TABLE cruise.cruise_line (
  line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  logo_url TEXT,
  website_url TEXT,
  description TEXT,
  rating NUMERIC(3,2),
  review_count INT DEFAULT 0,
  founded_year INT,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- cruise.cruise_ship
-- Individual ships in a cruise line's fleet
CREATE TABLE cruise.cruise_ship (
  ship_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  line_id UUID NOT NULL REFERENCES cruise.cruise_line(line_id),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  class_name VARCHAR(100),
  year_built INT,
  year_refurbished INT,
  tonnage INT,
  passenger_capacity INT,
  crew_count INT,
  deck_count INT,
  length_meters NUMERIC(6,1),
  rating NUMERIC(3,2),
  review_count INT DEFAULT 0,
  hero_image_url TEXT,
  amenities TEXT[] DEFAULT '{}',
  dining_venues INT DEFAULT 0,
  pools INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_ship_line ON cruise.cruise_ship(line_id);

-- cruise.cruise_cabin_type
-- Cabin categories on a ship (inside, oceanview, balcony, suite, penthouse)
CREATE TABLE cruise.cruise_cabin_type (
  cabin_type_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id UUID NOT NULL REFERENCES cruise.cruise_ship(ship_id),
  name VARCHAR(100) NOT NULL,
  category VARCHAR(30) NOT NULL, -- inside, oceanview, balcony, suite, penthouse
  sqft INT,
  max_occupancy INT DEFAULT 2,
  amenities TEXT[] DEFAULT '{}',
  image_url TEXT,
  deck_numbers INT[] DEFAULT '{}',
  sort_order INT DEFAULT 0
);
CREATE INDEX idx_cabin_ship ON cruise.cruise_cabin_type(ship_id);

-- cruise.cruise_itinerary
-- Named routes/itineraries (e.g. "7-Night Western Caribbean")
CREATE TABLE cruise.cruise_itinerary (
  itinerary_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ship_id UUID NOT NULL REFERENCES cruise.cruise_ship(ship_id),
  name VARCHAR(300) NOT NULL,
  slug VARCHAR(300) NOT NULL UNIQUE,
  region VARCHAR(50) NOT NULL, -- caribbean, mediterranean, alaska, northern_europe, asia, south_pacific, transatlantic
  departure_port VARCHAR(200) NOT NULL,
  departure_port_code VARCHAR(10),
  duration_nights INT NOT NULL,
  description TEXT,
  highlights TEXT[] DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_itinerary_ship ON cruise.cruise_itinerary(ship_id);
CREATE INDEX idx_itinerary_region ON cruise.cruise_itinerary(region);

-- cruise.cruise_port_call
-- Individual ports of call within an itinerary
CREATE TABLE cruise.cruise_port_call (
  port_call_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES cruise.cruise_itinerary(itinerary_id) ON DELETE CASCADE,
  day_number INT NOT NULL,
  port_name VARCHAR(200) NOT NULL,
  country VARCHAR(100),
  arrival_time TIME,
  departure_time TIME,
  is_sea_day BOOLEAN DEFAULT FALSE,
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7),
  highlights TEXT[] DEFAULT '{}',
  UNIQUE(itinerary_id, day_number)
);

-- cruise.cruise_sailing
-- Specific departures (date + itinerary + pricing)
CREATE TABLE cruise.cruise_sailing (
  sailing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id UUID NOT NULL REFERENCES cruise.cruise_itinerary(itinerary_id),
  departure_date DATE NOT NULL,
  return_date DATE NOT NULL,
  price_from_cents INT, -- starting price (inside cabin, pp, double occupancy)
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  availability VARCHAR(20) DEFAULT 'available', -- available, limited, sold_out, waitlist
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_sailing_itinerary ON cruise.cruise_sailing(itinerary_id);
CREATE INDEX idx_sailing_date ON cruise.cruise_sailing(departure_date);

-- cruise.cruise_booking
-- Confirmed cruise bookings
CREATE TABLE cruise.cruise_booking (
  booking_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sailing_id UUID NOT NULL REFERENCES cruise.cruise_sailing(sailing_id),
  cabin_type_id UUID REFERENCES cruise.cruise_cabin_type(cabin_type_id),
  reservation_id UUID,
  confirmation_number VARCHAR(30),
  passengers INT NOT NULL DEFAULT 2,
  total_price_cents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  status VARCHAR(20) NOT NULL DEFAULT 'confirmed',
  special_requests TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_cruise_booking_user ON cruise.cruise_booking(user_id);

-- ============================================================================
-- VACATION RENTAL EXTENSION (extends stay schema)
-- ============================================================================

CREATE TABLE stay.stay_vacation_rental (
  rental_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id UUID NOT NULL REFERENCES stay.stay_property(property_id),
  rental_type VARCHAR(30) NOT NULL, -- entire_home, private_room, shared_room, villa, cabin, cottage, apartment, condo, townhouse
  bedrooms INT DEFAULT 1,
  bathrooms NUMERIC(3,1) DEFAULT 1,
  max_guests INT DEFAULT 2,
  sqft INT,
  amenities TEXT[] DEFAULT '{}',
  house_rules TEXT,
  check_in_time TIME,
  check_out_time TIME,
  min_stay_nights INT DEFAULT 1,
  instant_book BOOLEAN DEFAULT FALSE,
  cleaning_fee_cents INT DEFAULT 0,
  security_deposit_cents INT DEFAULT 0,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_vacation_rental_property ON stay.stay_vacation_rental(property_id);

-- ============================================================================
-- BUNDLE DEALS (extends commerce schema)
-- ============================================================================

CREATE TABLE commerce.commerce_bundle (
  bundle_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(300) NOT NULL,
  description TEXT,
  destination_id UUID,
  bundle_type VARCHAR(30) NOT NULL, -- flight_hotel, hotel_experience, full_package, custom
  discount_percent INT DEFAULT 0,
  discount_amount_cents INT DEFAULT 0,
  total_price_cents INT NOT NULL,
  original_price_cents INT NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  valid_from DATE,
  valid_until DATE,
  max_bookings INT,
  current_bookings INT DEFAULT 0,
  status VARCHAR(20) NOT NULL DEFAULT 'active',
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commerce.commerce_bundle_item (
  item_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES commerce.commerce_bundle(bundle_id) ON DELETE CASCADE,
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- flight_offer, stay_property, experience, rental_car, cruise
  item_price_cents INT NOT NULL,
  description TEXT,
  sort_order INT DEFAULT 0
);
CREATE INDEX idx_bundle_item_bundle ON commerce.commerce_bundle_item(bundle_id);

-- ============================================================================
-- PRICE COMPARISON / METASEARCH (extends commerce schema)
-- ============================================================================

CREATE TABLE commerce.commerce_price_source (
  source_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  source_type VARCHAR(30) NOT NULL, -- ota, direct, metasearch, airline, hotel_chain
  logo_url TEXT,
  website_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  sort_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE commerce.commerce_price_listing (
  listing_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_id UUID NOT NULL,
  entity_type VARCHAR(50) NOT NULL, -- hotel, flight, rental_car, cruise, experience
  source_id UUID NOT NULL REFERENCES commerce.commerce_price_source(source_id),
  price_cents INT NOT NULL,
  original_price_cents INT, -- before discount
  currency VARCHAR(3) NOT NULL DEFAULT 'USD',
  booking_url TEXT,
  room_type VARCHAR(200),
  includes TEXT[] DEFAULT '{}',
  cancellation_policy VARCHAR(50),
  is_deal BOOLEAN DEFAULT FALSE,
  deal_label VARCHAR(100),
  availability VARCHAR(20) DEFAULT 'available',
  check_in DATE,
  check_out DATE,
  last_updated_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_price_listing_entity ON commerce.commerce_price_listing(entity_id, entity_type);
CREATE INDEX idx_price_listing_source ON commerce.commerce_price_listing(source_id);
CREATE INDEX idx_price_listing_price ON commerce.commerce_price_listing(price_cents);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

CREATE TRIGGER set_rental_booking_updated_at BEFORE UPDATE ON rental.rental_booking FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();
CREATE TRIGGER set_cruise_ship_updated_at BEFORE UPDATE ON cruise.cruise_ship FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();
CREATE TRIGGER set_cruise_booking_updated_at BEFORE UPDATE ON cruise.cruise_booking FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();
CREATE TRIGGER set_vacation_rental_updated_at BEFORE UPDATE ON stay.stay_vacation_rental FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();
CREATE TRIGGER set_bundle_updated_at BEFORE UPDATE ON commerce.commerce_bundle FOR EACH ROW EXECUTE FUNCTION tg.set_updated_at();

COMMIT;
