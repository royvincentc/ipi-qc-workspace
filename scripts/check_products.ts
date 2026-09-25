import {getConfiguration} from '../server/configuration.js'; getConfiguration().then(c => console.log(JSON.stringify(c.value.products, null, 2))).catch(console.error);
