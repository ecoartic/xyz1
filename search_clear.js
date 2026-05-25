const fs = require('fs');
const path = require('path');

const libPath = path.join(__dirname, 'tubes1.min.js');
const content = fs.readFileSync(libPath, 'utf8');

const terms = ['setClearColor', 'clearColor', 'background', 'clearAlpha', 'setClearAlpha'];
terms.forEach(term => {
    console.log(`=== Searching for "${term}" ===`);
    const regex = new RegExp(term, 'g');
    let m;
    while ((m = regex.exec(content)) !== null) {
        console.log(`Match at ${m.index}:`);
        console.log(content.substring(m.index - 100, m.index + 200));
        console.log('---');
    }
});
