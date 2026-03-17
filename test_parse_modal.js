const fs = require('fs');
const cheerio = require('cheerio');
const modalHTML = fs.readFileSync('modal.html', 'utf8');
const m$ = cheerio.load(modalHTML);
let qtys = [];
m$('[id^=genderCollapse] p').each((idx, el) => {
    let txt = m$(el).text();
    if (txt.includes('Quantity:')) {
        qtys.push(parseInt(txt.replace('Quantity:', '').trim(), 10) || 0);
    }
});
console.log('Male:', qtys[0], 'Female:', qtys[1]);
