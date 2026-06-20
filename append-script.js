const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');
const target = "document.write('<script src=\"assets.js?v=' + cacheBuster + '\"><\\/script>');";
const replacement = target + "\n        document.write('<script src=\"reports.js?v=' + cacheBuster + '\"><\\/script>');";
html = html.replace(target, replacement);
fs.writeFileSync('index.html', html, 'utf8');
console.log("Done");
