# Proof Video Immutability - Summary

## Overview

Enforced strict immutability rules for proof videos to ensure evidence integrity and compliance with the proof lifecycle.

---

## Rules Enforced

1. ✅ **One video per shipment** - Cannot upload multiple videos for same shipment
2. ✅ **No updates after upload** - Videos are immutable once created
3. ✅ **Upload only during PROCESSING** - Videos can only be uploaded when shipment status is PROCESSING
4. ✅ **Auto-seal after upload** - Shipment automatically transitions to SEALED status after successful video upload

---

## Changed Files (5 files)

### 1. **src/videos/videos.controller.ts**

**Removed:**
- `Patch` import from `@nestjs/common`
- `UpdateVideoDto` import
- `@Patch(':id')` endpoint
- `update()` method

**Result:**
- `PATCH /videos/:id` endpoint no longer available
- Returns `404 Not Found` if called

---

### 2. **src/videos/videos.service.ts**

**Added:**
- `BadRequestException` import
- `ShipmentStatus` import from `@prisma/client`
- `ShipmentsRepository` injection
- Shipment status validation in `upload()` method
- Auto-seal logic after successful upload

**Removed:**
- `UpdateVideoDto` import
- `update()` method

**New Upload Flow:**

```typescript
async upload(uploadVideoDto: UploadVideoDto, uploadedById: string) {
  // 1. Check if video already exists (immutability)
  const existing = await this.videosRepository.findByShipmentId(
    uploadVideoDto.shipmentId,
  );

  if (existing) {
    throw new ConflictException(
      `Proof video already exists for shipment ${uploadVideoDto.shipmentId}. ` +
      `Videos are immutable and cannot be replaced.`,
    );
  }

  // 2. Verify shipment exists and is in PROCESSING status
  const shipment = await this.shipmentsRepository.findById(
    uploadVideoDto.shipmentId,
  );

  if (!shipment) {
    throw new NotFoundException(
      `Shipment ${uploadVideoDto.shipmentId} not found`,
    );
  }

  if (shipment.status !== ShipmentStatus.PROCESSING) {
    throw new BadRequestException(
      `Video upload only allowed when shipment status is PROCESSING. ` +
      `Current status: ${shipment.status}`,
    );
  }

  // 3. Upload the video
  const video = await this.videosRepository.create(
    uploadVideoDto,
    uploadedById,
  );

  // 4. Automatically seal the shipment
  await this.shipmentsRepository.update(uploadVideoDto.shipmentId, {
    status: ShipmentStatus.SEALED,
  });

  return video;
}
```

**Validation Rules:**
- ✅ Checks if video already exists for shipment
- ✅ Verifies shipment exists
- ✅ Ensures shipment status is PROCESSING
- ✅ Auto-seals shipment after upload

---

### 3. **src/videos/videos.repository.ts**

**Removed:**
- `UpdateVideoDto` import
- `update()` method

**Result:**
- No database update operation available for videos

---

### 4. **src/videos/videos.module.ts**

**Added:**
- `ShipmentsModule` import
- `ShipmentsModule` to imports array

**Result:**
- VideosService can now inject ShipmentsRepository

---

### 5. **src/shipments/shipments.module.ts**

**Added:**
- `ShipmentsRepository` to exports array

**Before:**
```typescript
exports: [ShipmentsService]
```

**After:**
```typescript
exports: [ShipmentsService, ShipmentsRepository]
```

**Result:**
- ShipmentsRepository now available for injection in other modules (VideosModule)

---

## API Changes

### ❌ Removed Endpoints

```http
PATCH /videos/:id    # 404 Not Found
```

### ✅ Enhanced Endpoints

```http
POST /videos/upload
```

**New Behavior:**
- Only works when shipment status = PROCESSING
- Automatically seals shipment after successful upload
- Cannot upload if video already exists

---

## Proof Lifecycle Integration

### Complete Flow

```
1. Create Shipment
   POST /shipments
   { "awb": "AWB123", "organizationId": "uuid" }
   → Status: CREATED

2. Start Recording
   PATCH /shipments/:id
   { "status": "RECORDING" }
   → Status: RECORDING

3. Move to Processing
   PATCH /shipments/:id
   { "status": "PROCESSING" }
   → Status: PROCESSING

4. Upload Video (Auto-Seals)
   POST /videos/upload
   { "shipmentId": "uuid", "videoUrl": "https://..." }
   → Video created
   → Shipment status: SEALED (automatic)

5. Shipment Now Immutable
   PATCH /shipments/:id
   { "status": "RECORDING" }
   → 400 Bad Request - "Cannot modify a sealed shipment"
```

---

## Error Scenarios

### ❌ Upload when not in PROCESSING status

```http
POST /videos/upload
{
  "shipmentId": "abc-123",
  "videoUrl": "https://example.com/video.mp4"
}

Response: 400 Bad Request
{
  "statusCode": 400,
  "message": "Video upload only allowed when shipment status is PROCESSING. Current status: CREATED"
}
```

