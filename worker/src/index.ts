// FileChat Worker - Main Entry Point
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

// Routes
import { userPublicRoutes, userProtectedRoutes } from './routes/user';
import device from './routes/device';
import config from './routes/config';
import file from './routes/file';
import history from './routes/history';
import ws from './routes/ws';

import { errors } from './utils/response';

// Middleware
import { authMiddleware, extractUser } from './middleware/auth';

// Types
import type { Env } from './types';

// Durable Objects
export { fllo } from './do';

// Create Hono app
const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length', 'Content-Disposition'],
  maxAge: 86400,
}));

// API routes
const api = new Hono<{ Bindings: Env }>();

// Route definitions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const publicRoutes: [string, any][] = [
  ['/config', config],
  ['/user', userPublicRoutes],
  ['/ws', ws],
];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const protectedRoutes: [string, any, string[]][] = [
  [
    '/user',
    userProtectedRoutes,
    [
      '/user/settings',
      '/user/password',
      '/user/username',
      '/user/wstoken',
      '/user/invitation'
    ]
  ],
  [
    '/device',
    device,
    [
      '/device',
      '/device/*'
    ]
  ],
  [
    '/file',
    file,
    [
      '/file',
      '/file/*'
    ]
  ],
  [
    '/history',
    history,
    [
      '/history'
    ]
  ],
];

// Register public routes
for (const [path, handler] of publicRoutes) {
  api.route(path, handler);
}

// Register protected routes with auth middleware
for (const [path, handler, middlewarePaths] of protectedRoutes) {
  for (const mPath of middlewarePaths || [path, `${path}/*`]) {
    api.use(mPath, (c, next) => authMiddleware(c.env)(c, next));
    api.use(mPath, extractUser);
  }
  api.route(path, handler);
}

app.route('/api', api);

app.notFound((c) => errors.notFound(c, 'Not Found'));

app.onError((err, c) => {
  console.error('Error:', err);
  return errors.internal(c, 'Internal Server Error');
});

export default app;
