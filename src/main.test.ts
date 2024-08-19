/* eslint-disable */

import { NestFactory } from '@nestjs/core';
import {
    FastifyAdapter,
    NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import { bootstrap } from './bootstrap'; // Importa la función que quieres probar

jest.mock('@nestjs/core', () => ({
    NestFactory: {
        create: jest.fn(),
    },
}));

jest.mock('@nestjs/platform-fastify', () => ({
    FastifyAdapter: jest.fn(),
}));

describe('Bootstrap', () => {
    let listenMock: jest.Mock;

    beforeEach(() => {
        listenMock = jest.fn();
        (NestFactory.create as jest.Mock).mockResolvedValue({
            listen: listenMock,
        } as unknown as NestFastifyApplication);
    });

    it('should create a NestFastifyApplication and listen on the correct port', async () => {
        await bootstrap();

        expect(NestFactory.create).toHaveBeenCalledWith(
            AppModule,
            expect.any(FastifyAdapter),
        );
        expect(listenMock).toHaveBeenCalledWith(3000, '0.0.0.0');
    });
});
