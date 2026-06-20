const fs = require('fs');
let html = fs.readFileSync('index.html', 'utf8');

const adminNew = fs.readFileSync('scratch.html', 'utf8');
const adminStart = '<div id="admin-tab-reports" class="tab-view">';
const adminEnd = '<!-- Admin Settings Tab -->';
let startIdx = html.indexOf(adminStart);
let endIdx = html.indexOf(adminEnd);
if(startIdx > -1 && endIdx > -1) {
    html = html.substring(0, startIdx) + adminNew + '\n                    ' + html.substring(endIdx);
    console.log("Admin replaced.");
}

const mgrNew = fs.readFileSync('scratch-manager.html', 'utf8');
const mgrStart = '<div id="manager-tab-reports" class="tab-view">';
const mgrEnd = '<!-- Manager My Payslips Tab -->';
startIdx = html.indexOf(mgrStart);
endIdx = html.indexOf(mgrEnd);
if(startIdx > -1 && endIdx > -1) {
    html = html.substring(0, startIdx) + mgrNew + '\n                    ' + html.substring(endIdx);
    console.log("Manager replaced.");
}

fs.writeFileSync('index.html', html, 'utf8');
console.log("Done");
