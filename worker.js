const TOKEN = '8292583957:AAHT7xgEsohsRbCmbNg1PiMxvgrqXRCwUr8';
const PROXY_URL = 'https://monoanime.animegran8.workers.dev';
const BASE_URL = 'https://animeua.club';
const API = `https://api.telegram.org/bot${TOKEN}`;

// In-memory стан (скидається при рестарті воркера)
const userStates = new Map();

addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request));
});

async function handleRequest(request) {
  if (request.method === 'POST') {
    const update = await request.json();
    await processUpdate(update);
    return new Response('OK', { status: 200 });
  }
  if (request.method === 'GET') {
    const url = new URL(request.url);
    if (url.pathname === '/set_webhook') {
      const webhookUrl = url.searchParams.get('url');
      const res = await fetch(`${API}/setWebhook?url=${encodeURIComponent(webhookUrl)}`);
      const data = await res.json();
      return new Response(JSON.stringify(data), { status: 200 });
    }
    return new Response('Anime Bot is running!', { status: 200 });
  }
  return new Response('Method Not Allowed', { status: 405 });
}

// =================== Telegram API helpers ===================

async function tg(method, params) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  return res.json();
}

async function sendMessage(chatId, text, extra = {}) {
  return tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra });
}

async function editMessage(chatId, messageId, text, extra = {}) {
  return tg('editMessageText', { chat_id: chatId, message_id: messageId, text, parse_mode: 'HTML', ...extra });
}

async function sendPhoto(chatId, photo, caption, extra = {}) {
  return tg('sendPhoto', { chat_id: chatId, photo, caption, parse_mode: 'HTML', ...extra });
}

async function answerCallback(callbackQueryId, text = '') {
  return tg('answerCallbackQuery', { callback_query_id: callbackQueryId, text });
}

async function deleteMessage(chatId, messageId) {
  return tg('deleteMessage', { chat_id: chatId, message_id: messageId });
}

// =================== Update router ===================

async function processUpdate(update) {
  if (update.message) {
    await handleMessage(update.message);
  } else if (update.callback_query) {
    await handleCallbackQuery(update.callback_query);
  }
}

async function handleMessage(msg) {
  const chatId = msg.chat.id;
  const text = msg.text || '';

  if (text === '/start') {
    await sendMessage(chatId,
      'Привіт! Я бот для перегляду аніме. 🎥\n\nВикористовуй кнопки нижче або просто напиши назву аніме для пошуку.',
      { reply_markup: mainKeyboard() }
    );
    return;
  }

  // Пошук
  const state = userStates.get(chatId) || {};
  state.currentSearchQuery = text;
  state.currentSearchPage = 1;
  userStates.set(chatId, state);

  await sendMessage(chatId, `Шукаю: ${text}...`);
  const results = await searchAnime(text, 1);

  if (!results.length) {
    await sendMessage(chatId, 'Нічого не знайдено. Спробуйте іншу назву.');
    return;
  }

  state.search_results_page_1 = results;
  userStates.set(chatId, state);

  await sendMessage(chatId,
    `Результати пошуку для '${text}':`,
    { reply_markup: resultsKeyboard(results, 1, 'search') }
  );
}

