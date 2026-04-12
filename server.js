const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const axios = require('axios');
const cheerio = require('cheerio');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

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

// 1. Criação Dinâmica da Diretoria de Uploads (Garantia de Existência)
const uploadDir = path.join(__dirname, 'public', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

// Configuração do multer para upload de imagens
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});
const upload = multer({ storage: storage });

// 3. Tratamento de Erros e Logs Visíveis nas Rotas API
app.get('/api/debug', (req, res) => res.json(config));
app.post('/api/goals', upload.single('image'), (req, res) => {
    try {
        const targetNumber = parseInt(req.body.goal, 10);
        if (isNaN(targetNumber) || targetNumber <= 0) {
            return res.status(400).json({ error: "Alvo inválido. Deve ser maior que 0." });
        }

        let imageUrl = null;
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }
        
        let defaultDrink = config.modoArraial ? 'arraial' : 'fino';
        const drinkType = req.body.drink || defaultDrink;

        // 2. Armazenamento em Memória (RAM) em vez de Ficheiro Local
        const newGoal = {
            id: Date.now().toString(),
            target: targetNumber,
            drink: drinkType,
            image: imageUrl,
            triggered: false
        };

        config.frankFileGoals.push(newGoal);
        config.frankFileGoals.sort((a, b) => a.target - b.target);
        
        io.emit('update', { config, metrics });
        scrapeData(); // verificação imediata

        res.status(200).json({ message: 'Meta adicionada com sucesso!', goal: newGoal });
    } catch (error) {
        console.error("Erro interno no processamento da meta e guardar imagem:", error);
        res.status(500).json({ error: "Erro interno no servidor a processar a meta/imagem." });
    }
});

// Editar Meta
app.put('/api/goals/:id', upload.single('image'), (req, res) => {
    try {
        const goalId = req.params.id;
        const targetNumber = parseInt(req.body.goal, 10);
        if (isNaN(targetNumber) || targetNumber <= 0) {
            return res.status(400).json({ error: "Alvo inválido. Deve ser maior que 0." });
        }

        const goalIndex = config.frankFileGoals.findIndex(g => g.id === goalId);
        if (goalIndex === -1) {
            return res.status(404).json({ error: "Meta não encontrada." });
        }

        let imageUrl = config.frankFileGoals[goalIndex].image; // Keep old image by default
        if (req.file) {
            imageUrl = `/uploads/${req.file.filename}`;
        }
        
        const drinkType = req.body.drink || 'fino';

        config.frankFileGoals[goalIndex].target = targetNumber;
        config.frankFileGoals[goalIndex].drink = drinkType;
        config.frankFileGoals[goalIndex].image = imageUrl;
        config.frankFileGoals[goalIndex].triggered = false; // Reset the trigger

        config.frankFileGoals.sort((a, b) => a.target - b.target);
        
        io.emit('update', { config, metrics });
        scrapeData(); // immediate check

        res.status(200).json({ message: 'Meta atualizada com sucesso!', goal: config.frankFileGoals[goalIndex] });
    } catch (error) {
        console.error("Erro interno ao atualizar meta e imagem:", error);
        res.status(500).json({ error: "Erro interno no servidor a atualizar a meta/imagem." });
    }
});

// Estado Global
let config = {
    url: 'https://services.3cket.com/staff/cashless-worzkone.php?start_date=09-04-2026+17%3A15&end_date=01-05-2026+22%3A37&search_staff=&search_workzone=9fd8ea4cd7dc4787985f419d2b2ddc12&search_product=&subPage=byProducts&view_mode=total&month_view=0',
    modoArraial: true,
    frankFileGoals: [] // { id, target, image, triggered }
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

        // Verificação da Meta Frank File Multi-Goal
        let triggeredAny = false;
        
        for (let i = 0; i < config.frankFileGoals.length; i++) {
            const goal = config.frankFileGoals[i];
            
            let goalValue = 0;
            if (goal.drink) {
                goalValue = metrics[goal.drink] || 0;
            } else {
                goalValue = config.modoArraial ? metrics.arraial : metrics.fino;
            }
            
            if (!goal.triggered && goalValue >= goal.target) {
                goal.triggered = true;
                triggeredAny = true;
                
                io.emit('alert', {
                    image: goal.image,
                    text: '',
                    duration: 30
                });
                console.log(`[FRANK FILE] Meta Atingida! (${goalValue} >= ${goal.target})`);
                break; // Trigger one per scrape loop max to avoid overlapping overlaps
            }
        }
        
        if(triggeredAny) {
            // Atualizar as novas propriedades triggered na lista para a TV
            io.emit('update', { config, metrics });
        }
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

    // Frank File Remover Meta
    socket.on('delete_frank_file_goal', (id) => {
        config.frankFileGoals = config.frankFileGoals.filter(g => g.id !== id);
        io.emit('update', { config, metrics });
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running at http://localhost:${PORT}`);
    console.log(`Admin Panel: http://localhost:${PORT}/admin`);
    console.log(`TV Dashboard: http://localhost:${PORT}/tv`);
});
