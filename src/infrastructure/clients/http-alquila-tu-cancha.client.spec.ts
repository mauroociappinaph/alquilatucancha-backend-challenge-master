/* eslint-disable */
import { Test } from '@nestjs/testing';
import { HTTPAlquilaTuCanchaClient } from './http-alquila-tu-cancha.client';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';

describe('HttpAlquilaTuCanchaClient', () => {
    let client: HTTPAlquilaTuCanchaClient;
    let httpService: HttpService;

    beforeEach(async () => {
        const moduleRef = await Test.createTestingModule({
            providers: [
                HTTPAlquilaTuCanchaClient,
                {
                    provide: HttpService,
                    useValue: {
                        axiosRef: {
                            get: jest.fn(),
                        },
                    },
                },
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue('http://localhost:4000'),
                    },
                },
            ],
        }).compile();

        client = moduleRef.get<HTTPAlquilaTuCanchaClient>(HTTPAlquilaTuCanchaClient);
        httpService = moduleRef.get<HttpService>(HttpService);
    });

    describe('getClubs', () => {
        it('should return a list of clubs', async () => {
            const mockClubs = [{ id: 1, name: 'Club 1' }, { id: 2, name: 'Club 2' }];
            const response: AxiosResponse = {
                data: mockClubs,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {},
            };

            jest.spyOn(httpService.axiosRef, 'get').mockResolvedValue(response);

            const result = await client.getClubs('somePlaceId');
            expect(result).toEqual(mockClubs);
            expect(httpService.axiosRef.get).toHaveBeenCalledWith('/clubs', {
                baseURL: 'http://localhost:4000',
                params: { placeId: 'somePlaceId' },
            });
        });

        it('should cache the result', async () => {
            const mockClubs = [{ id: 1, name: 'Club 1' }];
            const response: AxiosResponse = {
                data: mockClubs,
                status: 200,
                statusText: 'OK',
                headers: {},
                config: {},
            };

            jest.spyOn(httpService.axiosRef, 'get').mockResolvedValue(response);

            await client.getClubs('somePlaceId'); // Primera llamada
            await client.getClubs('somePlaceId'); // Segunda llamada, debería usar caché

            expect(httpService.axiosRef.get).toHaveBeenCalledTimes(1); // Solo debería llamarse una vez
        });
    });
});