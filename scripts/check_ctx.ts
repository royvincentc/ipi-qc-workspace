import {db} from '../server/db.js';
db.query("SELECT data->>'category' as cat, data->>'context' as ctx FROM specifications").then(r => {
  console.log(r.rows);
  process.exit(0);
}).catch(console.error);
