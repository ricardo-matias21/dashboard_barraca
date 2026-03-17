const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');

const url = 'https://services.3cket.com/staff/cashless.php?search_workzone=&search_staff=98b0df709d424bb3bb29714a744fe58e&subPage=byProducts&start_date=17-10-2024%2023:09&end_date=16-03-2026%2017:50&search_product=&month_view=0&view_mode=total';

async function go() {
    const { data } = await axios.get(url, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        }
    });
    fs.writeFileSync('test3.html', data, 'utf8');
    
    const $ = cheerio.load(data);
    $('.vendor-box').each((i, el) => {
        const title = $(el).find('.title').text().trim().toLowerCase();
        if (title === 'shot nacional' || title === 'shot estrangeiro') {
            fs.appendFileSync('inspect.txt', '--- ' + title + ' ---\n' + $(el).html() + '\n\n', 'utf8');
        }
    });
    console.log("Done");
}
go();
