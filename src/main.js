import './style.css'

const app = document.querySelector('#app')
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

const apiHeaders = {
  apikey: SUPABASE_KEY,
  Authorization: `Bearer ${SUPABASE_KEY}`,
  'Content-Type': 'application/json',
}

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;').replaceAll("'", '&#039;')

const toMeeting = (row) => ({
  id: row.id,
  place: row.place,
  menu: row.menu,
  time: row.meeting_time,
  capacity: row.capacity,
  currentCount: row.current_count,
  createdAt: row.created_at,
})

async function requestSupabase(path, options = {}) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    throw new Error('Supabase 환경변수가 설정되지 않았습니다.')
  }

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: { ...apiHeaders, ...options.headers },
  })
  const body = await response.text()
  const data = body ? JSON.parse(body) : null

  if (!response.ok) {
    throw new Error(data?.message || data?.hint || 'Supabase 요청에 실패했습니다.')
  }
  return data
}

let meetings = []

async function loadMeetings() {
  const rows = await requestSupabase('/rest/v1/meetings?select=*&order=created_at.desc')
  meetings = rows.map(toMeeting)
}

async function createMeeting(meeting) {
  const rows = await requestSupabase('/rest/v1/meetings', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify({
      place: meeting.place,
      menu: meeting.menu,
      meeting_time: meeting.time,
      capacity: meeting.capacity,
      current_count: 1,
    }),
  })
  return toMeeting(rows[0])
}

async function joinMeeting(meeting) {
  const rows = await requestSupabase(
    `/rest/v1/meetings?id=eq.${meeting.id}&current_count=eq.${meeting.currentCount}`,
    {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ current_count: meeting.currentCount + 1 }),
    },
  )
  return rows[0] ? toMeeting(rows[0]) : null
}

function formatTime(time) {
  const [hour, minute] = time.split(':')
  const date = new Date()
  date.setHours(Number(hour), Number(minute))
  return new Intl.DateTimeFormat('ko-KR', { hour: 'numeric', minute: '2-digit', hour12: true }).format(date)
}

function meetingCard(meeting) {
  const isFull = meeting.currentCount >= meeting.capacity
  return `
    <article class="meeting-card">
      <div class="meeting-card__top">
        <div class="place-icon" aria-hidden="true">🍚</div>
        <div>
          <p class="meeting-card__eyebrow">오늘의 밥 약속</p>
          <h2>${escapeHtml(meeting.place)}</h2>
        </div>
        <span class="status ${isFull ? 'status--full' : ''}">${isFull ? '모집 완료' : '모집 중'}</span>
      </div>
      <div class="meeting-card__details">
        <div><span>메뉴</span><strong>${escapeHtml(meeting.menu)}</strong></div>
        <div><span>시간</span><strong>${formatTime(meeting.time)}</strong></div>
      </div>
      <div class="meeting-card__footer">
        <div class="count">
          <span class="count__people" aria-hidden="true">${'●'.repeat(meeting.currentCount)}${'○'.repeat(meeting.capacity - meeting.currentCount)}</span>
          <strong>현재 ${meeting.currentCount} / ${meeting.capacity}명</strong>
        </div>
        <button class="join-button" data-join-id="${meeting.id}" ${isFull ? 'disabled' : ''}>
          ${isFull ? '모집 완료' : '같이 먹기'}
        </button>
      </div>
    </article>`
}

function renderList() {
  app.innerHTML = `
    <header class="site-header">
      <a class="brand" href="#" data-view="list"><span class="brand__mark">밥</span><span>밥구함</span></a>
      <button class="header-button" data-view="create">+ 밥친구 모집하기</button>
    </header>
    <main class="page-shell">
      <section class="hero">
        <p class="eyebrow">KOREA UNIVERSITY · LUNCH MATE</p>
        <h1>오늘 점심,<br><em>혼자 먹지 마세요.</em></h1>
        <p class="hero__description">지금 함께 밥 먹을 친구를 찾고,<br>가볍게 한 끼를 시작해보세요.</p>
        <button class="primary-button" data-view="create">밥친구 모집하기 <span>→</span></button>
      </section>
      <section class="meeting-section" aria-labelledby="meeting-title">
        <div class="section-heading">
          <div><p class="eyebrow">OPEN TABLES</p><h2 id="meeting-title">지금 모집 중인 밥약속</h2></div>
          <p>${meetings.filter((meeting) => meeting.currentCount < meeting.capacity).length}개의 열린 약속</p>
        </div>
        <div class="meeting-grid">
          ${meetings.length ? meetings.map(meetingCard).join('') : `
            <div class="empty-state">
              <div>🍽️</div><h3>아직 등록된 밥약속이 없어요</h3>
              <p>오늘의 첫 밥친구를 직접 모집해보세요.</p>
              <button class="text-button" data-view="create">첫 모집글 만들기 →</button>
            </div>`}
        </div>
      </section>
    </main>
    <footer>밥구함 · 고려대 학생들의 가벼운 한 끼</footer>
    <div class="toast" role="status" aria-live="polite"></div>`
}

