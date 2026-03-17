const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Rotas para as páginas HTML
app.get('/tv', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'tv.html'));
});

app.get('/admin', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

// Estado Global
let config = {
    url: 'https://services.3cket.com/staff/cashless.php?search_workzone=&search_staff=98b0df709d424bb3bb29714a744fe58e&subPage=byProducts&start_date=17-10-2024%2023:09&end_date=16-03-2026%2017:50&search_product=&month_view=0&view_mode=total',
    modoArraial: false
};

let metrics = {
    fino: 0,
    curso: 0,
    shots: 0,
    arraial: 0,
    sidra: 0,
    shots_homem: 0,
    shots_mulher: 0,
    arraial_homem: 0,
    arraial_mulher: 0
};

const targetProducts = ['Fino', 'Bebida de Curso', 'Shot Nacional', 'Shot Estrangeiro', 'FIni Arraial', 'Fino Arraial', 'Sidra'];

function parseQuantity(qStr) {
    if (!qStr) return 0;
    return parseInt(qStr.replace(/\s+/g, ''), 10) || 0;
}

// Lógica de Extração
async function scrapeData() {
    if (!config.url) return;
    try {
        const { data } = await axios.get(config.url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
            }
        });
        
        const $ = cheerio.load(data);
        const tempResults = {};
        let modalUrls = [];
        
        $('.vendor-box').each((i, el) => {
            const title = $(el).find('.title').text().trim().toLowerCase();
            const matchedProduct = targetProducts.find(p => p.toLowerCase() === title);
            
            if (matchedProduct) {
                let qtyStr = '0';
                $(el).find('.extraline_nopadding').each((j, lineEl) => {
                    const lineText = $(lineEl).text();
                    if (lineText.includes('Quantity')) {
                        qtyStr = lineText.replace('Quantity:', '').trim();
                    }
                });
                tempResults[matchedProduct] = parseQuantity(qtyStr);

                if (matchedProduct === 'Shot Nacional' || matchedProduct === 'Shot Estrangeiro') {
                    const mUrl = $(el).attr('data-modal-url');
                    if (mUrl) modalUrls.push({ type: 'shots', url: mUrl });
                }

                if (matchedProduct === 'FIni Arraial' || matchedProduct === 'Fino Arraial') {
                    const mUrl = $(el).attr('data-modal-url');
                    if (mUrl) modalUrls.push({ type: 'arraial', url: mUrl });
                }
            }
        });

        // Procurar infos nos modals (género)
        let totalHomem = 0;
        let totalMulher = 0;
        let totalArraialHomem = 0;
        let totalArraialMulher = 0;

        for (const item of modalUrls) {
            try {
                const { data: modalHTML } = await axios.get(item.url, {
                    headers: {
                        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
                    }
                });
                const m$ = cheerio.load(modalHTML);
                let qtys = [];
                m$('[id^=genderCollapse] p').each((idx, pEl) => {
                    let txt = m$(pEl).text();
                    if (txt.includes('Quantity:')) {
                        qtys.push(parseQuantity(txt.replace('Quantity:', '')));
                    }
                });
                
                if (item.type === 'shots') {
                    totalHomem += (qtys[0] || 0);
                    totalMulher += (qtys[1] || 0);
                } else if (item.type === 'arraial') {
                    totalArraialHomem += (qtys[0] || 0);
                    totalArraialMulher += (qtys[1] || 0);
                }
            } catch(e) {}
        }

        const sNac = tempResults['Shot Nacional'] || 0;
        const sEst = tempResults['Shot Estrangeiro'] || 0;

        metrics = {
            fino: tempResults['Fino'] || 0,
            curso: tempResults['Bebida de Curso'] || 0,
            shots: sNac + sEst,
            arraial: (tempResults['FIni Arraial'] || 0) + (tempResults['Fino Arraial'] || 0),
            sidra: tempResults['Sidra'] || 0,
            shots_homem: totalHomem,
            shots_mulher: totalMulher,
            arraial_homem: totalArraialHomem,
            arraial_mulher: totalArraialMulher
        };

        // Enviar os dados atualizados para todas as TVs / Admins ligados
        io.emit('update', { config, metrics });
        console.log(`[Scrape OK] Fino: ${metrics.fino} | Shots(H:${totalHomem} F:${totalMulher}) | Arraial(H:${totalArraialHomem} F:${totalArraialMulher}) | Sidra: ${metrics.sidra}`);
    } catch (err) {
        console.error('Erro ao fazer scraping:', err.message);
    }
}

// Rodar a cada 20 segundos
setInterval(scrapeData, 20000);
setTimeout(scrapeData, 1000);

// WebSockets
io.on('connection', (socket) => {
    // Quando liga, envia as métricas atuais para carregar logo
    socket.emit('update', { config, metrics });

    // Atualização vinda do admin
    socket.on('update_config', (newConfig) => {
        config = { ...config, ...newConfig };
        io.emit('update', { config, metrics });
        scrapeData(); // força atualização imediata no novo URL
    });

    // Alerta Flash do admin
    socket.on('trigger_alert', (alertData) => {
        io.emit('alert', alertData);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`TV Dashboard: http://localhost:${PORT}/tv`);
});
