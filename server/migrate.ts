import {migrate,close} from './db.js';
await migrate();await close();console.log('Database schema ready');
