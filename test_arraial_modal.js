const fs = require('fs');
const axios = require('axios');
const cheerio = require('cheerio');

async function test() {
    const html = fs.readFileSync('test2.html', 'utf8');
    const $ = cheerio.load(html);
    let mUrl = '';
    $('.vendor-box').each((i, el) => {
        let title = $(el).find('.title').text().trim();
        if (title.toLowerCase().includes('arraial')) {
            mUrl = $(el).attr('data-modal-url');
        }
    });
    
    if (!mUrl) {
        console.log('No Arraial modal URL found');
        return;
    }
    console.log('Fetching', mUrl);
    const { data: modalHTML } = await axios.get(mUrl, {
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
            'Accept': 'text/html'
        }
    });

    const m$ = cheerio.load(modalHTML);
    let qtys = [];
    m$('[id^=genderCollapse] p').each((idx, pEl) => {
        let txt = m$(pEl).text();
        if (txt.includes('Quantity:')) {
            qtys.push(parseInt(txt.replace('Quantity:', '').replace(/\s+/g,''), 10) || 0);
        }
    });
    console.log('Homem Arraial:', qtys[0], 'Mulher Arraial:', qtys[1]);
}
test();
