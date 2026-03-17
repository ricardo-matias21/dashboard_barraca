const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test2.html', 'utf8');
const $ = cheerio.load(html);
let out = '';
$('select option').each((i, el) => out += $(el).parent().attr('name') + ' -> ' + $(el).attr('value') + ' : ' + $(el).text() + '\n');
$('input[type=radio], input[type=checkbox]').each((i, el) => out += $(el).attr('name') + ' -> ' + $(el).attr('value') + '\n');
fs.writeFileSync('inputs.txt', out, 'utf8');
