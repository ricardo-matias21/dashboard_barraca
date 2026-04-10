const axios = require('axios');
const cheerio = require('cheerio');

const url = 'https://services.3cket.com/staff/cashless-worzkone.php?start_date=09-04-2026+17%3A15&end_date=01-05-2026+22%3A37&search_staff=&search_workzone=9fd8ea4cd7dc4787985f419d2b2ddc12&search_product=&subPage=byProducts&view_mode=total&month_view=0';

const targetProducts = ['Fino', 'FIni Arraial', 'Bebida de Curso', 'Shot Nacional'];

async function run() {
    try {
        console.log('A fazer o download do HTML...');
        const { data, status } = await axios.get(url, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
            }
        });
        
        console.log(`Download concluido (Status: ${status}). A procurar os produtos a quantidade...`);
        const $ = cheerio.load(data);
        
        const results = {};
        
        // A página utiliza divs com a classe 'vendor-box' para cada item em vez de tables.
        $('.vendor-box').each((i, el) => {
            const title = $(el).find('.title').text().trim();
            
            // Verifica se o título atual está alinhado com um dos produtos que queremos
            let matchedProduct = targetProducts.find(p => title.toLowerCase() === p.toLowerCase());
            
            if (matchedProduct) {
                // Procura na linha extra a quantidade
                // Exemplo de HTML: <div class="extraline_nopadding"><b>Quantity</b>: 2 441</div>
                const extraLines = $(el).find('.extraline_nopadding');
                let quantityFound = 'S/N';
                
                extraLines.each((j, lineEl) => {
                    const lineText = $(lineEl).text();
                    if (lineText.includes('Quantity')) {
                        // Extrai a parte numérica: 'Quantity: 2 441' -> '2 441'
                        quantityFound = lineText.replace('Quantity:', '').trim();
                    }
                });
                
                results[matchedProduct] = quantityFound;
            }
        });

        console.log('\n--- RESULTADOS DA EXTRACAO ---\n');
        
        targetProducts.forEach(prod => {
            if (results[prod] !== undefined) {
                console.log(`[OK] Produto: "${prod}" | Quantidade vendida: ${results[prod]}`);
            } else {
                console.log(`[X]  Produto: "${prod}" nao encontrado na pagina.`);
            }
        });
        
        console.log('\n------------------------------');
        
    } catch (err) {
        console.error('\nErro ao fazer pedido HTTP:', err.message);
    }
}

run();
