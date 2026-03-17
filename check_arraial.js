const fs = require('fs');
const cheerio = require('cheerio');
const html = fs.readFileSync('test2.html', 'utf8');
const $ = cheerio.load(html);
$('.vendor-box').each((i, el) => {
    let title = $(el).find('.title').text().trim();
    if (title.toLowerCase().includes('arraial')) {
        console.log("Title:", title, "Modal URL:", $(el).attr('data-modal-url'));
    }
});
