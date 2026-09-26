const fs = require('fs');
let css = fs.readFileSync('src/experience.css', 'utf8');

css = css.replace('right: -8px;\n    bottom: 0;', 'right: -8px;\n    bottom: 16px;');
css = css.replace('right: -10px;\n    bottom: -1px;', 'right: -10px;\n    bottom: 15px;');

fs.writeFileSync('src/experience.css', css);
console.log("Updated speech triangle position.");
