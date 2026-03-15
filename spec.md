# CLOSET_OS Product Specification v1.0

> A closet operating system for individuals that manages inventory, outfits, wear logs, and garment care in one workflow.

---

## 0. Product Principles

| Principle | Description |
|---|---|
| **Inventory First** | The source of truth is the actual owned item: what it is, where it is, and what state it is in. |
| **Outfit Driven** | The product manages not only items, but also how items are combined and worn. |
| **Low Input Cost** | Registration should minimize manual typing and rely on photo upload, presets, and guided choices. |
| **Lifecycle Tracking** | Items are tracked across purchase, wear, wash, cleaning, repair, archive, and disposal. |
| **Actionable Closet** | The system should surface what to wear, what needs care, and what is underused. |

---

## 1. Scope

### 1.1 Target User

- Individuals with medium to large wardrobes
- Users who want to log outfits and reuse them
- Users who want to track cost per wear and underused items
- Users who want a simple care workflow for laundry and dry cleaning

### 1.2 Out of Scope for MVP

- Marketplace and resale platform features
- Multi-tenant business inventory management
- Social feed and public profile features
- Professional stylist collaboration workflows

### 1.3 Assumed Runtime

- Mobile-first web application
- Single user, single closet for MVP
- Future support for family/shared closet as an extension

---

## 2. MVP Features

### 2.1 Closet Inventory

- Register clothing items
- Upload multiple images per item
- Manage category, subcategory, brand, color, size, material, season, occasion, purchase info, notes
- Track item status
  - `active`
  - `in_laundry`
  - `in_cleaning`
  - `stored`
  - `lent`
  - `archived`
  - `disposed`
- Track storage location
- Tag items
- Browse, view details, edit, archive
- Filter by category, color, season, status, brand, location, tag

### 2.2 Outfit Management

- Create outfits by combining multiple items
- Store occasion tags, season tags, note, rating
- Favorite outfits
- Duplicate outfits
- Reuse prior outfits from wear logs

### 2.3 Wear Logs

- Save wear logs by date
- Support logging by outfit or by direct item selection
- Update wear count per item
- Update last worn date per item
- Show underused items based on inactivity window

### 2.4 Care Management

- Log washing, dry cleaning, repair, airing, brushing
- Keep care type per item
- Suggest care based on wear count interval
- Move item status between `active`, `in_laundry`, `in_cleaning`
- Keep latest care date and care notes

### 2.5 Purchase and Disposal Tracking

- Record purchase date, price, store, channel
- Compute cost per wear
- Track disposal or transfer events
- Support `sold`, `donated`, `discarded`, `gifted`
- Record disposal date, recovered amount, reason

### 2.6 Dashboard

- Recommended outfit for today
- Recently unworn items
- Care queue count
- Monthly purchase total
- High cost-per-wear items
- Seasonal mismatch summary

### 2.7 Search and UX

- Free text search
- Saved filters
- Recently viewed items
- Mobile-friendly one-handed primary actions
- Item creation flow should fit within 3 guided steps

---

## 3. Phase 2

- Image analysis for initial attribute suggestions
- Weather-based outfit recommendation
- Calendar-based occasion recommendation
- Wishlist
- Duplicate purchase detection
- Seasonal wardrobe switch workflow
- Travel packing list generator
- AI outfit suggestion
- Family/shared closet support

---

## 4. Phase 3

- Receipt OCR for purchase auto-registration
- Cleaner service integration
- Resale listing export
- Garment lifespan estimation
- Ownership optimization insights by category and brand
- PWA enhancements and notifications
- Photo library integration

---

## 5. Domain Model

### 5.1 Aggregates

- `closets`
- `locations`
- `clothing_items`
- `clothing_item_images`
- `tags`
- `clothing_item_tags`
- `outfits`
- `outfit_items`
- `wear_logs`
- `wear_log_items`
- `care_logs`
- `purchase_records`
- `disposal_records`
- `saved_filters`

### 5.2 Core Business Rules

- Every item belongs to exactly one closet
- An outfit may contain one or more items in MVP
- Items in `disposed` status must not appear in new outfit selection
- Items in `in_laundry` or `in_cleaning` are excluded from recommendation candidates
- `cost_per_wear = purchase_price / wear_count`; if `wear_count = 0`, result is `NULL`
- Creating a wear log updates item `wear_count` and `last_worn_at`
- Completing care may return an item to `active`
- Non-active items are hidden by default from the closet list unless the user opts in

---

## 6. Data Model

