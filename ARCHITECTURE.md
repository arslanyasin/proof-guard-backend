# NestJS Backend Architecture - Proof Guard

## Folder Structure

```
src/
├── auth/                          # Authentication Module
│   ├── dto/
│   │   ├── login.dto.ts          # Login request validation
│   │   └── register.dto.ts       # Registration request validation
│   ├── guards/
│   │   └── jwt-auth.guard.ts     # JWT authentication guard
│   ├── strategies/
│   │   └── jwt.strategy.ts       # Passport JWT strategy
│   ├── auth.controller.ts        # Auth endpoints (/auth/login, /auth/register)
│   ├── auth.service.ts           # Auth business logic (token generation, validation)
│   └── auth.module.ts            # Auth module definition
│
├── organizations/                 # Organizations Module
│   ├── dto/
│   │   ├── create-organization.dto.ts
│   │   └── update-organization.dto.ts
│   ├── organizations.controller.ts    # CRUD endpoints for organizations
│   ├── organizations.service.ts       # Business logic layer
│   ├── organizations.repository.ts    # Data access layer (Prisma)
│   └── organizations.module.ts
│
├── users/                         # Users Module
│   ├── dto/
│   │   ├── create-user.dto.ts
│   │   └── update-user.dto.ts
│   ├── users.controller.ts       # User management endpoints
│   ├── users.service.ts          # User business logic
│   ├── users.repository.ts       # User data access (Prisma)
│   └── users.module.ts
│
├── shipments/                     # Shipments Module
│   ├── dto/
│   │   ├── create-shipment.dto.ts
│   │   └── update-shipment.dto.ts
│   ├── shipments.controller.ts   # Shipment CRUD endpoints
│   ├── shipments.service.ts      # Shipment lifecycle management
│   ├── shipments.repository.ts   # Shipment data access (Prisma)
│   └── shipments.module.ts
│
├── videos/                        # Proof Videos Module
│   ├── dto/
│   │   ├── upload-video.dto.ts
│   │   └── update-video.dto.ts
│   ├── videos.controller.ts      # Video upload/management endpoints
│   ├── videos.service.ts         # Video business logic
│   ├── videos.repository.ts      # Video data access (Prisma)
│   └── videos.module.ts
│
├── share-links/                   # Share Links Module
│   ├── dto/
│   │   ├── create-share-link.dto.ts
│   │   └── validate-token.dto.ts
│   ├── share-links.controller.ts # Share link generation/validation
│   ├── share-links.service.ts    # Token generation, expiry logic
│   ├── share-links.repository.ts # Share link data access (Prisma)
│   └── share-links.module.ts
│
├── common/                        # Shared Utilities
│   ├── decorators/
│   │   └── current-user.decorator.ts  # Extract user from request
│   ├── guards/
│   │   └── organization.guard.ts      # Organization-level authorization
│   └── filters/
│       └── http-exception.filter.ts   # Global exception handling
│
├── prisma/                        # Prisma Module (Global)
│   ├── prisma.service.ts         # Prisma client wrapper
│   └── prisma.module.ts          # Global Prisma module
│
├── app.module.ts                  # Root application module
├── app.controller.ts              # Root controller
├── app.service.ts                 # Root service
└── main.ts                        # Application entry point
```

## Architecture Layers

### 1. **Controller Layer** (API Contract)
- **Responsibility**: HTTP request/response handling
- **Rules**:
  - NO business logic
  - Only validation (via DTOs)
  - Route definitions
  - Guard/decorator usage
  - Delegates to service layer

**Example**:
```typescript
@Controller('shipments')
@UseGuards(JwtAuthGuard)
export class ShipmentsController {
  constructor(private readonly shipmentsService: ShipmentsService) {}

  @Post()
  async create(@Body() dto: CreateShipmentDto, @CurrentUser('userId') userId: string) {
    return this.shipmentsService.create(dto, userId);
  }
}
```

### 2. **Service Layer** (Business Logic)
- **Responsibility**: Core business rules and orchestration
- **Rules**:
  - All business logic lives here
  - Validation of business rules
  - Error handling
  - Transaction orchestration
  - Calls repository for data access

**Example**:
```typescript
@Injectable()
export class ShipmentsService {
  constructor(private readonly shipmentsRepository: ShipmentsRepository) {}

  async create(createShipmentDto: CreateShipmentDto, createdById: string) {
    // Business rule: Check for duplicate AWB per organization
    const existing = await this.shipmentsRepository.findByAwb(
      createShipmentDto.awb,
      createShipmentDto.organizationId,
    );

    if (existing) {
      throw new ConflictException('Shipment with this AWB already exists');
    }

    return this.shipmentsRepository.create(createShipmentDto, createdById);
  }
}
```

