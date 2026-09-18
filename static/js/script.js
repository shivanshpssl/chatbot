const CHAT_API_URL = "/api/chat/"; // <-- put your Django endpoint here

// ⚠️ Sirf LOCAL TESTING ke liye. Production LMS widget me yeh token yahan
// hardcode NAHI karna — real flow me Laravel backend hi Django ko token
// ke saath call karega, browser JS kabhi nahi.
const CHATBOT_API_TOKEN = "qwen2.5-coder-14b-instruct-token";

const launcher   = document.getElementById('cbLauncher');
const windowEl   = document.getElementById('cbWindow');
const closeBtn   = document.getElementById('cbClose');
const messagesEl = document.getElementById('cbMessages');
const inputEl    = document.getElementById('cbInput');
const sendBtn    = document.getElementById('cbSend');
const quickEl    = document.getElementById('cbQuick');
const dot        = launcher.querySelector('.cb-dot');

let opened = false;

launcher.addEventListener('click', () => {
  opened = !opened;
  windowEl.classList.toggle('open', opened);
  if (opened) {
    dot.style.display = 'none';
    inputEl.focus();
  }
});

closeBtn.addEventListener('click', () => {
  opened = false;
  windowEl.classList.remove('open');
});

function nowTime() {
  return new Date().toLocaleTimeString('hi-IN', { hour: '2-digit', minute: '2-digit' });
}

// Also update the time on the welcome message that's already present in the HTML
// with the actual current time (instead of the hardcoded "Now")
const firstTimeEl = document.querySelector('#cbMessages .cb-time');
if (firstTimeEl) firstTimeEl.textContent = nowTime();

function appendMessage(text, sender) {
  const row = document.createElement('div');
  row.className = `cb-row ${sender}`;

  const avatar = document.createElement('div');
  avatar.className = 'cb-mini-avatar';
  avatar.textContent = sender === 'bot' ? '🧑\u200d💼' : 'A';

  const wrap = document.createElement('div');
  const bubble = document.createElement('div');
  bubble.className = 'cb-bubble';
  bubble.textContent = text; // textContent = safe from XSS

  const time = document.createElement('div');
  time.className = 'cb-time';
  time.textContent = nowTime();

  wrap.appendChild(bubble);
  wrap.appendChild(time);
  row.appendChild(avatar);
  row.appendChild(wrap);
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

// ============ TYPING INDICATOR (linked here with the .cb-typing CSS) ============
function showTyping() {
  const row = document.createElement('div');
  row.className = 'cb-row bot';
  row.id = 'cbTypingRow';
  row.innerHTML = `
    <div class="cb-mini-avatar">🧑\u200d💼</div>
    <div class="cb-typing"><span></span><span></span><span></span></div>
  `;
  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function hideTyping() {
  const row = document.getElementById('cbTypingRow');
  if (row) row.remove();
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
  return null;
}

function setSending(state) {
  sendBtn.disabled = state;
  inputEl.disabled = state;
}

// ============ THIS FUNCTION SENDS THE MESSAGE + THE TYPING DELAY IS HANDLED HERE ============
async function sendToBackend(message) {
  setSending(true);
  showTyping();   // <-- typing dots start showing here

  const TYPING_DELAY_MS = 3000; // <-- FIXED 3 second delay (you can change the number here)

  try {
    const response = await fetch(CHAT_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCookie('csrftoken'),
        'Authorization': `Bearer ${CHATBOT_API_TOKEN}`   // <-- YEH LINE ADD KI
      },
      body: JSON.stringify({ message })
    });

    if (!response.ok) throw new Error(`Server status ${response.status}`);

    const data = await response.json();
    const reply = data.reply || 'Sorry, something went wrong.';

    // Even if the server replies quickly, show the typing indicator for at least 3 seconds
    await new Promise((resolve) => setTimeout(resolve, TYPING_DELAY_MS));

    hideTyping();   // <-- typing dots disappear here
    appendMessage(reply, 'bot');
  } catch (err) {
    await new Promise((resolve) => setTimeout(resolve, TYPING_DELAY_MS));
    hideTyping();
    appendMessage('Unable to connect to the server. Please try again shortly.', 'bot');
    console.error('Chatbot API error:', err);
  } finally {
    setSending(false);
    inputEl.focus();
  }
}

function handleSend() {
  const text = inputEl.value.trim();
  if (!text) return;
  appendMessage(text, 'user');
  inputEl.value = '';
  quickEl.style.display = 'none';
  sendToBackend(text);
}

sendBtn.addEventListener('click', handleSend);
inputEl.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSend();
});

// Fallback: if the config API fails, these static HTML chips will still work
quickEl.querySelectorAll('.cb-chip').forEach((chip) => {
  chip.addEventListener('click', () => {
    inputEl.value = chip.textContent;
    handleSend();
  });
});

// ============ DYNAMIC CONFIG (welcome message + quick questions from the DB) ============
async function loadChatConfig() {
  try {
    const response = await fetch('/api/chat/config/');
    if (!response.ok) throw new Error(`Server status ${response.status}`);
    const data = await response.json();

    // Remove the old static welcome message
    messagesEl.innerHTML = '';

    // Show all opening bot messages in sequence
    if (data.bot_messages && data.bot_messages.length > 0) {
      data.bot_messages.forEach((msg) => appendMessage(msg, 'bot'));
    }

    // Set the Call / Email buttons using the values that came from the DB
    const callBtn = document.getElementById('cbCallBtn');
    const emailBtn = document.getElementById('cbEmailBtn');
    if (callBtn && data.contact_phone) {
      callBtn.href = `tel:${data.contact_phone}`;
    }
    if (emailBtn && data.contact_email) {
      emailBtn.href = `mailto:${data.contact_email}`;
    }

    // Only show quick chips when the lead-capture flow is not running
    if (data.quick_questions && data.quick_questions.length > 0) {
      quickEl.innerHTML = '';
      quickEl.style.display = 'flex';
      data.quick_questions.forEach((q) => {
        const chip = document.createElement('button');
        chip.className = 'cb-chip';
        chip.textContent = q;
        chip.addEventListener('click', () => {
          inputEl.value = q;
          handleSend();
        });
        quickEl.appendChild(chip);
      });
    } else {
      quickEl.style.display = 'none';
    }
  } catch (err) {
    console.error('Chat config load error:', err);
  }
}

// Run as soon as the page loads (DOM is already ready since the script has "defer")
loadChatConfig();