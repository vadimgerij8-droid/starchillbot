// ================== КОНФІГУРАЦІЯ ==================
const TOKEN = '8292583957:AAHT7xgEsohsRbCmbNg1PiMxvgrqXRCwUr8';
const BASE_URL = 'https://animeua.club';
const PROXY_URL = 'https://monoanime.animegran8.workers.dev';
const WEBHOOK_PATH = '/webhook';

// ================== ГЛОБАЛЬНИЙ СТАН (краще замінити на KV) ==================
const userStates = new Map(); // у продакшені використай KV: await KV.put/delete

// ================== ДОПОМІЖНІ ФУНКЦІЇ TELEGRAM API ==================
async function callTelegram(method, body) {
    const url = `https://api.telegram.org/bot${TOKEN}/${method}`;
    const init = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
    return fetch(url, init);
}

async function sendMessage(chat_id, text, reply_markup = null) {
    return callTelegram('sendMessage', {
        chat_id,
        text,
        parse_mode: 'HTML',
        reply_markup
    });
}

async function editMessageText(chat_id, message_id, text, reply_markup = null) {
    return callTelegram('editMessageText', {
        chat_id,
        message_id,
        text,
        parse_mode: 'HTML',
        reply_markup
    });
}

async function answerCallbackQuery(callback_query_id, text = '') {
    return callTelegram('answerCallbackQuery', {
        callback_query_id,
        text
    });
}

// ================== ПАРСИНГ САЙТУ ==================
async function fetchHTML(url, useProxy = true) {
    const target = useProxy ? `${PROXY_URL}?url=${encodeURIComponent(url)}` : url;
    const resp = await fetch(target);
    if (resp.ok) return resp.text();
    return null;
}

// Парсинг карток аніме з HTML
function parseCards(html) {
    // Використовуємо HTMLRewriter для Cloudflare, але для простоти застосуємо RegExp + DOMParser
    // Cloudflare Workers підтримують HTMLRewriter, але тут використаємо простий підхід
    const cards = [];
    // шукаємо блоки з постером
    const reBlock = /<div[^>]+class="[^"]*poster[^"]*"[^>]*>([\s\S]*?)<\/div>/gi;
    let match;
    while ((match = reBlock.exec(html)) !== null) {
        const block = match[1];
        // витягуємо посилання
        const aMatch = block.match(/<a[^>]+href="([^"]*\/anime\/[^"]*)"/i);
        const url = aMatch ? (aMatch[1].startsWith('http') ? aMatch[1] : BASE_URL + aMatch[1]) : '';
        // зображення
        const imgMatch = block.match(/<img[^>]+(?:data-src|src)="([^"]+)"/i);
        let img = imgMatch ? imgMatch[1] : '';
        if (img && !img.startsWith('http')) img = BASE_URL + img.replace(/^\/\//, 'https://');
        // заголовок
        const titleMatch = block.match(/(?:class="[^"]*poster__title[^"]*"[^>]*>([^<]+)|<h3[^>]*>([^<]+))/i);
        const title = titleMatch ? (titleMatch[1] || titleMatch[2]).trim() : 'Без назви';
        if (url) cards.push({ title, url, image: img });
    }
    // якщо не знайшли через клас poster, шукаємо всі посилання на аніме
    if (cards.length === 0) {
        const linkRe = /<a[^>]+href="([^"]*\/anime\/[^"]*)"[^>]*>/gi;
        const seen = new Set();
        while ((match = linkRe.exec(html)) !== null) {
            const href = match[1];
            if (!seen.has(href)) {
                seen.add(href);
                const full = href.startsWith('http') ? href : BASE_URL + href;
                const titleMatch = match[0].match(/>([^<]+)</);
                const title = titleMatch ? titleMatch[1].trim() : 'Без назви';
                cards.push({ title, url: full, image: '' });
            }
        }
    }
    return cards;
}

// Отримання головної сторінки
async function getMainPage(page = 1) {
    const html = await fetchHTML(`${BASE_URL}/page/${page}/`);
    return html ? parseCards(html) : [];
}

// Пошук
async function search(query, page = 1) {
    const url = `${BASE_URL}/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}&page=${page}`;
    const html = await fetchHTML(url);
    return html ? parseCards(html) : [];
}

// Рандомне аніме
async function getRandom() {
    const randUrl = `${BASE_URL}/index.php?do=rand`;
    const proxyUrl = `${PROXY_URL}?url=${encodeURIComponent(randUrl)}`;
    const resp = await fetch(proxyUrl, { redirect: 'follow' });
    const html = await resp.text();
    return parseAnimeDetails(html, randUrl);
}

