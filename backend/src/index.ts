import { createApp } from './app.js';
import { config } from './config.js';

createApp().listen(config.port, config.host, () => {
  console.log(`Arsenal backend listening on http://${config.host}:${config.port}`);
  console.log(`H4CK_ROOT: ${config.h4ckRoot}`);
});
