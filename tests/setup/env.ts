import path from 'node:path';
import { fileURLToPath } from 'node:url';

const setupDir = path.dirname(fileURLToPath(import.meta.url));
const arsenalRoot = path.resolve(setupDir, '../..');

process.env.ARSENAL_API_TOKEN ??= 'test-token';
process.env.H4CK_ROOT ??= path.resolve(arsenalRoot, '..');
process.env.PORT ??= '0';
process.env.HOST ??= '127.0.0.1';