// Витяг джерел з тексту (плеєр)
function extractSources(text, provider = 'Джерело') {
    const sources = [];
    // шукаємо JSON з плейлистом
    const jsonMatch = text.match(/file\s*:\s*(\[[\s\S]+?\]|'[\s\S]+?'|"[\s\S]+?"|\{[\s\S]+?\})/i) ||
                     text.match(/playlist\s*:\s*(\[[\s\S]+?\])/i);
    if (jsonMatch) {
        try {
            let raw = jsonMatch[1].trim();
            if ((raw.startsWith("'") && raw.endsWith("'")) || (raw.startsWith('"') && raw.endsWith('"'))) raw = raw.slice(1, -1);
            if (raw.startsWith('{') && raw.endsWith('}')) raw = `[${raw}]`;
            raw = raw.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');
            const data = JSON.parse(raw);

            const walk = (items, curDub = '', curSeason = '1') => {
                for (const item of items) {
                    if (item.folder || item.playlist) {
                        let nextDub = curDub;
                        let nextSeason = curSeason;
                        const folderTitle = item.title || '';
                        const seasonMatch = folderTitle.match(/[Сс]езон\s*(\d+)/);
                        if (seasonMatch) {
                            nextSeason = seasonMatch[1];
                            if (folderTitle.trim().toLowerCase() !== `сезон ${nextSeason}`.toLowerCase()) {
                                nextDub = folderTitle.replace(/[Сс]езон\s*\d+/, '').replace(/\//g, '').trim() || curDub;
                            }
                        } else if (folderTitle) {
                            nextDub = folderTitle;
                        }
                        walk(item.folder || item.playlist, nextDub, nextSeason);
                    } else if (item.file) {
                        let epTitle = item.title || 'Серія';
                        const epSeasonMatch = epTitle.match(/[Сс]езон\s*(\d+)/);
                        const finalSeason = epSeasonMatch ? epSeasonMatch[1] : curSeason;
                        const epNumMatch = epTitle.match(/(\d+)\s*[Сс]ері[яіяа]|[Сс]ері[яіяа]\s*(\d+)|[Ее]п\.?\s*(\d+)/);
                        const epNum = epNumMatch ? (epNumMatch[1] || epNumMatch[2] || epNumMatch[3]) : '1';
                        sources.push({
                            label: epTitle,
                            file: item.file,
                            dub: curDub || provider || 'UA',
                            season: finalSeason,
                            episode: epNum
                        });
                    }
                }
            };

            if (Array.isArray(data)) walk(data);
            else if (data.file) {
                sources.push({
                    label: data.title || 'Озвучка',
                    file: data.file,
                    dub: provider || 'UA',
                    season: '1',
                    episode: '1'
                });
            }
        } catch (e) { /* fail silently */ }
    }

    // якщо нічого не знайшли, шукаємо прямі .m3u8
    if (sources.length === 0) {
        const m3u8Urls = text.match(/https?:\/\/[^\s'"<> ]+\.m3u8[^\s'"<> ]*/gi) || [];
        m3u8Urls.forEach((url, idx) => {
            sources.push({
                label: `Потік ${idx + 1}`,
                file: url,
                dub: provider || 'UA',
                season: '1',
                episode: String(idx + 1)
            });
        });
    }
    return sources;
}

// Парсинг сторінки деталей аніме
function parseAnimeDetails(html, pageUrl) {
    const titleMatch = html.match(/<h1[^>]*>([^<]+)<\/h1>/) || html.match(/class="[^"]*title[^"]*"[^>]*>([^<]+)</i);
    const title = titleMatch ? titleMatch[1].trim() : 'Без назви';

    const posterMatch = html.match(/<img[^>]+(?:data-src|src)="([^"]+)"[^>]*>/i);
    let poster = posterMatch ? posterMatch[1] : '';
    if (poster && !poster.startsWith('http')) poster = BASE_URL + poster.replace(/^\/\//, 'https://');

    const genreMatches = [...html.matchAll(/class="[^"]*genres[^"]*"[^>]*>([\s\S]*?)<\/div>/gi)];
    let genres = [];
    if (genreMatches.length > 0) {
        const genreHtml = genreMatches[0][1];
        const genreLinks = [...genreHtml.matchAll(/<a[^>]+>([^<]+)<\/a>/gi)];
        genres = genreLinks.map(m => m[1].trim());
    }

    const yearMatch = html.match(/class="[^"]*year[^"]*"[^>]*>(\d{4})/i);
    const year = yearMatch ? yearMatch[1] : null;

    const descMatch = html.match(/class="[^"]*(?:full-text|description)[^"]*"[^>]*>([\s\S]*?)<\/div>/i);
    const synopsis = descMatch ? descMatch[1].replace(/<[^>]+>/g, '').trim() : '';

    // гравці
    const playerUrls = [];
    const iframeRe = /<iframe[^>]+(?:src|data-src)="([^"]+)"/gi;
    let iframeMatch;
    while ((iframeMatch = iframeRe.exec(html)) !== null) {
        let src = iframeMatch[1];
        if (src === 'about:blank') continue;
        if (src.startsWith('//')) src = 'https:' + src;
        playerUrls.push(src.startsWith('http') ? src : BASE_URL + src);
    }
    // посилання зі скриптів
    const scriptRe = /(?:playerUrl|iframeUrl|src)\s*[:=]\s*['"]([^'"]+)['"]/gi;
    while ((iframeMatch = scriptRe.exec(html)) !== null) {
        let url = iframeMatch[1];
        if (url.startsWith('//')) url = 'https:' + url;
        if (/ashdi|vidmoly|player/i.test(url)) playerUrls.push(url.startsWith('http') ? url : BASE_URL + url);
    }

    // унікальні гравці
    const uniquePlayers = [...new Set(playerUrls)];

    // Збираємо джерела асинхронно (оберемо обіцянки)
    const allSourcesPromise = Promise.all(uniquePlayers.map(async (pUrl) => {
        try {
            const provider = /ashdi/i.test(pUrl) ? 'Ashdi' : /vidmoly/i.test(pUrl) ? 'Vidmoly' : 'Player';
            const pHtml = await fetchHTML(pUrl);
            if (!pHtml) return [];
            let sources = extractSources(pHtml, provider);
            // перевіряємо вкладені iframe
            const nestedIframeRe = /<iframe[^>]+(?:src|data-src)="([^"]+)"/gi;
            let nestedMatch;
            while ((nestedMatch = nestedIframeRe.exec(pHtml)) !== null) {
                let nestedUrl = nestedMatch[1];
                if (nestedUrl === 'about:blank') continue;
                if (nestedUrl.startsWith('//')) nestedUrl = 'https:' + nestedUrl;
                const fullNested = nestedUrl.startsWith('http') ? nestedUrl : BASE_URL + nestedUrl;
                const nestedHtml = await fetchHTML(fullNested);
                if (nestedHtml) sources = sources.concat(extractSources(nestedHtml, provider));
            }
            return sources;
        } catch (e) {
            return [];
        }
    }));

    return { title, image: poster, genres, year, synopsis, playerSourcesPromise: allSourcesPromise, url: pageUrl };
}

