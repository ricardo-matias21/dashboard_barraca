const fs = require('fs');
const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync('test2.html', 'utf8'));

$('.vendor-box').each((i, el) => {
    let title = $(el).find('.title').text().trim();
    if (title.includes('Shot')) {
        console.log('--- ' + title + ' ---');
        console.log('tagName:', $(el).prop('tagName'));
        let parent = $(el).parent();
        while (parent && parent.prop('tagName')) {
            if (parent.attr('onclick') || parent.attr('href')) {
                console.log('Parent link/action:', parent.prop('tagName'), parent.attr('href'), parent.attr('onclick'));
            }
            parent = parent.parent();
        }
    }
});
