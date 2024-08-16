import { HttpService } from '@nestjs/axios';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as moment from 'moment';

import { Club } from '../../domain/model/club';
import { Court } from '../../domain/model/court';
import { Slot } from '../../domain/model/slot';
import { AlquilaTuCanchaClient } from '../../domain/ports/aquila-tu-cancha.client';

@Injectable()
export class HTTPAlquilaTuCanchaClient implements AlquilaTuCanchaClient {
  private base_url: string;
  private cache: Map<string, any>;

  constructor(private httpService: HttpService, config: ConfigService) {
    this.base_url = config.get<string>('ATC_BASE_URL', 'http://localhost:4000');
    this.cache = new Map<string, any>();
  }

  private async getCachedOrFetch<T>(
    key: string,
    fetchFn: () => Promise<T>,
  ): Promise<T> {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    const data = await fetchFn();
    this.cache.set(key, data);
    return data;
  }

  async getClubs(placeId: string): Promise<Club[]> {
    const cacheKey = `clubs:${placeId}`;
    return this.getCachedOrFetch(cacheKey, () =>
      this.httpService.axiosRef
        .get('clubs', {
          baseURL: this.base_url,
          params: { placeId },
        })
        .then((res) => res.data),
    );
  }

  async getCourts(clubId: number): Promise<Court[]> {
    const cacheKey = `courts:${clubId}`;
    return this.getCachedOrFetch(cacheKey, () =>
      this.httpService.axiosRef
        .get(`/clubs/${clubId}/courts`, {
          baseURL: this.base_url,
        })
        .then((res) => res.data),
    );
  }

  async getAvailableSlots(
    clubId: number,
    courtId: number,
    date: Date,
  ): Promise<Slot[]> {
    const cacheKey = `slots:${clubId}:${courtId}:${moment(date).format(
      'YYYY-MM-DD',
    )}`;
    return this.getCachedOrFetch(cacheKey, () =>
      this.httpService.axiosRef
        .get(`/clubs/${clubId}/courts/${courtId}/slots`, {
          baseURL: this.base_url,
          params: { date: moment(date).format('YYYY-MM-DD') },
        })
        .then((res) => res.data),
    );
  }

  async getClubsWithCourtsAndSlots(
    placeId: string,
    date: Date,
  ): Promise<(Club & { courts: (Court & { available: Slot[] })[] })[]> {
    const clubs = await this.getClubs(placeId);

    // Ejecutar solicitudes de canchas y slots concurrentemente
    const clubsWithAvailability = await Promise.all(
      clubs.map(async (club) => {
        const courts = await this.getCourts(club.id);

        const courtsWithAvailability = await Promise.all(
          courts.map(async (court) => {
            const slots = await this.getAvailableSlots(club.id, court.id, date);
            return {
              ...court,
              available: slots,
            };
          }),
        );

        return {
          ...club,
          courts: courtsWithAvailability,
        };
      }),
    );

    return clubsWithAvailability;
  }
}
