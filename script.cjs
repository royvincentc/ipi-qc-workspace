const fs = require('fs');
let code = fs.readFileSync('src/experience.css', 'utf8');
code = code.replace('.chat-pet{', '.chat-pet{overflow:hidden;');
fs.writeFileSync('src/experience.css', code);