async function handleCallbackQuery(cbq) {
  const chatId = cbq.message.chat.id;
  const msgId = cbq.message.message_id;
  const data = cbq.data;
  await answerCallback(cbq.id);

  const state = userStates.get(chatId) || {};

  if (data === 'start') {
    await editMessage(chatId, msgId, 'Оберіть дію:', { reply_markup: mainKeyboard() });

  } else if (data.startsWith('latest_')) {
    const page = parseInt(data.split('_')[1]);
    const results = await getMainPage(page);
    state[`latest_results_page_${page}`] = results;
    userStates.set(chatId, state);
    await editMessage(chatId, msgId,
      `Останні оновлення (Сторінка ${page}):`,
      { reply_markup: resultsKeyboard(results, page, 'latest') }
    );

  } else if (data.startsWith('search_') && data.split('_').length === 2) {
    const page = parseInt(data.split('_')[1]);
    const query = state.currentSearchQuery;
    if (!query) {
      await editMessage(chatId, msgId, 'Спочатку виконайте пошук.', { reply_markup: mainKeyboard() });
      return;
    }
    const results = await searchAnime(query, page);
    if (!results.length) {
      await editMessage(chatId, msgId, 'Більше результатів не знайдено.');
      return;
    }
    state[`search_results_page_${page}`] = results;
    userStates.set(chatId, state);
    await editMessage(chatId, msgId,
      `Результати пошуку для '${query}' (Сторінка ${page}):`,
      { reply_markup: resultsKeyboard(results, page, 'search') }
    );

  } else if (data === 'random') {
    await editMessage(chatId, msgId, 'Шукаю випадкове аніме...');
    const details = await getRandom();
    if (details) {
      await showDetails(chatId, msgId, details, state);
    } else {
      await editMessage(chatId, msgId, 'Не вдалося знайти аніме. Спробуйте ще раз.');
    }

  } else if (data.startsWith('details_')) {
    // details_prefix_page_index
    const parts = data.split('_');
    const prefix = parts[1];
    const page = parseInt(parts[2]);
    const index = parseInt(parts[3]);
    const animeList = state[`${prefix}_results_page_${page}`] || [];
    const animeUrl = animeList[index]?.url;
    if (!animeUrl) {
      await editMessage(chatId, msgId, 'Помилка: Аніме не знайдено.');
      return;
    }
    await editMessage(chatId, msgId, 'Завантажую деталі...');
    const details = await getAnimeDetails(animeUrl);
    if (details) {
      await showDetails(chatId, msgId, details, state);
    } else {
      await editMessage(chatId, msgId, 'Не вдалося завантажити деталі аніме.');
    }

  } else if (data.startsWith('season_')) {
    const parts = data.split('_');
    const hash = parts[1];
    const sNum = parts[2];
    const details = state[`anime_details_${hash}`];
    if (!details) { await editMessage(chatId, msgId, 'Помилка: Деталі не знайдено.'); return; }
    await showDubs(chatId, msgId, details, hash, sNum);

  } else if (data.startsWith('dub_')) {
    const parts = data.split('_');
    const hash = parts[1];
    const sNum = parts[2];
    const dubName = parts.slice(3).join('_');
    const details = state[`anime_details_${hash}`];
    if (!details) { await editMessage(chatId, msgId, 'Помилка: Деталі не знайдено.'); return; }
    await showEpisodes(chatId, msgId, details, hash, sNum, dubName);

  } else if (data.startsWith('ep_')) {
    const parts = data.split('_');
    const hash = parts[1];
    const sNum = parts[2];
    const dubName = parts[3];
    const epNum = parts[4];
    const details = state[`anime_details_${hash}`];
    if (!details) { await editMessage(chatId, msgId, 'Помилка: Деталі не знайдено.'); return; }
    await showPlayer(chatId, msgId, details, hash, sNum, dubName, epNum);

  } else if (data === 'search_prompt') {
    await editMessage(chatId, msgId, 'Просто напишіть назву аніме в чат для пошуку. 🔍');
  }

  userStates.set(chatId, state);
}

// =================== UI helpers ===================

function mainKeyboard() {
  return {
    inline_keyboard: [
      [{ text: '🔥 Останні оновлення', callback_data: 'latest_1' }],
      [{ text: '🎲 Рандомне аніме', callback_data: 'random' }],
      [{ text: '🔍 Пошук', callback_data: 'search_prompt' }],
    ]
  };
}

function resultsKeyboard(results, page, prefix) {
  const keyboard = results.map((anime, i) => ([
    { text: anime.title, callback_data: `details_${prefix}_${page}_${i}` }
  ]));
  const nav = [];
  if (page > 1) nav.push({ text: '⬅️ Назад', callback_data: `${prefix}_${page - 1}` });
  if (results.length >= 20) nav.push({ text: 'Вперед ➡️', callback_data: `${prefix}_${page + 1}` });
  if (nav.length) keyboard.push(nav);
  keyboard.push([{ text: '🏠 Головна', callback_data: 'start' }]);
  return { inline_keyboard: keyboard };
}

// =================== Show sections ===================

async function showDetails(chatId, msgId, details, state) {
  const hash = simpleHash(details.url);
  state[`anime_details_${hash}`] = details;

  let text = `<b>${details.title}</b>\n`;
  if (details.year) text += `📅 Рік: ${details.year}\n`;
  if (details.genres?.length) text += `🏷 Жанри: ${details.genres.join(', ')}\n`;
  if (details.synopsis) text += `\n📖 Опис: ${details.synopsis.slice(0, 500)}...`;

  const seasons = Object.keys(details.seasons).sort((a, b) =>
    (isNaN(a) || isNaN(b)) ? a.localeCompare(b) : parseInt(a) - parseInt(b)
  );
  const keyboard = seasons.map(s => ([
    { text: `Сезон ${s}`, callback_data: `season_${hash}_${s}` }
  ]));
  keyboard.push([{ text: '🏠 Головна', callback_data: 'start' }]);
  const markup = { inline_keyboard: keyboard };

  if (details.image) {
    await deleteMessage(chatId, msgId);
    await sendPhoto(chatId, details.image, text, { reply_markup: markup });
  } else {
    await editMessage(chatId, msgId, text, { reply_markup: markup });
  }
}

