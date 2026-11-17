import { Mascota } from '../mascotas/entities/mascota.entity';
import { Establecimiento } from '../establecimientos/entities/establecimiento.entity';
export function animalResponse(pet: Mascota) {
  return {
    id: pet.id,
    nombre: pet.nombre,
    especieId: pet.especieId,
    especie: pet.especie
      ? { id: pet.especie.id, nombre: pet.especie.nombre }
      : null,
    razaNombre: pet.razaNombre,
    sexo: pet.sexo,
    color: pet.color,
    pesoKg: pet.pesoKg == null ? null : Number(pet.pesoKg),
    edadAproximadaMeses: pet.edadAproximadaMeses,
    fotos: [...(pet.fotos ?? [])]
      .sort(
        (a, b) =>
          Number(b.esPrincipal) - Number(a.esPrincipal) ||
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime() ||
          a.id.localeCompare(b.id),
      )
      .map((f) => ({ id: f.id, url: f.url, esPrincipal: f.esPrincipal })),
  };
}
export function establishmentResponse(e: Establecimiento) {
  return {
    id: e.id,
    nombre: e.nombre,
    tipo: e.tipo,
    direccion: e.direccion,
    telefono: e.telefono,
    horarioAtencion: e.horarioAtencion,
  };
}
