# Design: `auth`

## 1. Entidades Involucradas
- **`Rol`** (`src/modules/roles/entities/rol.entity.ts` → tabla `rol`):
  - `id: number` (INTEGER PK)
  - `nombre: string` (`ADMIN`, `CIUDADANO`, `ENCARGADO`)
- **`Usuario`** (`src/modules/usuarios/entities/usuario.entity.ts` → tabla `usuario`):
  - `id: string` (UUID PK)
  - `rolId: number` (`rol_id` FK → `rol.id`)
  - `nombre: string` (`VARCHAR(100)`)
  - `apellido: string` (`VARCHAR(100)`)
  - `telefono: string | null` (`VARCHAR(20)`)
  - `fotoUrl: string | null` (`foto_url`, `TEXT`)
  - `email: string` (`VARCHAR(150)`, UNIQUE)
  - `passwordHash: string` (`password_hash`, `VARCHAR(255)`)
  - `estado: boolean` (`DEFAULT true`)
  - `createdAt`, `updatedAt` (`TIMESTAMPTZ`)
- **`Establecimiento`** (`src/modules/establecimientos/entities/establecimiento.entity.ts` → tabla `establecimiento`):
  - `id: string` (UUID PK)
  - `usuarioId: string` (`usuario_id` FK → `usuario.id`, UNIQUE)
  - `nombre: string` (`VARCHAR(150)`)
  - `tipo: TipoEstablecimiento` (`VETERINARIA` | `REFUGIO`)
  - `descripcion: string | null` (`TEXT`)
  - `direccion: string` (`VARCHAR(255)`)
  - `latitud: number | null` (`DECIMAL(10,8)`)
  - `longitud: number | null` (`DECIMAL(11,8)`)
  - `telefono: string` (`VARCHAR(20)`)
  - `horarioAtencion: string | null` (`horario_atencion`, `VARCHAR(150)`)
  - `estado: boolean` (`DEFAULT true`)
  - `createdAt`, `updatedAt` (`TIMESTAMPTZ`)

---

## 2. Contratos de API

### 2.1 `POST /api/v1/auth/register`
- **Acceso:** Público
- **Request Body (`RegisterDto`):**
  - `nombre`: string obligatorio (`@MaxLength(100)`)
  - `apellido`: string obligatorio (`@MaxLength(100)`)
  - `email`: email obligatorio (`@MaxLength(150)`)
  - `password`: string obligatorio (`@MinLength(8)`, `@MaxLength(72)`)
  - `telefono`: string opcional (`@MaxLength(20)`)
  - `fotoUrl`: string opcional
  - `establecimiento`: objeto opcional (`@ValidateNested()`, `@Type(() => RegisterEstablecimientoDto)`). Si se incluye, el usuario se crea con rol `ENCARGADO`; si se omite, con rol `CIUDADANO`:
    - `nombre`: string obligatorio (`@MaxLength(150)`)
    - `tipo`: enum obligatorio (`VETERINARIA` | `REFUGIO`)
    - `descripcion`: string opcional
    - `direccion`: string obligatorio (`@MaxLength(255)`)
    - `latitud`: number opcional
    - `longitud`: number opcional
    - `telefono`: string obligatorio (`@MaxLength(20)`)
    - `horarioAtencion`: string opcional (`@MaxLength(150)`)
- **Responses:** `201 Created`, `400 Bad Request`, `409 Conflict`.

### 2.2 `POST /api/v1/auth/login`
- **Acceso:** Público (`200 OK`, `400 Bad Request`, `401 Unauthorized`).

### 2.3 `GET /api/v1/auth/profile`
- **Acceso:** Privado con `JwtAuthGuard` (`200 OK`, `401 Unauthorized`).