async function showDubs(chatId, msgId, details, hash, sNum) {
  const dubs = Object.keys(details.seasons[sNum] || {}).sort();
  const keyboard = dubs.map(d => ([
    { text: `🎙 ${d}`, callback_data: `dub_${hash}_${sNum}_${d}` }
  ]));
  keyboard.push([{ text: '⬅️ Назад до опису', callback_data: `start` }]);
  await editMessage(chatId, msgId, `Оберіть озвучку для ${sNum} сезону:`, { reply_markup: { inline_keyboard: keyboard } });
}

async function showEpisodes(chatId, msgId, details, hash, sNum, dubName) {
  const episodes = details.seasons[sNum]?.[dubName] || [];
  const keyboard = [];
  let row = [];
  for (const ep of episodes) {
    row.push({ text: ep.episode, callback_data: `ep_${hash}_${sNum}_${dubName}_${ep.episode}` });
    if (row.length === 4) { keyboard.push(row); row = []; }
  }
  if (row.length) keyboard.push(row);
  keyboard.push([{ text: '⬅️ Назад до озвучок', callback_data: `season_${hash}_${sNum}` }]);
  await editMessage(chatId, msgId, `Оберіть серію (${dubName}):`, { reply_markup: { inline_keyboard: keyboard } });
}

async function showPlayer(chatId, msgId, details, hash, sNum, dubName, epNum) {
  const episodes = details.seasons[sNum]?.[dubName] || [];
  const episode = episodes.find(e => e.episode === epNum);
  if (!episode) { await tg('answerCallbackQuery', { callback_query_id: '', text: 'Серію не знайдено' }); return; }

  const proxyUrl = `${PROXY_URL}?url=${encodeURIComponent(episode.file)}`;
  let text = `🎬 <b>${details.title}</b>\nСезон ${sNum}, Серія ${epNum}\nОзвучка: ${dubName}\n\n`;
  text += 'Перегляньте відео за посиланням нижче. Рекомендується VLC або інший плеєр з підтримкою HLS (.m3u8).';

  const keyboard = {
    inline_keyboard: [
      [{ text: '▶️ Дивитись (HLS Link)', url: proxyUrl }],
      [{ text: '⬅️ Назад до серій', callback_data: `dub_${hash}_${sNum}_${dubName}` }],
    ]
  };
  await editMessage(chatId, msgId, text, { reply_markup: keyboard });
}

// =================== Scraper (JS port) ===================

async function proxyFetch(url) {
  const target = `${PROXY_URL}?url=${encodeURIComponent(url)}`;
  const res = await fetch(target, {
    headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' }
  });
  if (res.ok) return res.text();
  return null;
}

function parseCards(html) {
  const cards = [];
  // Match poster blocks
  const posterRegex = /<[^>]+class="[^"]*poster[^"]*"[^>]*>([\s\S]*?)<\/(?:div|a)>/gi;
  const linkRegex = /href="([^"]*\/anime\/[^"]*)"/i;
  const imgRegex = /(?:data-src|src)="(https?:\/\/[^"]+\.(?:jpg|jpeg|png|webp)[^"]*)"/i;
  const titleRegex = /class="[^"]*poster__title[^"]*"[^>]*>([^<]+)</i;

  // Simpler approach: find all anime links
  const allLinks = [...html.matchAll(/href="(https?:\/\/animeua\.club\/[^"]+\/)"[^>]*>[\s\S]*?(?:class="[^"]*poster__title[^"]*"[^>]*>([^<]+)<|<img[^>]+(?:data-src|src)="([^"]+)")/gi)];

  // Even simpler: regex scan for cards
  const cardMatches = [...html.matchAll(/class="poster[^"]*"[\s\S]*?href="([^"]*)"[\s\S]*?(?:data-src|src)="([^"]*)"[\s\S]*?class="poster__title[^"]*"[^>]*>([^<]*)/gi)];
  for (const m of cardMatches) {
    let url = m[1];
    if (!url.startsWith('http')) url = BASE_URL + url;
    cards.push({ url, image: m[2] || '', title: m[3].trim() || 'Без назви' });
  }

  if (!cards.length) {
    // Fallback: find links with /anime/
    const linkMatches = [...html.matchAll(/href="(\/[^"]*\/[^"]+\/)"[^>]*>([\s\S]*?)<\/a>/gi)];
    const seen = new Set();
    for (const m of linkMatches) {
      if (seen.has(m[1])) continue;
      seen.add(m[1]);
      const titleMatch = m[2].match(/<[^>]*>([^<]{3,})<\/[^>]*>/);
      cards.push({
        url: BASE_URL + m[1],
        image: '',
        title: titleMatch ? titleMatch[1].trim() : m[1]
      });
    }
  }
  return cards;
}

