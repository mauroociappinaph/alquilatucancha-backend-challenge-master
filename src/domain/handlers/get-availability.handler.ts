/* eslint-disable */
import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { RedisService } from '../../redis.service';  // Asegúrate de que la ruta es correcta
import {
  ClubWithAvailability,
  GetAvailabilityQuery,
} from '../commands/get-availaiblity.query';
import {
  ALQUILA_TU_CANCHA_CLIENT,
  AlquilaTuCanchaClient,
} from '../ports/aquila-tu-cancha.client';

@QueryHandler(GetAvailabilityQuery)
export class GetAvailabilityHandler
  implements IQueryHandler<GetAvailabilityQuery> {
  private readonly logger = new Logger(GetAvailabilityHandler.name);

  constructor(
    @Inject(ALQUILA_TU_CANCHA_CLIENT)
    private alquilaTuCanchaClient: AlquilaTuCanchaClient,
    private redisService: RedisService  // Inyecta RedisService
  ) { }

  async execute(query: GetAvailabilityQuery): Promise<ClubWithAvailability[]> {
    this.logger.log(`Fetching availability for placeId: ${query.placeId} and date: ${query.date}`);

    // Genera una clave única para el caché usando el placeId y la fecha
    const cacheKey = `availability:${query.placeId}:${query.date}`;

    // Intenta obtener la respuesta desde el caché
    const cachedResponse = await this.redisService.get(cacheKey);
    if (cachedResponse) {
      this.logger.log(`Cache hit for placeId: ${query.placeId} and date: ${query.date}`);
      return JSON.parse(cachedResponse);  // Retorna la respuesta desde el caché
    }

    // Si no está en caché, realiza las solicitudes a la API mock
    const clubs = await this.alquilaTuCanchaClient.getClubs(query.placeId);

    const clubs_with_availability = await Promise.all(
      clubs.map(async (club) => {
        const courts = await this.alquilaTuCanchaClient.getCourts(club.id);

        const courts_with_availability = await Promise.all(
          courts.map(async (court) => {
            const slots = await this.alquilaTuCanchaClient.getAvailableSlots(
              club.id,
              court.id,
              query.date,
            );
            return {
              ...court,
              available: slots,
            };
          }),
        );

        return {
          ...club,
          courts: courts_with_availability,
        };
      }),
    );

    // Guarda la respuesta en el caché con un TTL (por ejemplo, 1 hora)
    await this.redisService.set(cacheKey, JSON.stringify(clubs_with_availability), 3600);

    this.logger.log(`Cache set for placeId: ${query.placeId} and date: ${query.date}`);

    return clubs_with_availability;
  }
}