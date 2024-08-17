/* eslint-disable */
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { createClient, RedisClientType } from 'redis';

@Injectable()
export class RedisService implements OnModuleInit, OnModuleDestroy {
    private client!: RedisClientType;

    onModuleInit() {
        this.client = createClient({
            url: 'redis://redis:6379',
        });

        this.client.on('error', (err) => {
            console.log("Error " + err);
        });

        this.client.connect().catch(console.error); // Conectar al cliente Redis
    }

    onModuleDestroy() {
        this.client.quit();
    }

    //? Guarda datos con TTL  en Redis

    async set(key: string, value: string, ttl?: number): Promise<void> {
        try {
            if (ttl) {
                await this.client.set(key, value, { EX: ttl });
            } else {
                await this.client.set(key, value);
            }
        } catch (err) {
            console.error("Error setting value in Redis:", err);
            throw err;
        }
    }

    // Para recuperar datos
    async get(key: string): Promise<string | null> {
        try {
            return await this.client.get(key);
        } catch (err) {
            console.error("Error getting value from Redis:", err);
            throw err;
        }
    }
}