async function getMainPage(page = 1) {
  const html = await proxyFetch(`${BASE_URL}/page/${page}/`);
  return html ? parseCards(html) : [];
}

async function searchAnime(query, page = 1) {
  const html = await proxyFetch(`${BASE_URL}/index.php?do=search&subaction=search&story=${encodeURIComponent(query)}&page=${page}`);
  return html ? parseCards(html) : [];
}

async function getRandom() {
  const url = `${BASE_URL}/index.php?do=rand`;
  const res = await fetch(`${PROXY_URL}?url=${encodeURIComponent(url)}`, {
    headers: { 'User-Agent': 'Mozilla/5.0' },
    redirect: 'follow'
  });
  if (!res.ok) return null;
  const html = await res.text();
  return parseDetailsFromHtml(html, res.url || url);
}

async function getAnimeDetails(url) {
  const html = await proxyFetch(url);
  if (!html) return null;
  return parseDetailsFromHtml(html, url);
}

function extractText(html, selector) {
  // Mini CSS selector: supports tag, .class, tag.class
  const patterns = {
    'h1': /<h1[^>]*>([^<]+)<\/h1>/i,
    '.pmovie__title': /class="[^"]*pmovie__title[^"]*"[^>]*>([^<]+)</i,
    '.poster__title': /class="[^"]*poster__title[^"]*"[^>]*>([^<]+)</i,
    '.full-text': /class="[^"]*full-text[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    '.pmovie__description': /class="[^"]*pmovie__description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  };
  for (const [key, regex] of Object.entries(patterns)) {
    if (selector.includes(key.replace('.', ''))) {
      const m = html.match(regex);
      if (m) return m[1].replace(/<[^>]+>/g, '').trim();
    }
  }
  return '';
}