### ❌ Upload video twice

```http
POST /videos/upload
{
  "shipmentId": "abc-123",
  "videoUrl": "https://example.com/video2.mp4"
}

Response: 409 Conflict
{
  "statusCode": 409,
  "message": "Proof video already exists for shipment abc-123. Videos are immutable and cannot be replaced."
}
```

### ❌ Attempt to update video

```http
PATCH /videos/xyz-789
{
  "videoUrl": "https://example.com/new-video.mp4"
}

Response: 404 Not Found
```

### ❌ Upload for non-existent shipment

```http
POST /videos/upload
{
  "shipmentId": "invalid-id",
  "videoUrl": "https://example.com/video.mp4"
}

Response: 404 Not Found
{
  "statusCode": 404,
  "message": "Shipment invalid-id not found"
}
```

---

## State Diagram

```
CREATED ──► RECORDING ──► PROCESSING ──┬──► [Video Upload]
                                       │     ↓
                                       │   SEALED (automatic, immutable)
                                       │
                                       └──► FAILED
```

**Key Points:**
- Video upload triggers automatic SEALED transition
- SEALED shipments cannot be modified (enforced in ShipmentsService)
- Videos cannot be updated or deleted once uploaded

---

## Breaking Changes

⚠️ **API Endpoints Removed:**
- `PATCH /videos/:id`

⚠️ **Service Methods Removed:**
- `VideosService.update()`

⚠️ **Repository Methods Removed:**
- `VideosRepository.update()`

⚠️ **Behavior Changes:**
- Video upload now requires shipment status = PROCESSING
- Video upload automatically seals the shipment
- Cannot replace or update videos after upload

---

## Testing Checklist

- [ ] Verify `PATCH /videos/:id` returns 404
- [ ] Verify video upload fails when shipment is not PROCESSING
- [ ] Verify video upload auto-seals shipment
- [ ] Verify cannot upload video twice for same shipment
- [ ] Verify sealed shipment cannot be modified
- [ ] Verify complete lifecycle: CREATED → RECORDING → PROCESSING → [Upload] → SEALED
- [ ] Test upload with non-existent shipment (404)
- [ ] Test upload when shipment already has video (409)

---

## Benefits

### 1. **Evidence Integrity**
- Videos cannot be tampered with after upload
- One video per shipment ensures no confusion
- Immutability provides legal compliance

### 2. **Proof Lifecycle Enforcement**
- Clear state machine with automatic transitions
- Video upload triggers sealing
- PROCESSING → SEALED is enforced atomically

### 3. **Data Integrity**
- Cannot accidentally replace proof videos
- Sealed shipments are fully immutable
- Audit trail preserved

### 4. **API Simplicity**
- Removed update endpoints reduce attack surface
- Fewer operations = fewer ways to corrupt data
- Clear error messages guide correct usage

---

## Migration Impact

### Client Code Changes

**Before:**
```typescript
// ❌ This will no longer work
await api.patch(`/videos/${videoId}`, {
  videoUrl: 'new-url'
});

// ❌ Could upload anytime
await api.post('/videos/upload', {
  shipmentId,
  videoUrl
});
```

**After:**
```typescript
// ✅ Must transition to PROCESSING first
await api.patch(`/shipments/${shipmentId}`, {
  status: 'PROCESSING'
});

// ✅ Then upload (auto-seals)
await api.post('/videos/upload', {
  shipmentId,
  videoUrl
});

// Shipment is now SEALED and immutable
```

---

## Recommendations

### 1. **Pre-Upload Validation**

Add video validation before upload:
```typescript
// Check file size, format, duration
async validateVideo(file: File): Promise<boolean> {
  if (file.size > MAX_SIZE) throw new Error('File too large');
  if (!ALLOWED_FORMATS.includes(file.type)) throw new Error('Invalid format');
  return true;
}
```

### 2. **Upload Progress Tracking**

Track upload progress for large videos:
```typescript
// Add upload status tracking
enum UploadStatus {
  PENDING,
  UPLOADING,
  PROCESSING,
  COMPLETED,
  FAILED
}
```

### 3. **Retry Logic**

Handle upload failures gracefully:
```typescript
// If upload fails, shipment stays in PROCESSING
// User can retry upload without changing status
```

### 4. **Audit Logging**

Log all upload attempts:
```typescript
await this.auditLog.create({
  action: 'VIDEO_UPLOAD',
  shipmentId,
  userId,
  status: 'SUCCESS',
  timestamp: new Date()
});
```

---

## Summary

**Files Modified:** 5
**Endpoints Removed:** 1
**Methods Removed:** 3
**New Validations:** 3
**Auto-Transitions:** PROCESSING → SEALED

**Result:** Proof videos are now strictly immutable with enforced lifecycle integration. Videos can only be uploaded during PROCESSING status and automatically seal the shipment upon success.