```text
users
  └─ closets
      ├─ locations
      ├─ tags
      ├─ clothing_items
      │   ├─ clothing_item_images
      │   ├─ clothing_item_tags
      │   ├─ purchase_records
      │   ├─ disposal_records
      │   ├─ care_logs
      ├─ outfits
      │   └─ outfit_items
      ├─ wear_logs
      │   └─ wear_log_items
      └─ saved_filters
```

---

## 7. Table Specifications

### 7.1 closets

```sql
CREATE TABLE closets (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID NOT NULL,
  name             TEXT NOT NULL DEFAULT 'My Closet',
  timezone         TEXT NOT NULL DEFAULT 'Asia/Tokyo',
  currency         TEXT NOT NULL DEFAULT 'JPY',
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.2 locations

```sql
CREATE TABLE locations (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closet_id        UUID NOT NULL REFERENCES closets(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  location_type    TEXT NOT NULL DEFAULT 'closet',
  sort_order       INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (closet_id, name)
);
```

### 7.3 tags

```sql
CREATE TABLE tags (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closet_id        UUID NOT NULL REFERENCES closets(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  color            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (closet_id, name)
);
```

### 7.4 clothing_items

```sql
CREATE TABLE clothing_items (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closet_id               UUID NOT NULL REFERENCES closets(id) ON DELETE CASCADE,
  primary_image_url       TEXT,
  name                    TEXT NOT NULL,
  category                TEXT NOT NULL,
  subcategory             TEXT,
  brand                   TEXT,
  color                   TEXT,
  secondary_colors        TEXT[] NOT NULL DEFAULT '{}',
  size_label              TEXT,
  fit                     TEXT,
  material                TEXT,
  season_tags             TEXT[] NOT NULL DEFAULT '{}',
  occasion_tags           TEXT[] NOT NULL DEFAULT '{}',
  purchase_date           DATE,
  purchase_price          NUMERIC(12,2),
  purchase_store          TEXT,
  status                  TEXT NOT NULL DEFAULT 'active',
  condition_score         INT NOT NULL DEFAULT 3,
  care_type               TEXT NOT NULL DEFAULT 'machine_wash',
  laundry_interval_wears  INT,
  wear_count              INT NOT NULL DEFAULT 0,
  last_worn_at            DATE,
  last_cared_at           DATE,
  location_id             UUID REFERENCES locations(id) ON DELETE SET NULL,
  notes                   TEXT,
  archived_at             TIMESTAMPTZ,
  disposed_at             TIMESTAMPTZ,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.5 clothing_item_images

```sql
CREATE TABLE clothing_item_images (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          UUID NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
  image_url        TEXT NOT NULL,
  sort_order       INT NOT NULL DEFAULT 0,
  is_primary       BOOLEAN NOT NULL DEFAULT false,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.6 clothing_item_tags

```sql
CREATE TABLE clothing_item_tags (
  item_id          UUID NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
  tag_id           UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, tag_id)
);
```

### 7.7 outfits

```sql
CREATE TABLE outfits (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closet_id        UUID NOT NULL REFERENCES closets(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  season_tags      TEXT[] NOT NULL DEFAULT '{}',
  occasion_tags    TEXT[] NOT NULL DEFAULT '{}',
  rating           INT,
  is_favorite      BOOLEAN NOT NULL DEFAULT false,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.8 outfit_items

```sql
CREATE TABLE outfit_items (
  outfit_id        UUID NOT NULL REFERENCES outfits(id) ON DELETE CASCADE,
  item_id          UUID NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
  role             TEXT,
  sort_order       INT NOT NULL DEFAULT 0,
  PRIMARY KEY (outfit_id, item_id)
);
```

### 7.9 wear_logs

```sql
CREATE TABLE wear_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closet_id        UUID NOT NULL REFERENCES closets(id) ON DELETE CASCADE,
  worn_on          DATE NOT NULL,
  outfit_id        UUID REFERENCES outfits(id) ON DELETE SET NULL,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.10 wear_log_items

```sql
CREATE TABLE wear_log_items (
  wear_log_id      UUID NOT NULL REFERENCES wear_logs(id) ON DELETE CASCADE,
  item_id          UUID NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
  PRIMARY KEY (wear_log_id, item_id)
);
```

### 7.11 care_logs

```sql
CREATE TABLE care_logs (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          UUID NOT NULL REFERENCES clothing_items(id) ON DELETE CASCADE,
  care_type        TEXT NOT NULL,
  status           TEXT NOT NULL DEFAULT 'done',
  cared_on         DATE NOT NULL,
  cost             NUMERIC(12,2),
  vendor_name      TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.12 purchase_records

```sql
CREATE TABLE purchase_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          UUID NOT NULL UNIQUE REFERENCES clothing_items(id) ON DELETE CASCADE,
  purchased_on     DATE,
  price            NUMERIC(12,2),
  store_name       TEXT,
  channel          TEXT,
  order_reference  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.13 disposal_records

```sql
CREATE TABLE disposal_records (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id          UUID NOT NULL UNIQUE REFERENCES clothing_items(id) ON DELETE CASCADE,
  disposed_on      DATE NOT NULL,
  disposal_type    TEXT NOT NULL,
  recovered_amount NUMERIC(12,2),
  reason           TEXT,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

### 7.14 saved_filters

```sql
CREATE TABLE saved_filters (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  closet_id        UUID NOT NULL REFERENCES closets(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  filter_json      JSONB NOT NULL,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## 8. Derived Values and Calculations

### 8.1 Derived Item Fields

- `wear_count`
  - Incremented from successful wear log creation
- `last_worn_at`
  - Latest `wear_logs.worn_on` for the item
- `last_cared_at`
  - Latest `care_logs.cared_on`
- `cost_per_wear`
  - Computed at query time or via view
  - `purchase_price / NULLIF(wear_count, 0)`

### 8.2 Recommendation Logic for MVP

Recommended outfit candidates must satisfy:

- all items are `active`
- season tags match the current season
- same outfit was not worn in the last 7 days
- higher rated outfits are prioritized
- underused items receive a score boost

### 8.3 Care Suggestion Logic for MVP

An item is considered due for care when:

- `laundry_interval_wears` is set
- wear count since latest care reaches the interval
- current status is `active`

---

## 9. API Specification

### 9.1 `GET /api/items`

Purpose:

- Fetch paginated closet items

Query params:

- `category`
- `status`
- `season`
- `color`
- `brand`
- `location_id`
- `tag`
- `q`
- `include_archived`
- `page`
- `limit`
- `sort`

Response:

```json
{
  "items": [
    {
      "id": "uuid",
      "name": "Black Wool Coat",
      "category": "outer",
      "status": "active",
      "primary_image_url": "https://...",
      "wear_count": 12,
      "last_worn_at": "2026-03-10"
    }
  ],
  "page": 1,
  "limit": 20,
  "total": 142
}
```

### 9.2 `POST /api/items`

Purpose:

- Create a new clothing item

Request:

```json
{
  "name": "Black Wool Coat",
  "category": "outer",
  "brand": "UNIQLO",
  "color": "black",
  "season_tags": ["winter"],
  "purchase_price": 12900,
  "location_id": "uuid",
  "care_type": "dry_clean",
  "laundry_interval_wears": 8
}
```

### 9.3 `GET /api/items/:id`

- Fetch item detail
- Must include images, tags, purchase record, disposal record, recent wear logs, recent care logs

### 9.4 `PATCH /api/items/:id`

- Partial update for item
- Includes status update

### 9.5 `POST /api/outfits`

```json
{
  "name": "Office Monochrome",
  "item_ids": ["uuid1", "uuid2", "uuid3"],
  "occasion_tags": ["office"],
  "season_tags": ["spring", "autumn"],
  "rating": 4
}
```

### 9.6 `POST /api/wear-logs`

```json
{
  "worn_on": "2026-03-15",
  "outfit_id": "uuid",
  "item_ids": ["uuid1", "uuid2", "uuid3"],
  "notes": "client meeting"
}
```

Side effects:

- increment item `wear_count`
- update item `last_worn_at`

### 9.7 `POST /api/care-logs`

```json
{
  "item_id": "uuid",
  "care_type": "dry_clean",
  "cared_on": "2026-03-15",
  "cost": 1200,
  "status": "done"
}
```

Side effects:

- update item `last_cared_at`
- optionally reset item status to `active`

### 9.8 `POST /api/items/:id/dispose`

```json
{
  "disposed_on": "2026-03-15",
  "disposal_type": "sold",
  "recovered_amount": 3500,
  "reason": "size mismatch"
}
```

Side effects:

- set item status to `disposed`
- set `disposed_at`

---

## 10. Frontend Structure

### 10.1 Routes

```text
/app
  /home
  /closet
  /closet/[itemId]
  /outfits
  /outfits/[outfitId]
  /wear-log
  /care
  /analytics
  /wishlist
  /settings
```

### 10.2 Page Responsibilities

#### `/home`

- recommended outfit
- recently unworn items
- care queue
- monthly purchase summary

#### `/closet`

- item list
- filter and search
- saved filters
- batch actions

#### `/closet/[itemId]`

- core attributes
- wear history
- care history
- cost per wear
- linked outfits

#### `/outfits`

- outfit list
- occasion tabs
- favorite filter

#### `/wear-log`

- log what was worn
- browse logs by calendar
- quick log from outfit

#### `/care`

- items needing care
- in-cleaning items
- care log creation

#### `/analytics`

- item counts by category
- inactivity distribution
- purchase trend
- best and worst cost per wear

---

## 11. State Management

### 11.1 Client State

- Zustand for UI state
  - filters
  - selected items
  - modals

### 11.2 Server State

- TanStack Query for backend data
  - items
  - outfits
  - wear logs
  - care logs

### 11.3 Suggested Hooks

- `useItems(filters)`
- `useItem(itemId)`
- `useCreateItem()`
- `useUpdateItem()`
- `useOutfits()`
- `useCreateOutfit()`
- `useWearLogs(month)`
- `useCreateWearLog()`
- `useCareQueue()`
- `useCreateCareLog()`

### 11.4 Validation

- Zod
- strict enum checks
- image URL validation
- numeric range validation
- `condition_score` must be `1..5`
- `laundry_interval_wears` must be `1..99` if set

---

## 12. Backend Implementation Policy

### 12.1 Database

- Supabase Postgres
- RLS enabled
- ownership bound to `closet_id` and current authenticated user

### 12.2 Storage

- item images stored under `closet-items/{user_id}/{item_id}/...`

### 12.3 Server-side Operations

- item aggregation updates when wear log is created
- item state transitions when care is completed
- dashboard aggregations
- recommendation generation snapshot

### 12.4 Scheduled Jobs

- daily 06:00 local time
  - recalculate recommendations
  - refresh care queue
  - refresh underused item list

---

## 13. Indexing

```sql
CREATE INDEX idx_clothing_items_closet_status
  ON clothing_items (closet_id, status);

CREATE INDEX idx_clothing_items_closet_category
  ON clothing_items (closet_id, category);

CREATE INDEX idx_clothing_items_last_worn_at
  ON clothing_items (closet_id, last_worn_at DESC);

CREATE INDEX idx_wear_logs_closet_worn_on
  ON wear_logs (closet_id, worn_on DESC);

CREATE INDEX idx_care_logs_item_cared_on
  ON care_logs (item_id, cared_on DESC);
```

---

## 14. RLS Policy Direction

Principle:

- only the owner where `closets.user_id = auth.uid()` may access data

Minimum required policies:

- `closets`: own row only
- `locations`: own closet only
- `tags`: own closet only
- `clothing_items`: own closet only
- `outfits`: own closet only
- `wear_logs`: own closet only
- `care_logs`: own item only
- `saved_filters`: own closet only

---

## 15. Primary Use Cases

### UC-01 Register an Item

1. User uploads one or more photos
2. User enters required fields `name` and `category`
3. User optionally fills in brand, color, season, location, and purchase info
4. Item is saved and visible in closet list
5. Dashboard counters update

### UC-02 Log Today's Outfit

1. User selects an outfit or chooses items directly
2. User sets `worn_on`
3. System creates `wear_logs` and `wear_log_items`
4. System updates item `wear_count` and `last_worn_at`
5. Analytics and recommendations reflect the new log

### UC-03 Send an Item to Cleaning

1. User creates a care log with `care_type = dry_clean`
2. User updates item status to `in_cleaning`
3. When cleaning is complete, user logs another care completion event
4. System restores item status to `active`

### UC-04 Identify and Remove Unused Items

1. User opens analytics and filters items unworn for 90+ days
2. User reviews candidates
3. User archives or disposes item
4. If disposed, system creates a `disposal_record`

---

## 16. Non-functional Requirements

- initial closet list load within 2 seconds under normal conditions
- filter response within 300ms for common queries
- max upload size per image: 10MB
- mobile-first responsive design
- critical screens should support partial offline cache in later implementation
- audit events must exist for:
  - item creation
  - item status change
  - wear log creation
  - care log creation
  - item disposal

---

## 17. MVP Delivery Order

### Sprint 1

- authentication
- closets
- clothing items
- image upload
- list, detail, edit

### Sprint 2

- outfits
- wear logs
- minimal dashboard
- filtering and search

### Sprint 3

- care logs
- analytics
- disposal records
- saved filters

---

## 18. Open Decisions

- whether category and subcategory are fixed masters or user-extendable
- whether colors are free text or palette-based
- whether background removal is in MVP
- whether recommendations start rule-based only or with AI assistance
- whether multiple closets per user are allowed later

---

## 19. Direct Implementation Units

- DB migrations
- Zod schemas
- `/api/items` CRUD
- `/api/outfits` CRUD
- `/api/wear-logs` create and list
- `/api/care-logs` create and list
- closet list and detail UI
- outfit builder UI
- dashboard queries
- analytics queries
