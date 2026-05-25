const fs = require('fs');
const path = require('path');

const libPath = path.join(__dirname, 'tubes1.min.js');
const content = fs.readFileSync(libPath, 'utf8');

console.log('--- DEFAULT OPTIONS YC ---');
console.log(content.substring(770000, 771200));
