# Animales resguardados y adopciones

ENCARGADO de VETERINARIA o REFUGIO activo registra animales resguardados con la misma ficha y fotos de mascotas (1-5 JPEG/PNG/WebP, 5 MiB). El servidor deduce establecimiento y propietario de la sesion; nunca se reciben del cliente. Registro de mascota, fotos y asociacion institucional atomicos con compensaciones existentes. Las mascotas personales existentes no se convierten automaticamente en animales resguardados.

Registro institucional y publicacion para adopcion son distintos. El animal se registra EN_RESGUARDO; puede publicarse posteriormente, retirarse y republicarse. La publicacion contiene descripcion obligatoria y requisitos opcionales (hasta 2000 caracteres cada uno). Solo el encargado del establecimiento puede gestionar sus animales/publicaciones. ADMIN y CIUDADANO no tienen acceso a esas mutaciones. Establecimiento inactivo: 403. Recurso ajeno: 404.

Una publicacion por animal con estados PUBLICADA, RETIRADA, ADOPTADA. Marcar adoptado requiere confirmacion, cambia tambien estado de resguardo a ADOPTADO y fecha de adopcion del servidor; es terminal, no admite republicar. No se gestionan postulaciones, datos de adoptantes, chat, pagos, verificacion ni IA. Las fotos/datos pueden editarse mientras siga EN_RESGUARDO. El catalogo solo muestra PUBLICADA si animal/mascota, establecimiento y encargado siguen activos. No revela datos personales del encargado, storageKey ni hashes; si muestra telefono y direccion institucionales para contacto.

Conservar endpoints y comportamiento de mascotas personales; rutas nuevas para resguardo. Sin cambios en env ni nuevas dependencias. No tocar el movil en esta entrega. Las respuestas institucionales explicitan establecimiento, ficha y estado.

Aceptacion: ambos tipos institucionales registran/publican; permiso, propiedad y campos del servidor protegidos; misma validacion de fotos; listados paginados; detalle y edicion/fotos; publicar/editar/retirar/republicar/adoptar; ocultar catalogo al desactivar mascota o establecimiento; operaciones concurrentes preservan estado/una publicacion; regresion de mascotas, alertas y avistamientos.
