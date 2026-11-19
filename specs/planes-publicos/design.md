# Design: planes publicos

`GET /api/v1/pagos/planes/publicos` delega en `SuscripcionesService.listarDisponibles()` y devuelve nombre, descripcion, precio, cupos y estado activo. La administracion de planes conserva sus rutas protegidas.

