addEventListener('fetch', event => {
  event.respondWith(handleRequest(event.request))
})

const TOKEN = '8292583957:AAHT7xgEsohsRbCmbNg1PiMxvgrqXRCwUr8' // замініть на свій
const API = `https://api.telegram.org/bot${TOKEN}`

// ================= PET STATE (тимчасово в пам'яті) =================
// Для постійного зберігання використовуйте KV (див. нижче)
const pets = new Map() // chatId -> { hunger, happiness, energy, lastUpdate }

const DEFAULT_STATS = { hunger: 50, happiness: 50, energy: 50, lastUpdate: Date.now() }

function getPet(chatId) {
  if (!pets.has(chatId)) {
    pets.set(chatId, { ...DEFAULT_STATS })
  }
  return pets.get(chatId)
}

function updateStats(pet) {
  const now = Date.now()
  const elapsed = (now - pet.lastUpdate) / 1000 // секунди
  // кожні 30 секунд голод +1, щастя -1, енергія -1 (дуже повільно)
  if (elapsed > 30) {
    const ticks = Math.floor(elapsed / 30)
    pet.hunger = Math.min(100, pet.hunger + ticks)
    pet.happiness = Math.max(0, pet.happiness - ticks)
    pet.energy = Math.max(0, pet.energy - ticks)
    pet.lastUpdate = now
  }
}

function formatPet(pet) {
  const getEmoji = v => v > 70 ? '🟢' : v > 30 ? '🟡' : '🔴'
  return (
    `🐾 <b>Твій улюбленець</b>\n` +
    `${getEmoji(pet.hunger)} Голод: ${pet.hunger}/100\n` +
    `${getEmoji(pet.happiness)} Щастя: ${pet.happiness}/100\n` +
    `${getEmoji(pet.energy)} Енергія: ${pet.energy}/100`
  )
}

// ================= TELEGRAM API =================

async function tg(method, body) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  return res.json()
}

const sendMessage = (chatId, text, extra = {}) =>
  tg('sendMessage', { chat_id: chatId, text, parse_mode: 'HTML', ...extra })

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
      const pet = getPet(chatId)
      updateStats(pet)
      return sendMessage(chatId, 'Привіт! Це твій віртуальний улюбленець.\nОбери дію:', {
        reply_markup: getMainKeyboard()
      })
    }

    // Якщо користувач написав щось не команду
    return sendMessage(chatId, 'Використовуй кнопки або команду /start', {
      reply_markup: getMainKeyboard()
    })
  }

  if (update.callback_query) {
    const chatId = update.callback_query.message.chat.id
    const data = update.callback_query.data
    const pet = getPet(chatId)
    updateStats(pet)

    let message = ''
    switch (data) {
      case 'feed':
        pet.hunger = Math.max(0, pet.hunger - 20)
        pet.happiness = Math.min(100, pet.happiness + 5)
        message = '🍔 Смачного! Голод зменшено.'
        break
      case 'play':
        pet.happiness = Math.min(100, pet.happiness + 15)
        pet.energy = Math.max(0, pet.energy - 10)
        pet.hunger = Math.min(100, pet.hunger + 5)
        message = '🎾 Весело пограли! Щастя підвищилось.'
        break
      case 'sleep':
        pet.energy = Math.min(100, pet.energy + 25)
        pet.hunger = Math.min(100, pet.hunger + 10)
        message = '😴 Улюбленець поспав і відновив сили.'
        break
      case 'status':
        message = formatPet(pet)
        break
      default:
        message = 'Невідома команда'
    }

    // Оновлюємо повідомлення зі статусом та кнопками
    await tg('editMessageText', {
      chat_id: chatId,
      message_id: update.callback_query.message.message_id,
      text: message + '\n\n' + formatPet(pet),
      parse_mode: 'HTML',
      reply_markup: getMainKeyboard()
    })

    // Підтвердження callback
    await tg('answerCallbackQuery', {
      callback_query_id: update.callback_query.id
    })
  }
}

function getMainKeyboard() {
  return {
    inline_keyboard: [
      [
        { text: '🍔 Годувати', callback_data: 'feed' },
        { text: '🎾 Грати', callback_data: 'play' }
      ],
      [
        { text: '😴 Спати', callback_data: 'sleep' },
        { text: '📊 Статус', callback_data: 'status' }
      ]
    ]
  }
}