### 3. **Repository Layer** (Data Access)
- **Responsibility**: Database operations via Prisma
- **Rules**:
  - Only Prisma queries
  - NO business logic
  - Return raw data or null
  - Include relations as needed

**Example**:
```typescript
@Injectable()
export class ShipmentsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateShipmentDto, createdById: string) {
    return this.prisma.shipment.create({
      data: { ...data, createdById },
      include: { organization: true, createdBy: true },
    });
  }

  async findByAwb(awb: string, organizationId: string) {
    return this.prisma.shipment.findUnique({
      where: { awb_organizationId: { awb, organizationId } },
    });
  }
}
```

## Key Design Decisions

### 1. **Layered Architecture**
- **Controller → Service → Repository → Database**
- Clear separation of concerns
- Easy to test each layer independently
- Repository pattern abstracts Prisma

### 2. **Module Organization**
- Each domain has its own module
- Modules are self-contained
- Export services for cross-module usage
- PrismaModule is global

### 3. **Authentication & Authorization**
- JWT-based authentication
- JwtAuthGuard protects routes
- CurrentUser decorator extracts user info
- OrganizationGuard for multi-tenancy

### 4. **Validation**
- DTOs with class-validator decorators
- Validation happens at controller level
- Business validation in services

### 5. **Error Handling**
- Global exception filter
- Consistent error response format
- HTTP exceptions from services

### 6. **Security**
- Passwords hashed with bcrypt
- JWT tokens for stateless auth
- Share links tokenized with expiry
- Organization-level data isolation

## Data Flow Example

**Creating a Shipment:**

```
1. POST /shipments
   ↓
2. ShipmentsController.create()
   - Validates CreateShipmentDto
   - Extracts userId from JWT
   ↓
3. ShipmentsService.create()
   - Checks if AWB already exists (business rule)
   - Throws ConflictException if duplicate
   ↓
4. ShipmentsRepository.create()
   - Executes Prisma query
   - Returns shipment with relations
   ↓
5. Response sent to client
```

## Module Dependencies

```
AuthModule
  └── depends on: UsersModule

OrganizationsModule
  └── depends on: PrismaModule

UsersModule
  └── depends on: PrismaModule

ShipmentsModule
  └── depends on: PrismaModule

VideosModule
  └── depends on: PrismaModule

ShareLinksModule
  └── depends on: PrismaModule
```

## API Endpoints Summary

### Auth
- `POST /auth/register` - Register new user
- `POST /auth/login` - Login user

### Organizations
- `POST /organizations` - Create organization
- `GET /organizations` - List organizations
- `GET /organizations/:id` - Get organization
- `PATCH /organizations/:id` - Update organization
- `DELETE /organizations/:id` - Delete organization

### Users
- `POST /users` - Create user
- `GET /users` - List users (filterable by org)
- `GET /users/me` - Get current user profile
- `GET /users/:id` - Get user
- `PATCH /users/:id` - Update user
- `DELETE /users/:id` - Delete user

### Shipments
- `POST /shipments` - Create shipment
- `GET /shipments` - List shipments (filterable by org)
- `GET /shipments/:id` - Get shipment
- `PATCH /shipments/:id` - Update shipment status
- `DELETE /shipments/:id` - Delete shipment

### Videos
- `POST /videos/upload` - Upload proof video
- `GET /videos` - List videos (filterable by org)
- `GET /videos/shipment/:shipmentId` - Get video by shipment
- `GET /videos/:id` - Get video
- `PATCH /videos/:id` - Update video
- `DELETE /videos/:id` - Delete video

### Share Links
- `POST /share-links` - Generate share link
- `GET /share-links` - List share links
- `GET /share-links/:id` - Get share link
- `POST /share-links/validate` - Validate token (public)
- `DELETE /share-links/:id` - Revoke share link
- `DELETE /share-links/cleanup/expired` - Cleanup expired links

## Environment Variables

Required in `.env`:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5433/proof_guard?schema=public"
JWT_SECRET="your-secret-key"
```

## Next Steps

1. Add file upload service (S3/CloudFlare R2) for video storage
2. Implement role-based access control (RBAC)
3. Add pagination to list endpoints
4. Implement search/filtering
5. Add API documentation (Swagger)
6. Set up logging (Winston/Pino)
7. Add rate limiting
8. Implement webhooks for shipment status updates
