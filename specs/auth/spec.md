# Spec: `auth` — Autenticación y Gestión de Sesión

## 1. Objetivo
Permitir que los usuarios de **SmartPet** se registren como **Ciudadano** o como **Encargado** (junto con su establecimiento: veterinaria o refugio), inicien sesión y consulten su perfil autenticado mediante **JWT**.

## 2. Actores
- **Usuario no autenticado:** puede registrarse como `CIUDADANO` o como `ENCARGADO` (incluyendo los datos de su establecimiento) e iniciar sesión.
- **Usuario autenticado (`ADMIN`, `CIUDADANO`, `ENCARGADO`):** puede consultar su perfil y acceder a rutas protegidas con Bearer JWT mientras su cuenta esté activa (`estado = true`).

## 3. Requisitos Funcionales
- **RF-01 Registro de usuario (`POST /api/v1/auth/register`):**
  - Campos de usuario: `nombre`, `apellido`, `email`, `password` (obligatorios), y `telefono`, `fotoUrl` (opcionales).
  - Campo anidado opcional `establecimiento`: `nombre`, `tipo` (`VETERINARIA` | `REFUGIO`), `direccion`, `telefono` (obligatorios dentro de `establecimiento`), y `descripcion`, `latitud`, `longitud`, `horarioAtencion` (opcionales).
  - Si **no** se envía `establecimiento`: crear `usuario` con rol `CIUDADANO`.
  - Si **se envía** `establecimiento`: crear `usuario` con rol `ENCARGADO` y su registro en `establecimiento` dentro de una **transacción** de base de datos.
  - Almacenar la contraseña hasheada con `bcrypt` en `usuario.password_hash`.
  - Retornar `access_token` (JWT) y los datos públicos del usuario (y su `establecimiento` si aplica, sin `password_hash`).
- **RF-02 Inicio de sesión (`POST /api/v1/auth/login`):**
  - Autenticar mediante `email` y `password`.
  - Verificar que la cuenta exista, que `estado === true` y que la contraseña coincida con `password_hash`.
  - Emitir un `access_token` (JWT) junto con los datos públicos del usuario (y `establecimiento` si aplica).
- **RF-03 Perfil actual (`GET /api/v1/auth/profile`):**
  - Ruta protegida por `JwtAuthGuard`.
  - Validar el token y verificar que el usuario exista y siga activo (`estado === true`).
  - Retornar la información del usuario autenticado (y su `establecimiento` si existe, sin `password_hash`).

## 4. Reglas de Negocio
- **RN-01:** El `email` debe normalizarse (`trim().toLowerCase()`) y ser único en el sistema.
- **RN-02:** La contraseña debe tener mínimo 8 caracteres.
- **RN-03:** El rol nunca se recibe libremente desde el cliente: se asigna automáticamente `CIUDADANO` (sin `establecimiento`) o `ENCARGADO` (con `establecimiento`). Nadie puede auto-asignarse `ADMIN`.
- **RN-04:** Las respuestas nunca deben exponer `password_hash`.
- **RN-05:** Ante email inexistente, contraseña incorrecta o cuenta desactivada (`estado = false`), responder `401 Unauthorized`.
- **RN-06:** Si el registro de `ENCARGADO` falla al crear el `establecimiento`, la transacción debe hacer rollback para no dejar un `usuario` huérfano.

## 5. Criterios de Aceptación
- **CA-01a (Registro Ciudadano):** Sin `establecimiento`, `POST /api/v1/auth/register` crea el `usuario` con rol `CIUDADANO` y responde `201 Created` con `access_token` y `establecimiento: null`.
- **CA-01b (Registro Encargado):** Con `establecimiento` válido, `POST /api/v1/auth/register` crea `usuario` (rol `ENCARGADO`) + `establecimiento` en transacción y responde `201 Created`.
- **CA-02 (Email duplicado):** Dado un `email` ya existente, responde `409 Conflict`.
- **CA-03 (Validación de entrada):** Si falta un campo requerido (en usuario o dentro de `establecimiento`), el `email` es inválido, `tipo` no es `VETERINARIA | REFUGIO` o `password < 8`, responde `400 Bad Request`.
- **CA-04 (Login exitoso):** Con credenciales válidas y `estado = true`, `POST /api/v1/auth/login` responde `200 OK` con `access_token` y datos del usuario.
- **CA-05 (Login inválido o cuenta inactiva):** Con email inexistente, contraseña incorrecta o `estado = false`, responde `401 Unauthorized`.
- **CA-06 (Ruta protegida):** `GET /api/v1/auth/profile` sin token, con token inválido/expirado o usuario desactivado responde `401 Unauthorized`; con token válido responde `200 OK`.