// Обробка джерел після отримання
function processSources(sourcesArray) {
    const seasons = {};
    const seen = new Set();
    for (const src of sourcesArray.flat()) {
        const key = `${src.season}-${src.dub}-${src.episode}-${src.file}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (!seasons[src.season]) seasons[src.season] = {};
        if (!seasons[src.season][src.dub]) seasons[src.season][src.dub] = [];
        seasons[src.season][src.dub].push(src);
    }
    // сортуємо епізоди
    for (const s in seasons) {
        for (const d in seasons[s]) {
            seasons[s][d].sort((a, b) => parseInt(a.episode) - parseInt(b.episode));
        }
    }
    return seasons;
}

// ================== КЛАВІАТУРИ ==================
function mainKeyboard() {
    return {
        inline_keyboard: [
            [{ text: '🔥 Останні оновлення', callback_data: 'latest_1' }],
            [{ text: '🎲 Рандомне аніме', callback_data: 'random' }],
            [{ text: '🔍 Пошук', callback_data: 'search_prompt' }]
        ]
    };
}

function startKeyboard() {
    return mainKeyboard();
}

// ================== ОБРОБНИКИ ПОВІДОМЛЕНЬ ==================
async function onUpdate(update) {
    if (update.message) {
        const msg = update.message;
        const chatId = msg.chat.id;
        const text = msg.text || '';

        if (text.startsWith('/start')) {
            return sendMessage(chatId, 'Привіт! Я бот для перегляду аніме. 🎥\n\nВикористовуй кнопки нижче або просто напиши назву аніме для пошуку.', mainKeyboard());
        } else {
            // пошук
            const state = userStates.get(chatId) || {};
            state.currentSearchQuery = text;
            state.currentSearchPage = 1;
            userStates.set(chatId, state);
            await sendMessage(chatId, `Шукаю: ${text}...`);
            const results = await search(text);
            if (results.length === 0) {
                return sendMessage(chatId, 'Нічого не знайдено.');
            }
            state.currentSearchResults = results;
            userStates.set(chatId, state);
            return showResults(chatId, null, results, `Результати пошуку для "${text}":`, 1, 'search');
        }
    } else if (update.callback_query) {
        const query = update.callback_query;
        const chatId = query.message.chat.id;
        const data = query.data;
        await answerCallbackQuery(query.id);

        if (data === 'start') {
            return editMessageText(chatId, query.message.message_id, 'Оберіть дію:', mainKeyboard());
        } else if (data.startsWith('latest_')) {
            const page = parseInt(data.split('_')[1]);
            const results = await getMainPage(page);
            return showResults(chatId, query.message.message_id, results, `Останні оновлення (сторінка ${page}):`, page, 'latest');
        } else if (data.startsWith('search_page_')) {
            const page = parseInt(data.split('_')[2]);
            const state = userStates.get(chatId) || {};
            const queryText = state.currentSearchQuery;
            if (!queryText) return editMessageText(chatId, query.message.message_id, 'Спочатку виконайте пошук.');
            const results = await search(queryText, page);
            if (results.length === 0) return editMessageText(chatId, query.message.message_id, 'Більше нічого немає.');
            state.currentSearchResults = results;
            state.currentSearchPage = page;
            userStates.set(chatId, state);
            return showResults(chatId, query.message.message_id, results, `Результати пошуку для "${queryText}" (сторінка ${page}):`, page, 'search');
        } else if (data === 'random') {
            await editMessageText(chatId, query.message.message_id, 'Шукаю випадкове аніме...');
            const details = await getRandom();
            if (!details || !details.title) return editMessageText(chatId, query.message.message_id, 'Помилка завантаження.');
            return showDetails(chatId, query.message.message_id, details);
        } else if (data.startsWith('details_')) {
            const [_, prefix, page, idx] = data.split('_');
            const state = userStates.get(chatId);
            const results = state?.[`${prefix}_results_page_${page}`] || [];
            const anime = results[parseInt(idx)];
            if (!anime) return editMessageText(chatId, query.message.message_id, 'Аніме не знайдено.');
            await editMessageText(chatId, query.message.message_id, 'Завантажую деталі...');
            const html = await fetchHTML(anime.url);
            if (!html) return editMessageText(chatId, query.message.message_id, 'Помилка завантаження.');
            const details = parseAnimeDetails(html, anime.url);
            return showDetails(chatId, query.message.message_id, details);
        } else if (data.startsWith('season_')) {
            const parts = data.split('_');
            const detailKey = parts.slice(1).join('_'); // унікальний ключ
            const state = userStates.get(chatId);
            const details = state?.animeDetails?.[detailKey];
            if (!details) return editMessageText(chatId, query.message.message_id, 'Деталі втрачено.');
            const sNum = parts[1];
            return showDubs(chatId, query.message.message_id, details, sNum);
        } else if (data.startsWith('dub_')) {
            const [_, detailKey, sNum, dub] = data.split('_');
            const state = userStates.get(chatId);
            const details = state?.animeDetails?.[detailKey];
            if (!details) return;
            return showEpisodes(chatId, query.message.message_id, details, sNum, dub);
        } else if (data.startsWith('ep_')) {
            const [_, detailKey, sNum, dub, ep] = data.split('_');
            const state = userStates.get(chatId);
            const details = state?.animeDetails?.[detailKey];
            if (!details) return;
            const seasons = details.seasons;
            const episode = seasons?.[sNum]?.[dub]?.find(e => e.episode === ep);
            if (!episode) return answerCallbackQuery(query.id, 'Серію не знайдено');
            const proxyFile = `${PROXY_URL}?url=${encodeURIComponent(episode.file)}`;
            const text = `🎬 <b>${details.title}</b>\nСезон ${sNum}, серія ${ep}\nОзвучка: ${dub}\n\n▶️ <a href="${proxyFile}">Дивитись (HLS)</a>`;
            return editMessageText(chatId, query.message.message_id, text, {
                inline_keyboard: [[{ text: '⬅️ Назад до серій', callback_data: `dub_${detailKey}_${sNum}_${dub}` }]]
            });
        } else if (data === 'search_prompt') {
            return editMessageText(chatId, query.message.message_id, 'Просто напиши назву аніме в чат.', mainKeyboard());
        }
    }
}

// Функції показу результатів, деталей...
async function showResults(chatId, messageId, results, text, page, prefix) {
    const keyboard = [];
    results.forEach((anime, i) => {
        keyboard.push([{ text: anime.title, callback_data: `details_${prefix}_${page}_${i}` }]);
    });
    const nav = [];
    if (page > 1) nav.push({ text: '⬅️ Назад', callback_data: `${prefix}_page_${page - 1}` });
    if (results.length === 20) nav.push({ text: 'Вперед ➡️', callback_data: `${prefix}_page_${page + 1}` });
    if (nav.length) keyboard.push(nav);
    keyboard.push([{ text: '🏠 Головна', callback_data: 'start' }]);
    const markup = { inline_keyboard: keyboard };

    // збережемо результати
    const state = userStates.get(chatId) || {};
    state[`${prefix}_results_page_${page}`] = results;
    userStates.set(chatId, state);

    if (messageId) {
        return editMessageText(chatId, messageId, text, markup);
    } else {
        return sendMessage(chatId, text, markup);
    }
}

async function showDetails(chatId, messageId, details) {
    const sourcesArray = await details.playerSourcesPromise;
    const seasons = processSources(sourcesArray);
    const detailKey = Math.random().toString(36).substring(2, 10); // тимчасовий ключ
    const state = userStates.get(chatId) || {};
    if (!state.animeDetails) state.animeDetails = {};
    state.animeDetails[detailKey] = { title: details.title, seasons, url: details.url };
    userStates.set(chatId, state);

    let text = `<b>${details.title}</b>\n`;
    if (details.year) text += `📅 Рік: ${details.year}\n`;
    if (details.genres.length) text += `🏷 Жанри: ${details.genres.join(', ')}\n`;
    text += `\n📖 ${details.synopsis.substring(0, 500)}...`;

    const keyboard = [];
    for (const sNum of Object.keys(seasons).sort((a, b) => a - b)) {
        keyboard.push([{ text: `Сезон ${sNum}`, callback_data: `season_${detailKey}_${sNum}` }]);
    }
    keyboard.push([{ text: '🏠 Головна', callback_data: 'start' }]);

    if (details.image) {
        await callTelegram('sendPhoto', {
            chat_id: chatId,
            photo: details.image,
            caption: text,
            parse_mode: 'HTML',
            reply_markup: { inline_keyboard: keyboard }
        });
        // видаляємо попереднє повідомлення
        await callTelegram('deleteMessage', { chat_id: chatId, message_id: messageId }).catch(() => {});
    } else {
        return editMessageText(chatId, messageId, text, { inline_keyboard: keyboard });
    }
}

async function showDubs(chatId, messageId, details, sNum) {
    const dubs = Object.keys(details.seasons[sNum] || {}).sort();
    const keyboard = dubs.map(d => [{ text: `🎙 ${d}`, callback_data: `dub_${details._key}_${sNum}_${d}` }]);
    keyboard.push([{ text: '⬅️ Назад до опису', callback_data: `start` }]); // спрощено
    return editMessageText(chatId, messageId, `Оберіть озвучку для сезону ${sNum}:`, { inline_keyboard: keyboard });
}

async function showEpisodes(chatId, messageId, details, sNum, dub) {
    const episodes = details.seasons[sNum]?.[dub] || [];
    const keyboard = [];
    let row = [];
    episodes.forEach(ep => {
        row.push({ text: ep.episode, callback_data: `ep_${details._key}_${sNum}_${dub}_${ep.episode}` });
        if (row.length === 4) { keyboard.push(row); row = []; }
    });
    if (row.length) keyboard.push(row);
    keyboard.push([{ text: '⬅️ Назад до озвучок', callback_data: `season_${details._key}_${sNum}` }]);
    return editMessageText(chatId, messageId, `Оберіть серію (${dub}):`, { inline_keyboard: keyboard });
}

// ================== ОСНОВНИЙ ОБРОБНИК FETCH ==================
async function handleRequest(request) {
    const url = new URL(request.url);
    if (url.pathname === WEBHOOK_PATH) {
        if (request.method === 'POST') {
            const payload = await request.json();
            await onUpdate(payload);
            return new Response('OK', { status: 200 });
        }
        return new Response('Method not allowed', { status: 405 });
    } else if (url.pathname === '/setWebhook') {
        const webhookUrl = `${url.origin}${WEBHOOK_PATH}`;
        const result = await (await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook?url=${encodeURIComponent(webhookUrl)}`)).text();
        return new Response(result, { headers: { 'Content-Type': 'text/plain' } });
    }
    return new Response('Not found', { status: 404 });
}

addEventListener('fetch', event => {
    event.respondWith(handleRequest(event.request));
});
