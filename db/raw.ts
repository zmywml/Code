import { env } from 'cloudflare:workers';
export function database(){if(!env.DB)throw new Error('数据库暂不可用，请稍后重试。');return env.DB;}