function extractSources(text, provider = 'UA') {
  const sources = [];
  const jsonMatch = text.match(/file\s*:\s*(\[[\s\S]+?\])/i) ||
                    text.match(/playlist\s*:\s*(\[[\s\S]+?\])/i);

  if (jsonMatch) {
    try {
      let raw = jsonMatch[1];
      raw = raw.replace(/,\s*\]/g, ']').replace(/,\s*\}/g, '}');
      const data = JSON.parse(raw);

      function walk(items, dub = '', season = '1') {
        for (const item of items) {
          if (item.folder || item.playlist) {
            let nextDub = dub, nextSeason = season;
            const ft = item.title || '';
            const sm = ft.match(/[Сс]езон\s*(\d+)/);
            if (sm) { nextSeason = sm[1]; nextDub = ft.replace(/[Сс]езон\s*\d+/, '').replace('/', '').trim() || dub; }
            else if (ft) nextDub = ft;
            walk(item.folder || item.playlist, nextDub, nextSeason);
          } else if (item.file) {
            const epTitle = item.title || 'Серія';
            const finalDub = dub || provider || 'UA';
            const eSm = epTitle.match(/[Сс]езон\s*(\d+)/);
            const finalSeason = eSm ? eSm[1] : season;
            const enm = epTitle.match(/(\d+)\s*[Сс]ері[яіяа]|[Сс]ері[яіяа]\s*(\d+)|[Ее]п\.?\s*(\d+)/);
            const epNum = enm ? (enm[1] || enm[2] || enm[3]) : '1';
            sources.push({ label: epTitle, file: item.file, dub: finalDub.trim(), season: finalSeason, episode: epNum });
          }
        }
      }
      if (Array.isArray(data)) walk(data);
      else if (data.file) sources.push({ label: data.title || 'Озвучка', file: data.file, dub: provider, season: '1', episode: '1' });
    } catch (e) { /* silent */ }
  }

  if (!sources.length) {
    const m3u8Matches = [...text.matchAll(/https?:\/\/[^\s'"<> ]+\.m3u8[^\s'"<> ]*/gi)];
    const seen = new Set();
    let idx = 1;
    for (const m of m3u8Matches) {
      if (!seen.has(m[0])) {
        seen.add(m[0]);
        sources.push({ label: `Потік ${idx}`, file: m[0], dub: provider, season: '1', episode: String(idx++) });
      }
    }
  }
  return sources;
}

async function parseDetailsFromHtml(html, url) {
  // Title
  let title = 'Без назви';
  for (const r of [
    /class="[^"]*pmovie__title[^"]*"[^>]*>([^<]+)</i,
    /<h1[^>]*>([^<]+)<\/h1>/i,
  ]) {
    const m = html.match(r);
    if (m) { title = m[1].trim(); break; }
  }

  // Poster
  let poster = '';
  const posterM = html.match(/class="[^"]*(?:pmovie__poster|anime__poster|img-fit-cover)[^"]*"[\s\S]*?<img[^>]+(?:data-src|src)="([^"]+)"/i);
  if (posterM) poster = posterM[1].startsWith('http') ? posterM[1] : BASE_URL + posterM[1];

  // Genres
  const genres = [...html.matchAll(/class="[^"]*(?:pmovie__genres|genres)[^"]*"[\s\S]*?<a[^>]*>([^<]+)<\/a>/gi)].map(m => m[1].trim());

  // Year
  let year = null;
  const yearM = html.match(/class="[^"]*(?:pmovie__year|release-year)[^"]*"[^>]*>[\s\S]*?(\d{4})/i);
  if (yearM) year = yearM[1];

  // Synopsis
  let synopsis = '';
  for (const r of [
    /class="[^"]*full-text[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /class="[^"]*pmovie__description[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
  ]) {
    const m = html.match(r);
    if (m) { synopsis = m[1].replace(/<[^>]+>/g, '').trim(); break; }
  }

  // Player iframes
  const iframes = [...html.matchAll(/(?:src|data-src)="((?:https?:)?\/\/[^"]+(?:ashdi|vidmoly|player)[^"]*)"/gi)].map(m => {
    let s = m[1];
    if (s.startsWith('//')) s = 'https:' + s;
    return s;
  });

  // Script playerUrl
  const scriptMatches = [...html.matchAll(/(?:playerUrl|iframeUrl|src)\s*[:=]\s*['"]([^'"]+)['"]/gi)].map(m => {
    let s = m[1];
    if (s.startsWith('//')) s = 'https:' + s;
    return s;
  }).filter(s => ['ashdi.vip', 'vidmoly', 'player'].some(x => s.includes(x)));

  const playerUrls = [...new Set([...iframes, ...scriptMatches])];

  let allSources = [];
  for (const pUrl of playerUrls) {
    try {
      const provider = pUrl.includes('ashdi') ? 'Ashdi' : pUrl.includes('vidmoly') ? 'Vidmoly' : 'Player';
      const pHtml = await proxyFetch(pUrl);
      if (pHtml) {
        allSources.push(...extractSources(pHtml, provider));
        // nested iframes
        const nested = [...pHtml.matchAll(/(?:src|data-src)="((?:https?:)?\/\/[^"]+)"/gi)];
        for (const n of nested) {
          let nUrl = n[1];
          if (nUrl.startsWith('//')) nUrl = 'https:' + nUrl;
          if (nUrl === 'about:blank') continue;
          const nHtml = await proxyFetch(nUrl);
          if (nHtml) allSources.push(...extractSources(nHtml, provider));
        }
      }
    } catch (e) { /* silent */ }
  }

  // Deduplicate & organise seasons
  const seasons = {};
  const seen = new Set();
  for (const s of allSources) {
    const key = `${s.season}-${s.dub}-${s.episode}-${s.file}`;
    if (seen.has(key)) continue;
    seen.add(key);
    if (!seasons[s.season]) seasons[s.season] = {};
    if (!seasons[s.season][s.dub]) seasons[s.season][s.dub] = [];
    seasons[s.season][s.dub].push(s);
  }
  for (const sn of Object.values(seasons)) {
    for (const dub of Object.values(sn)) {
      dub.sort((a, b) => (parseInt(a.episode) || 0) - (parseInt(b.episode) || 0));
    }
  }

  return { title, image: poster, genres, year, synopsis, seasons, url };
}

// =================== Utils ===================

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return Math.abs(h).toString(36);
}
