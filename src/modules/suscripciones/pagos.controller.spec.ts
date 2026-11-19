import { PagosController } from './pagos.controller';
import { SuscripcionesService } from './suscripciones.service';

describe('PagosController', () => {
  it('devuelve los planes activos para el sitio publico', async () => {
    const planes = [{ id: 'plan-gratis', nombre: 'Gratis' }];
    const listarDisponibles = jest.fn().mockResolvedValue(planes);
    const suscripciones = {
      listarDisponibles,
    } as unknown as SuscripcionesService;
    const controller = new PagosController(suscripciones);

    await expect(controller.planesPublicos()).resolves.toEqual(planes);
    expect(listarDisponibles).toHaveBeenCalledTimes(1);
  });
});
