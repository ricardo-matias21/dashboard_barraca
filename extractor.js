const fs = require('fs');
const cheerio = require('cheerio');

const html = fs.readFileSync('test.html', 'utf8');
const $ = cheerio.load(html);

const targetProducts = ['Fino', 'FIni Arraial', 'Bebida de Curso', 'Shot Nacional'];
const results = {};

$('.vendor-box').each((i, el) => {
    const title = $(el).find('.title').text().trim();
    
    let matchedProduct = targetProducts.find(p => title.toLowerCase() === p.toLowerCase());
    if (matchedProduct) {
        let qty = 'N/A';
        $(el).find('.extraline_nopadding').each((j, line) => {
            if ($(line).text().includes('Quantity')) {
                qty = $(line).text().replace('Quantity', '').replace(':', '').trim();
            }
        });
        results[matchedProduct] = qty;
    }
});

fs.writeFileSync('final.txt', JSON.stringify(results, null, 2), 'utf8');
console.log('Feito!');
