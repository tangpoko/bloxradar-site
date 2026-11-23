// BloxRadar website. `npm start` runs this. Hostinger sets PORT.
import 'dotenv/config';
import { createApp } from './server/app.js';
import { SOURCE } from './server/data/index.js';

const port = Number(process.env.PORT || 3000);
createApp().listen(port, () => {
  console.log(`BloxRadar listening on port ${port}, data source: ${SOURCE}`);
});