function renderCreate() {
  app.innerHTML = `
    <header class="site-header">
      <a class="brand" href="#" data-view="list"><span class="brand__mark">밥</span><span>밥구함</span></a>
      <button class="back-button" data-view="list">← 목록으로</button>
    </header>
    <main class="form-page">
      <section class="form-intro">
        <p class="eyebrow">CREATE A TABLE</p>
        <h1>함께 먹으면<br><em>더 맛있으니까.</em></h1>
        <p>간단한 정보만 입력하면<br>바로 밥친구를 모집할 수 있어요.</p>
        <div class="form-intro__note"><span>01</span><p><strong>모집자는 자동으로 참여해요.</strong><br>현재 인원은 1명부터 시작합니다.</p></div>
      </section>
      <section class="form-card" aria-labelledby="form-title">
        <div class="form-card__heading"><span>🍚</span><div><p>새로운 밥약속</p><h2 id="form-title">어디서 무엇을 먹을까요?</h2></div></div>
        <form id="meetingForm">
          <label><span>장소</span><input name="place" type="text" placeholder="예: 고른햇살" maxlength="20" required></label>
          <label><span>메뉴</span><input name="menu" type="text" placeholder="예: 제육덮밥" maxlength="30" required></label>
          <div class="form-row">
            <label><span>시간</span><input name="time" type="time" required></label>
            <label><span>모집 인원</span><select name="capacity" required>
              <option value="2">2명</option><option value="3">3명</option><option value="4" selected>4명</option>
              <option value="5">5명</option><option value="6">6명</option><option value="7">7명</option><option value="8">8명</option>
            </select></label>
          </div>
          <button class="submit-button" type="submit">밥친구 모집하기 <span>→</span></button>
        </form>
      </section>
    </main>
    <div class="toast" role="status" aria-live="polite"></div>`
  document.querySelector('input[name="place"]').focus()
}

function showToast(message) {
  const toast = document.querySelector('.toast')
  if (!toast) return
  toast.textContent = message
  toast.classList.add('toast--visible')
  window.setTimeout(() => toast.classList.remove('toast--visible'), 2200)
}

document.addEventListener('click', async (event) => {
  const viewButton = event.target.closest('[data-view]')
  const joinButton = event.target.closest('[data-join-id]')
  if (viewButton) {
    event.preventDefault()
    if (viewButton.dataset.view === 'create') {
      renderCreate()
    } else {
      renderList()
      try {
        await loadMeetings()
        renderList()
      } catch (error) {
        showToast(error.message)
      }
    }
  }
  if (joinButton) {
    const meeting = meetings.find((item) => item.id === Number(joinButton.dataset.joinId))
    if (!meeting || meeting.currentCount >= meeting.capacity) return
    joinButton.disabled = true
    try {
      const updatedMeeting = await joinMeeting(meeting)
      if (!updatedMeeting) {
        await loadMeetings()
        renderList()
        showToast('인원이 방금 변경됐어요. 다시 눌러주세요.')
        return
      }
      meetings = meetings.map((item) => item.id === updatedMeeting.id ? updatedMeeting : item)
      renderList()
      showToast(updatedMeeting.currentCount >= updatedMeeting.capacity ? '모집이 완료됐어요! 🎉' : '밥약속에 참여했어요!')
    } catch (error) {
      joinButton.disabled = false
      showToast(error.message)
    }
  }
})

document.addEventListener('submit', async (event) => {
  if (event.target.id !== 'meetingForm') return
  event.preventDefault()
  const formData = new FormData(event.target)
  const meeting = {
    place: formData.get('place').trim(), menu: formData.get('menu').trim(),
    time: formData.get('time'), capacity: Number(formData.get('capacity')),
  }
  if (!meeting.place || !meeting.menu || !meeting.time) return
  const submitButton = event.target.querySelector('button[type="submit"]')
  submitButton.disabled = true
  try {
    const savedMeeting = await createMeeting(meeting)
    meetings.unshift(savedMeeting)
    renderList()
    showToast('새 밥약속이 등록됐어요!')
  } catch (error) {
    submitButton.disabled = false
    showToast(error.message)
  }
})

renderList()
loadMeetings()
  .then(renderList)
  .catch((error) => showToast(error.message))
