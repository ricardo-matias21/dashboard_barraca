const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test2.html', 'utf8');
const $ = cheerio.load(html);
let output = '';
$('a').each((i, el) => output += $(el).text().trim() + ' : ' + $(el).attr('href') + '\n');
fs.writeFileSync('links_utf8.txt', output, 'utf8');
