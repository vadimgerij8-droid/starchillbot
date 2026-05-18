addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})
import logging
import asyncio
import re
import json
import aiohttp
from bs4 import BeautifulSoup
from urllib.parse import quote, urljoin
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ApplicationBuilder, CommandHandler, MessageHandler, CallbackQueryHandler, filters, ContextTypes

# Налаштування логування
logging.basicConfig(format="%(asctime)s - %(name)s - %(levelname)s - %(message)s", level=logging.INFO)
logger = logging.getLogger(__name__)

TOKEN = '8292583957:AAHT7xgEsohsRbCmbNg1PiMxvgrqXRCwUr8'

# ================== AnimeScraper ==================
class AnimeScraper:
    BASE_URL = "https://animeua.club"
    PROXY_URL = "https://monoanime.animegran8.workers.dev"

    def __init__(self):
        self.session = None

    async def _get_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(headers={
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
            })
        return self.session

    async def fetch_html(self, url, use_proxy=True):
        session = await self._get_session()
        target_url = f"{self.PROXY_URL}?url={quote(url)}" if use_proxy else url
        async with session.get(target_url) as response:
            if response.status == 200:
                return await response.text()
            return None

    def parse_cards(self, html):
        soup = BeautifulSoup(html, 'html.parser')
        cards = []
        poster_elements = soup.select('.poster')
        if not poster_elements:
            links = soup.select('a[href*="/anime/"]')
            unique_links = {}
            for a in links:
                href = a.get('href')
                if href and href not in unique_links:
                    unique_links[href] = a
            poster_elements = list(unique_links.values())
        for el in poster_elements:
            link_el = el if el.name == 'a' else el.select_one('a')
            href = link_el.get('href') if link_el else ""
            if not href:
                continue
            full_url = urljoin(self.BASE_URL, href)
            img = el.select_one('img')
            img_src = ""
            if img:
                img_src = img.get('data-src') or img.get('src') or ""
                if img_src and not img_src.startswith('http'):
                    img_src = urljoin(self.BASE_URL, img_src)
            title_el = el.select_one('.poster__title') or el.select_one('h3')
            title = title_el.get_text(strip=True) if title_el else "Без назви"
            cards.append({
                "title": title,
                "url": full_url,
                "image": img_src
            })
        return cards

    async def get_main_page(self, page=1):
        url = f"{self.BASE_URL}/page/{page}/"
        html = await self.fetch_html(url)
        return self.parse_cards(html) if html else []

    async def search(self, query, page=1):
        url = f"{self.BASE_URL}/index.php?do=search&subaction=search&story={quote(query)}&page={page}"
        html = await self.fetch_html(url)
        return self.parse_cards(html) if html else []

    async def get_random(self):
        url = f"{self.BASE_URL}/index.php?do=rand"
        session = await self._get_session()
        proxy_url = f"{self.PROXY_URL}?url={quote(url)}"
        async with session.get(proxy_url, allow_redirects=True) as response:
            html = await response.text()
            return await self.get_details_from_html(html, url)

    def extract_sources(self, text, provider="Джерело"):
        sources = []
        json_match = re.search(r'file\s*:\s*(\[[\s\S]+?\]|\'[\s\S]+?\'|\"[\s\S]+?\"|\{[\s\S]+?\})', text, re.I) or \
                     re.search(r'playlist\s*:\s*(\[[\s\S]+?\])', text, re.I)
        if json_match:
            try:
                raw_data = json_match.group(1).strip()
                if (raw_data.startswith("'") and raw_data.endswith("'")) or (raw_data.startswith('"') and raw_data.endswith('"')):
                    raw_data = raw_data[1:-1]
                if raw_data.startswith('{') and raw_data.endswith('}'):
                    raw_data = f"[{raw_data}]"
                clean_json = re.sub(r',\s*\]', ']', raw_data)
                clean_json = re.sub(r',\s*\}', '}', clean_json)
                data = json.loads(clean_json)

                def walk(items, current_dub='', current_season='1'):
                    for item in items:
                        if 'folder' in item or 'playlist' in item:
                            next_dub = current_dub
                            next_season = current_season
                            folder_title = item.get('title', '')
                            season_match = re.search(r'[Сс]езон\s*(\d+)', folder_title)
                            if season_match:
                                next_season = season_match.group(1)
                                if folder_title.strip().lower() != f"сезон {next_season}".lower():
                                    next_dub = re.sub(r'[Сс]езон\s*\d+', '', folder_title).replace('/', '').strip() or current_dub
                            elif folder_title:
                                next_dub = folder_title
                            walk(item.get('folder') or item.get('playlist'), next_dub, next_season)
                        elif 'file' in item:
                            ep_title = item.get('title', 'Серія')
                            final_dub = current_dub or provider or 'UA'
                            final_season = current_season
                            ep_season_match = re.search(r'[Сс]езон\s*(\d+)', ep_title)
                            if ep_season_match:
                                final_season = ep_season_match.group(1)
                            ep_num_match = re.search(r'(\d+)\s*[Сс]ері[яіяа]|[Сс]ері[яіяа]\s*(\d+)|[Ее]п\.?\s*(\d+)', ep_title)
                            ep_num = ep_num_match.group(1) or ep_num_match.group(2) or ep_num_match.group(3) if ep_num_match else "1"
                            sources.append({
                                "label": ep_title,
                                "file": item['file'],
                                "dub": final_dub.strip(),
                                "season": final_season,
                                "episode": ep_num
                            })
                if isinstance(data, list):
                    walk(data)
                elif 'file' in data:
                    sources.append({
                        "label": data.get('title', 'Озвучка'),
                        "file": data['file'],
                        "dub": provider or 'UA',
                        "season": '1',
                        "episode": '1'
                    })
            except Exception as e:
                print(f"Error parsing JSON sources: {e}")

        if not sources:
            urls = re.findall(r'https?://[^\s\'"<> ]+\.m3u8[^\s\'"<> ]*', text)
            for idx, url in enumerate(set(urls)):
                sources.append({
                    "label": f"Потік {idx + 1}",
                    "file": url,
                    "dub": provider or 'UA',
                    "season": '1',
                    "episode": str(idx + 1)
                })
        return sources

    async def get_details_from_html(self, html, url):
        soup = BeautifulSoup(html, 'html.parser')
        title = "Без назви"
        for sel in ['.page__subcol-main h1', '.pmovie__title', 'h1.title', 'h1']:
            el = soup.select_one(sel)
            if el and el.get_text(strip=True):
                title = el.get_text(strip=True)
                break
        poster = ""
        for sel in ['div.page__subcol-side .img-fit-cover img', '.pmovie__poster img', '.anime__poster img']:
            el = soup.select_one(sel)
            if el:
                src = el.get('data-src') or el.get('src') or ""
                if src:
                    poster = urljoin(self.BASE_URL, src)
                    break
        genres = [a.get_text(strip=True) for a in soup.select('.pmovie__genres a, .genres a')]
        year_el = soup.select_one('.pmovie__year, .release-year')
        year = None
        if year_el:
            year_match = re.search(r'\d{4}', year_el.get_text())
            if year_match:
                year = year_match.group(0)
        synopsis = ""
        for sel in ['.full-text', '.pmovie__description', '.anime__description']:
            el = soup.select_one(sel)
            if el and el.get_text(strip=True):
                synopsis = el.get_text(strip=True)
                break

        player_urls = []
        for el in soup.select('iframe[src], iframe[data-src]'):
            src = el.get('src') or el.get('data-src')
            if not src or src == 'about:blank':
                continue
            if src.startswith('//'):
                src = 'https:' + src
            player_urls.append(urljoin(self.BASE_URL, src))
        for s in soup.select('script:not([src])'):
            matches = re.findall(r'(?:playerUrl|iframeUrl|src)\s*[:=]\s*[\'"]([^\'"]+)[\'"]', s.get_text())
            for url_match in matches:
                if any(x in url_match for x in ['ashdi.vip', 'vidmoly', 'player']):
                    if url_match.startswith('//'):
                        url_match = 'https:' + url_match
                    player_urls.append(urljoin(self.BASE_URL, url_match))
        player_urls = list(set(player_urls))
        all_sources = []
        for p_url in player_urls:
            try:
                provider = "Ashdi" if "ashdi" in p_url else "Vidmoly" if "vidmoly" in p_url else "Player"
                p_html = await self.fetch_html(p_url)
                if p_html:
                    all_sources.extend(self.extract_sources(p_html, provider))
                    p_soup = BeautifulSoup(p_html, 'html.parser')
                    for nested in p_soup.select('iframe[src], iframe[data-src]'):
                        n_url = nested.get('src') or nested.get('data-src')
                        if n_url and n_url != 'about:blank':
                            if n_url.startswith('//'):
                                n_url = 'https:' + n_url
                            n_html = await self.fetch_html(urljoin(self.BASE_URL, n_url))
                            if n_html:
                                all_sources.extend(self.extract_sources(n_html, provider))
            except Exception as e:
                print(f"Error fetching player {p_url}: {e}")

        seasons = {}
        seen_keys = set()
        for s in all_sources:
            s_num = s['season']
            dub = s['dub']
            ep_num = s['episode']
            key = f"{s_num}-{dub}-{ep_num}-{s['file']}"
            if key not in seen_keys:
                seen_keys.add(key)
                if s_num not in seasons:
                    seasons[s_num] = {}
                if dub not in seasons[s_num]:
                    seasons[s_num][dub] = []
                seasons[s_num][dub].append(s)

        for s_num in seasons:
            for dub in seasons[s_num]:
                seasons[s_num][dub].sort(key=lambda x: int(x['episode']) if x['episode'].isdigit() else 0)

        return {
            "title": title,
            "image": poster,
            "genres": genres,
            "year": year,
            "synopsis": synopsis,
            "seasons": seasons,
            "url": url
        }

    async def get_anime_details(self, url):
        html = await self.fetch_html(url)
        if not html:
            return None
        return await self.get_details_from_html(html, url)

    async def close(self):
        if self.session:
            await self.session.close()

