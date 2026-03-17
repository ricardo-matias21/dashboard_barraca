const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test2.html', 'utf8'));

let out = '';
$('.vendor-box').each((i, el) => {
    let title = $(el).find('.title').text().trim();
    if (title.includes('Shot')) {
        out += title + ' ' + JSON.stringify(el.attribs, null, 2) + '\n';
    }
});
fs.writeFileSync('attrs.txt', out, 'utf8');
