# Shipment Status Refactor - Proof Lifecycle

## Summary

Refactored the Shipment model and service to enforce a **proof lifecycle** instead of logistics tracking.

---

## Changed Files

### 1. `prisma/schema.prisma`

**Change:** Updated ShipmentStatus enum

```prisma
enum ShipmentStatus {
  CREATED      // Initial state when shipment is created
  RECORDING    // Video recording in progress
  PROCESSING   // Video being processed/validated
  SEALED       // Proof sealed and immutable (terminal)
  FAILED       // Process failed (terminal)
}
```

**Removed Statuses:**
- ~~PICKED_UP~~
- ~~IN_TRANSIT~~
- ~~OUT_FOR_DELIVERY~~
- ~~DELIVERED~~
- ~~CANCELLED~~

---

### 2. `src/shipments/shipments.service.ts`

**Changes:**
- Added state transition validation logic
- Added `validTransitions` map defining allowed transitions
- Added `validateStateTransition()` private method
- Updated `update()` method to enforce transitions

**Valid State Transitions:**

```
CREATED ──────┬─────► RECORDING ────► PROCESSING ────► SEALED
              │                                          (terminal)
              │
              └─────► FAILED
                      (terminal)

RECORDING ────┬─────► PROCESSING
              └─────► FAILED

PROCESSING ───┬─────► SEALED
              └─────► FAILED
```

**State Transition Rules:**

| Current Status | Allowed Next States |
|---------------|---------------------|
| CREATED       | RECORDING, FAILED   |
| RECORDING     | PROCESSING, FAILED  |
| PROCESSING    | SEALED, FAILED      |
| SEALED        | None (terminal)     |
| FAILED        | None (terminal)     |

**Error Handling:**
- Throws `BadRequestException` with detailed message on invalid transitions
- Example: `"Invalid state transition: Cannot move from SEALED to RECORDING. Allowed transitions: None (terminal state)"`

**Key Features:**
- ✅ Idempotent updates (same status allowed)
- ✅ Terminal states (SEALED, FAILED) cannot transition
- ✅ FAILED state can be reached from any non-terminal state
- ✅ Clear error messages showing allowed transitions

---

### 3. `src/shipments/dto/create-shipment.dto.ts`

**Change:** Removed `status` field from CreateShipmentDto

**Before:**
```typescript
export class CreateShipmentDto {
  awb: string;
  status: ShipmentStatus;  // ❌ Removed
  organizationId: string;
}
```

**After:**
```typescript
export class CreateShipmentDto {
  awb: string;
  organizationId: string;
  // Status defaults to CREATED via Prisma schema
}
```

**Reason:** All new shipments should start with `CREATED` status (enforced by database default)

---

## Implementation Details

### State Transition Validation

```typescript
private readonly validTransitions: Record<ShipmentStatus, ShipmentStatus[]> = {
  [ShipmentStatus.CREATED]: [ShipmentStatus.RECORDING, ShipmentStatus.FAILED],
  [ShipmentStatus.RECORDING]: [ShipmentStatus.PROCESSING, ShipmentStatus.FAILED],
  [ShipmentStatus.PROCESSING]: [ShipmentStatus.SEALED, ShipmentStatus.FAILED],
  [ShipmentStatus.SEALED]: [],    // Terminal state
  [ShipmentStatus.FAILED]: [],    // Terminal state
};

private validateStateTransition(
  currentStatus: ShipmentStatus,
  newStatus: ShipmentStatus,
): void {
  if (currentStatus === newStatus) return; // Idempotent

  const allowedTransitions = this.validTransitions[currentStatus];

  if (!allowedTransitions.includes(newStatus)) {
    throw new BadRequestException(
      `Invalid state transition: Cannot move from ${currentStatus} to ${newStatus}. ` +
      `Allowed transitions: ${allowedTransitions.join(', ') || 'None (terminal state)'}`
    );
  }
}
```

---

## Usage Examples

### ✅ Valid Transitions

```typescript
// Create shipment (defaults to CREATED)
POST /shipments
{
  "awb": "AWB123",
  "organizationId": "uuid"
}
// Status: CREATED

// Start recording
PATCH /shipments/:id
{ "status": "RECORDING" }
// CREATED → RECORDING ✓

// Process video
PATCH /shipments/:id
{ "status": "PROCESSING" }
// RECORDING → PROCESSING ✓

// Seal proof
PATCH /shipments/:id
{ "status": "SEALED" }
// PROCESSING → SEALED ✓
```

### ❌ Invalid Transitions

```typescript
// Try to skip RECORDING
PATCH /shipments/:id
{ "status": "PROCESSING" }
// CREATED → PROCESSING ✗
// Error: "Invalid state transition: Cannot move from CREATED to PROCESSING.
//         Allowed transitions: RECORDING, FAILED"

// Try to modify sealed shipment
PATCH /shipments/:id
{ "status": "RECORDING" }
// SEALED → RECORDING ✗
// Error: "Invalid state transition: Cannot move from SEALED to RECORDING.
//         Allowed transitions: None (terminal state)"

// Try to recover from failure
PATCH /shipments/:id
{ "status": "CREATED" }
// FAILED → CREATED ✗
// Error: "Invalid state transition: Cannot move from FAILED to CREATED.
//         Allowed transitions: None (terminal state)"
```

### ✅ Emergency Failure

```typescript
// Mark as failed from any state
PATCH /shipments/:id
{ "status": "FAILED" }
// CREATED/RECORDING/PROCESSING → FAILED ✓
```

---

## Database Migration

Applied using `npx prisma db push`:
- Updated `ShipmentStatus` enum in PostgreSQL
- Removed old enum values (with data loss warning)
- Regenerated Prisma Client with new types

---

## Testing Recommendations

1. **Unit Tests** - Test state transition validation:
   ```typescript
   describe('ShipmentsService - State Transitions', () => {
     it('should allow CREATED → RECORDING', () => {});
     it('should reject CREATED → PROCESSING', () => {});
     it('should reject transitions from SEALED', () => {});
   });
   ```

2. **Integration Tests** - Test full lifecycle:
   ```typescript
   it('should complete full proof lifecycle', async () => {
     // CREATED → RECORDING → PROCESSING → SEALED
   });
   ```

3. **Edge Cases**:
   - Idempotent updates (same status)
   - Terminal state protection
   - Concurrent updates
   - Invalid status values

---

## Breaking Changes

⚠️ **API Changes:**
- `POST /shipments` no longer accepts `status` field
- All existing shipments with old statuses will need data migration
- Invalid transitions now return `400 Bad Request` instead of updating silently

⚠️ **Database Changes:**
- ShipmentStatus enum values changed
- Existing data with old statuses will cause errors

---

## Migration Path for Existing Data

If you have existing shipments, run:

```sql
-- Map old statuses to new lifecycle
UPDATE shipments
SET status = CASE
  WHEN status IN ('PICKED_UP', 'IN_TRANSIT') THEN 'RECORDING'
  WHEN status = 'OUT_FOR_DELIVERY' THEN 'PROCESSING'
  WHEN status = 'DELIVERED' THEN 'SEALED'
  WHEN status = 'CANCELLED' THEN 'FAILED'
  ELSE status
END;
```

---

## Next Steps

Recommended enhancements:

1. **State Change Audit Log** - Track who changed status and when
2. **Webhooks** - Notify on status changes
3. **State-specific Business Rules**:
   - Allow video upload only in RECORDING state
   - Generate share links only for SEALED shipments
   - Prevent deletion of SEALED shipments
4. **Timeouts** - Auto-fail shipments stuck in non-terminal states
5. **Metrics** - Track time spent in each state