# ================== Telegram Bot ==================
scraper = AnimeScraper()
user_states = {}

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "Привіт! Я бот для перегляду аніме. 🎥\n\n"
        "Використовуй кнопки нижче або просто напиши назву аніме для пошуку.",
        reply_markup=get_main_keyboard()
    )

def get_main_keyboard():
    keyboard = [
        [InlineKeyboardButton("🔥 Останні оновлення", callback_data="latest_1")],
        [InlineKeyboardButton("🎲 Рандомне аніме", callback_data="random")],
        [InlineKeyboardButton("🔍 Пошук", callback_data="search_prompt")]
    ]
    return InlineKeyboardMarkup(keyboard)

async def handle_message(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.message.chat_id
    query_text = update.message.text
    if not query_text:
        return
    user_states[chat_id] = {"current_search_query": query_text, "current_search_results": [], "current_page": 1}
    await update.message.reply_text(f"Шукаю: {query_text}...")
    results = await scraper.search(query_text, page=1)
    if not results:
        await update.message.reply_text("Нічого не знайдено. Спробуйте іншу назву.")
        return
    user_states[chat_id]["current_search_results"] = results
    await show_results(update, results, f"Результати пошуку для '{query_text}':", page=1, prefix="search")

async def show_results(update_or_query, results, text, page, prefix):
    chat_id = update_or_query.message.chat_id if isinstance(update_or_query, Update) else update_or_query.message.chat_id
    if chat_id not in user_states:
        user_states[chat_id] = {}
    user_states[chat_id][f"{prefix}_results_page_{page}"] = results
    keyboard = []
    for i, anime in enumerate(results):
        callback_id = f"{prefix}_{page}_{i}"
        keyboard.append([InlineKeyboardButton(anime["title"], callback_data=f"details_{callback_id}")])
    nav_buttons = []
    if page > 1:
        nav_buttons.append(InlineKeyboardButton("⬅️ Назад", callback_data=f"{prefix}_{page-1}"))
    if len(results) == 20:
        nav_buttons.append(InlineKeyboardButton("Вперед ➡️", callback_data=f"{prefix}_{page+1}"))
    if nav_buttons:
        keyboard.append(nav_buttons)
    keyboard.append([InlineKeyboardButton("🏠 Головна", callback_data="start")])
    reply_markup = InlineKeyboardMarkup(keyboard)
    if isinstance(update_or_query, Update):
        await update_or_query.message.reply_text(text, reply_markup=reply_markup)
    else:
        await update_or_query.edit_message_text(text, reply_markup=reply_markup)

async def callback_handler(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    data = query.data
    chat_id = query.message.chat_id

    if data == "start":
        await query.edit_message_text("Оберіть дію:", reply_markup=get_main_keyboard())
    elif data.startswith("latest_"):
        page = int(data.split("_")[1])
        results = await scraper.get_main_page(page)
        await show_results(query, results, f"Останні оновлення (Сторінка {page}):", page, prefix="latest")
    elif data.startswith("search_") and len(data.split("_")) == 2:
        page = int(data.split("_")[1])
        current_query = user_states.get(chat_id, {}).get("current_search_query")
        if current_query:
            results = await scraper.search(current_query, page)
            if results:
                user_states[chat_id]["current_search_results"] = results
                await show_results(query, results, f"Результати пошуку для '{current_query}' (Сторінка {page}):", page, prefix="search")
            else:
                await query.edit_message_text("Більше результатів не знайдено.")
        else:
            await query.edit_message_text("Будь ласка, спочатку виконайте пошук.", reply_markup=get_main_keyboard())
    elif data == "random":
        await query.edit_message_text("Шукаю випадкове аніме...")
        details = await scraper.get_random()
        if details:
            await show_details(query, details)
        else:
            await query.edit_message_text("Не вдалося знайти аніме. Спробуйте ще раз.")
    elif data.startswith("details_"):
        parts = data.split("_")
        prefix, page, index = parts[1], int(parts[2]), int(parts[3])
        anime_list = user_states.get(chat_id, {}).get(f"{prefix}_results_page_{page}", [])
        anime_url = anime_list[index]["url"] if index < len(anime_list) else None
        if anime_url:
            await query.edit_message_text("Завантажую деталі...")
            details = await scraper.get_anime_details(anime_url)
            if details:
                await show_details(query, details)
            else:
                await query.edit_message_text("Не вдалося завантажити деталі аніме.")
        else:
            await query.edit_message_text("Помилка: Аніме не знайдено.")
    elif data.startswith("season_"):
        parts = data.split("_")
        anime_url_hash, s_num = parts[1], parts[2]
        details = user_states.get(chat_id, {}).get(f"anime_details_{anime_url_hash}")
        if details:
            await show_dubs(query, details, anime_url_hash, s_num)
        else:
            await query.edit_message_text("Помилка: Деталі аніме не знайдено.")
    elif data.startswith("dub_"):
        parts = data.split("_")
        anime_url_hash, s_num, dub_name = parts[1], parts[2], parts[3]
        details = user_states.get(chat_id, {}).get(f"anime_details_{anime_url_hash}")
        if details:
            await show_episodes(query, details, anime_url_hash, s_num, dub_name)
        else:
            await query.edit_message_text("Помилка: Деталі аніме не знайдено.")
    elif data.startswith("ep_"):
        parts = data.split("_")
        anime_url_hash, s_num, dub_name, ep_num = parts[1], parts[2], parts[3], parts[4]
        details = user_states.get(chat_id, {}).get(f"anime_details_{anime_url_hash}")
        if details:
            await show_player(query, details, anime_url_hash, s_num, dub_name, ep_num)
        else:
            await query.edit_message_text("Помилка: Деталі аніме не знайдено.")
    elif data == "search_prompt":
        await query.edit_message_text("Просто напишіть назву аніме в чат для пошуку. 🔍")

async def show_details(query, details):
    chat_id = query.message.chat_id
    anime_url_hash = str(hash(details["url"]))
    user_states[chat_id][f"anime_details_{anime_url_hash}"] = details
    text = f"<b>{details['title']}</b>\n"
    if details["year"]:
        text += f"📅 Рік: {details['year']}\n"
    if details["genres"]:
        text += f"🏷 Жанри: {', '.join(details['genres'])}\n"
    text += f"\n📖 Опис: {details['synopsis'][:500]}..."
    keyboard = []
    seasons = sorted(details["seasons"].keys(), key=lambda x: int(x) if x.isdigit() else 0)
    for s in seasons:
        keyboard.append([InlineKeyboardButton(f"Сезон {s}", callback_data=f"season_{anime_url_hash}_{s}")])
    keyboard.append([InlineKeyboardButton("🏠 Головна", callback_data="start")])
    if details["image"]:
        await query.message.reply_photo(details["image"], caption=text, parse_mode='HTML', reply_markup=InlineKeyboardMarkup(keyboard))
        await query.delete_message()
    else:
        await query.edit_message_text(text, parse_mode='HTML', reply_markup=InlineKeyboardMarkup(keyboard))

async def show_dubs(query, details, anime_url_hash, s_num):
    dubs = sorted(details["seasons"].get(s_num, {}).keys())
    keyboard = []
    for d in dubs:
        keyboard.append([InlineKeyboardButton(f"🎙 {d}", callback_data=f"dub_{anime_url_hash}_{s_num}_{d}")])
    keyboard.append([InlineKeyboardButton("⬅️ Назад до опису", callback_data=f"details_dummy_{anime_url_hash}")])
    await query.edit_message_text(f"Оберіть озвучку для {s_num} сезону:", reply_markup=InlineKeyboardMarkup(keyboard))

async def show_episodes(query, details, anime_url_hash, s_num, dub_name):
    episodes = details["seasons"].get(s_num, {}).get(dub_name, [])
    keyboard = []
    row = []
    for ep in episodes:
        ep_num = ep["episode"]
        row.append(InlineKeyboardButton(ep_num, callback_data=f"ep_{anime_url_hash}_{s_num}_{dub_name}_{ep_num}"))
        if len(row) == 4:
            keyboard.append(row)
            row = []
    if row:
        keyboard.append(row)
    keyboard.append([InlineKeyboardButton("⬅️ Назад до озвучок", callback_data=f"season_{anime_url_hash}_{s_num}")])
    await query.edit_message_text(f"Оберіть серію ({dub_name}):", reply_markup=InlineKeyboardMarkup(keyboard))

async def show_player(query, details, anime_url_hash, s_num, dub_name, ep_num):
    episodes = details["seasons"].get(s_num, {}).get(dub_name, [])
    episode = next((e for e in episodes if e["episode"] == ep_num), None)
    if not episode:
        await query.answer("Серію не знайдено")
        return
    file_url = episode["file"]
    text = f"🎬 <b>{details['title']}</b>\nСезон {s_num}, Серія {ep_num}\nОзвучка: {dub_name}\n\n"
    text += "Ви можете переглянути відео за посиланням нижче. Рекомендується використовувати VLC або інший плеєр, що підтримує HLS (.m3u8)."
    proxy_file_url = f"{scraper.PROXY_URL}?url={quote(file_url)}"
    keyboard = [
        [InlineKeyboardButton("▶️ Дивитись (HLS Link)", url=proxy_file_url)],
        [InlineKeyboardButton("⬅️ Назад до серій", callback_data=f"dub_{anime_url_hash}_{s_num}_{dub_name}")]
    ]
    await query.edit_message_text(text, parse_mode='HTML', reply_markup=InlineKeyboardMarkup(keyboard))

if __name__ == '__main__':
    app = ApplicationBuilder().token(TOKEN).build()
    app.add_handler(CommandHandler("start", start))
    app.add_handler(MessageHandler(filters.TEXT & ~filters.COMMAND, handle_message))
    app.add_handler(CallbackQueryHandler(callback_handler))
    print("Bot is running...")
    app.run_polling()
