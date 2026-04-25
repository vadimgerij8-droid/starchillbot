addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const TOKEN = '8292583957:AAHT7xgEsohsRbCmbNg1PiMxvgrqXRCwUr8'
const API = `https://api.telegram.org/bot${TOKEN}`
const SITE = 'https://uakino.best'

// ================= TELEGRAM =================

async function tg(method, body) {
  await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
}

const sendMessage = (chatId, text, extra = {}) =>
  tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra })

const sendPhoto = (chatId, photo, caption, extra = {}) =>
  tg('sendPhoto', { chat_id: chatId, photo, caption, parse_mode: 'HTML', ...extra })

// ================= REQUEST =================

async function handleRequest(req) {
  const url = new URL(req.url)

  if (url.pathname !== '/webhook') {
    return new Response('ok')
  }

  if (req.method === 'POST') {
    const update = await req.json()
    await handleUpdate(update)
  }

  return new Response('ok')
}

// ================= UPDATE =================

async function handleUpdate(update) {
  if (update.message) {
    const chatId = update.message.chat.id
    const text = update.message.text || ''

    if (text === '/start') {
      return sendMessage(chatId, '🎬 Напиши назву фільму')
    }

    return search(text, chatId)
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id
    const data = update.callback_query.data

    const url = decodeURIComponent(data.replace('movie|', ''))

    const page = await fetch(url).then(r => r.text())

    const title = page.match(/<h1[^>]*>(.*?)<\/h1>/)?.[1] || 'Фільм'
    const img = page.match(/og:image" content="(.*?)"/)?.[1]

    const iframe = page.match(/iframe[^>]+src="(.*?)"/)?.[1]

    let link = iframe ? await getStream(iframe) : null

    const keyboard = link
      ? { inline_keyboard: [[{ text: '▶️ Дивитись', url: link }]] }
      : {}

    if (img) {
      await sendPhoto(chatId, img, `🎬 <b>${title}</b>`, keyboard)
    } else {
      await sendMessage(chatId, `🎬 <b>${title}</b>`, keyboard)
    }
  }
}

// ================= SEARCH =================

async function search(query, chatId) {
  const body = `do=search&subaction=search&story=${encodeURIComponent(query)}`

  const html = await fetch(SITE, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body
  }).then(r => r.text())

  const blocks = html.split('<div class="movie-item short-item"')

  const results = []

  for (const b of blocks) {
    const link = b.match(/href="(.*?)"/)?.[1]
    const title = b.match(/movie-title[^>]*>(.*?)<\/a>/)?.[1]

    if (!link || !title) continue

    results.push({
      title: title.replace(/<.*?>/g, ''),
      url: link.startsWith('http') ? link : SITE + link
    })
  }

  if (!results.length) {
    return sendMessage(chatId, '😕 Нічого не знайдено')
  }

  const keyboard = results.slice(0, 10).map(r => ([{
    text: r.title,
    callback_data: 'movie|' + encodeURIComponent(r.url)
  }]))

  await sendMessage(chatId, '🎬 Результати:', {
    reply_markup: { inline_keyboard: keyboard }
  })
}

// ================= STREAM =================

async function getStream(url) {
  const html = await fetch(url).then(r => r.text())
  const iframe = html.match(/iframe[^>]+src="(.*?)"/)?.[1]
  if (!iframe) return null

  const player = await fetch(iframe).then(r => r.text())

  const m3u8 = player.match(/file\s*:\s*["'](.*?\.m3u8.*?)["']/)?.[1]

  return m3u8 || null
}
