// script.js -- Full functionality for Registration, Login and Home (create/take/score quizzes)
// Storage keys
const STORAGE = {
  users: 'quiz_users',
  quizzes: 'quiz_quizzes',
  results: 'quiz_results',
  currentUser: 'quiz_current_user' // session storage key
};

// ---------- Utility helpers ----------
function loadJSON(key) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('loadJSON error', e);
    return [];
  }
}
function saveJSON(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value || []));
  } catch (e) {
    console.error('saveJSON error', e);
  }
}
function genId(prefix = 'id') {
  if (window.crypto && crypto.randomUUID) return `${prefix}-${crypto.randomUUID()}`;
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}
function isEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}
function setCurrentUser(userObj) {
  // store minimal user info in sessionStorage
  if (!userObj) return;
  sessionStorage.setItem(STORAGE.currentUser, JSON.stringify({
    id: userObj.id,
    username: userObj.username || userObj.name || userObj.email.split('@')[0],
    email: userObj.email
  }));
}
function getCurrentUser() {
  try {
    const s = sessionStorage.getItem(STORAGE.currentUser);
    if (!s) return null;
    return JSON.parse(s);
  } catch (e) {
    return null;
  }
}
function clearCurrentUser() {
  sessionStorage.removeItem(STORAGE.currentUser);
}
function firstExistingIdValue(listOfIds) {
  for (const id of listOfIds) {
    const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
    if (el && typeof el.value !== 'undefined') return el.value.trim();
  }
  return '';
}
function firstExistingEl(listOfIds) {
  for (const id of listOfIds) {
    const el = document.getElementById(id) || document.querySelector(`[name="${id}"]`);
    if (el) return el;
  }
  return null;
}
function showAlert(msg) { alert(msg); }

// ---------- Registration ----------
function initRegistration() {
  const form = document.getElementById('registerForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    // accept multiple possible input id names to be robust
    const username = firstExistingIdValue(['username', 'regUsername', 'regName', 'name', 'registerName']);
    const email = firstExistingIdValue(['registerEmail', 'regEmail', 'email', 'registerEmail']);
    const password = firstExistingIdValue(['registerPassword', 'regPassword', 'password', 'registerPass']);

    if (!username || !email || !password) {
      showAlert('Please fill all fields (username, email, password).');
      return;
    }
    if (!isEmail(email)) {
      showAlert('Please enter a valid email address.');
      return;
    }
    if (password.length < 6) {
      showAlert('Password must be at least 6 characters.');
      return;
    }

    const users = loadJSON(STORAGE.users);
    if (users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
      showAlert('An account with that email already exists. Please login.');
      // optional: redirect to login
      const loginLink = firstExistingEl(['goLogin', 'loginLink']);
      if (loginLink && loginLink.href) window.location.href = loginLink.href;
      return;
    }

    const newUser = {
      id: genId('user'),
      username,
      email: email.toLowerCase(),
      password, // this is client demo; do not do this in real apps
      createdAt: new Date().toISOString()
    };

    users.push(newUser);
    saveJSON(STORAGE.users, users);

    // auto-login and redirect to home (so user "goes to quiz" after filling entries)
    setCurrentUser(newUser);
    showAlert('Account created — you are now logged in.');
    window.location.href = 'home.html';
  });
}

// ---------- Login ----------
function initLogin() {
  const form = document.getElementById('loginForm');
  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const email = firstExistingIdValue(['loginEmail', 'email', 'loginMail']);
    const password = firstExistingIdValue(['loginPassword', 'password', 'loginPass']);

    if (!email || !password) {
      showAlert('Please enter email & password.');
      return;
    }

    const users = loadJSON(STORAGE.users);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);

    if (!user) {
      showAlert('Invalid email or password. If you do not have an account, register first.');
      return;
    }

    setCurrentUser(user);
    showAlert(`Welcome back, ${user.username || user.name || user.email.split('@')[0]}!`);
    window.location.href = 'home.html';
  });
}

// ---------- Home (Create / Quizzes / Scores / Modal) ----------
function initHome() {
  // only run on home page
  if (!document.getElementById('welcomeSub')) return;

  // get current user from sessionStorage; if absent redirect to login
  let current = getCurrentUser();
  if (!current) {
    // optional recovery: if only one user exists, auto-login them
    const users = loadJSON(STORAGE.users);
    if (users.length === 1) { setCurrentUser(users[0]); current = getCurrentUser(); }
  }
  if (!current) {
    showAlert('Please login first.');
    window.location.href = 'login.html';
    return;
  }

  // welcome text
  const welcomeSub = document.getElementById('welcomeSub');
  if (welcomeSub) welcomeSub.textContent = `Signed in as ${current.username}`;

  // logout
  const btnLogout = document.getElementById('btnLogout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      clearCurrentUser();
      window.location.href = 'login.html';
    });
  }

  // TABS
  const tabs = document.querySelectorAll('.tab-btn');
  const panels = document.querySelectorAll('.tab-panel');
  if (tabs && panels) {
    tabs.forEach(btn => btn.addEventListener('click', () => {
      tabs.forEach(b => b.classList.remove('active'));
      panels.forEach(p => p.classList.remove('active'));
      btn.classList.add('active');
      const target = btn.dataset.tab;
      const panel = document.getElementById(target);
      if (panel) panel.classList.add('active');
    }));
  }

  // QUIZ CREATION UI
  const qArea = document.getElementById('questionsArea');
  const addQuestionBtn = document.getElementById('addQuestionBtn');
  const saveQuizBtn = document.getElementById('saveQuizBtn');
  const shareArea = document.getElementById('shareArea');
  const shareLinkInput = document.getElementById('shareLink');
  const copyLinkBtn = document.getElementById('copyLink');

  // helper to create a question block
  function createQuestionBlock(prefill) {
    const div = document.createElement('div');
    div.className = 'question-block';
    div.innerHTML = `
      <div class="row between">
        <strong>Question</strong>
        <div>
          <button class="btn ghost cloneQ" type="button">Clone</button>
          <button class="btn ghost removeQ" type="button">Remove</button>
        </div>
      </div>
      <div style="margin-top:8px">
        <input class="q-text" placeholder="Write question" value="${prefill?.text ? escapeHtml(prefill.text) : ''}" />
      </div>
      <div style="margin-top:8px" class="choices">
        ${[0,1,2,3].map(i => `<div style="margin-top:6px"><input class="q-choice" data-index="${i}" placeholder="Option ${i+1}" value="${prefill?.choices?.[i] ? escapeHtml(prefill.choices[i]) : ''}" /></div>`).join('')}
      </div>
      <div style="margin-top:8px" class="row">
        <label class="small muted">Correct option</label>
        <select class="q-correct">
          <option value="0">Option 1</option>
          <option value="1">Option 2</option>
          <option value="2">Option 3</option>
          <option value="3">Option 4</option>
        </select>
      </div>
    `;
    const removeBtn = div.querySelector('.removeQ');
    const cloneBtn = div.querySelector('.cloneQ');
    const correctSelect = div.querySelector('.q-correct');

    removeBtn && removeBtn.addEventListener('click', () => div.remove());
    cloneBtn && cloneBtn.addEventListener('click', () => {
      const clonedData = {
        text: div.querySelector('.q-text').value,
        choices: Array.from(div.querySelectorAll('.q-choice')).map(i => i.value),
        correctIndex: Number(correctSelect.value)
      };
      qArea.appendChild(createQuestionBlock(clonedData));
    });

    if (prefill && typeof prefill.correctIndex !== 'undefined') correctSelect.value = String(prefill.correctIndex);
    qArea.appendChild(div);
    return div;
  }

  // create initial question if area is empty
  if (qArea && qArea.children.length === 0) createQuestionBlock();

  if (addQuestionBtn) addQuestionBtn.addEventListener('click', () => createQuestionBlock());

  if (saveQuizBtn) saveQuizBtn.addEventListener('click', () => {
    const titleEl = document.getElementById('quizTitle');
    const descEl = document.getElementById('quizDesc');
    const title = titleEl ? titleEl.value.trim() : '';
    const desc = descEl ? descEl.value.trim() : '';

    if (!title) return showAlert('Please provide a quiz title.');

    const blocks = qArea ? Array.from(qArea.querySelectorAll('.question-block')) : [];
    if (!blocks.length) return showAlert('Add at least one question.');

    const questions = [];
    for (const b of blocks) {
      const text = (b.querySelector('.q-text')?.value || '').trim();
      const choices = Array.from(b.querySelectorAll('.q-choice')).map(c => (c.value || '').trim());
      const correctIndex = Number(b.querySelector('.q-correct')?.value || 0);

      if (!text) return showAlert('Every question must have text.');
      if (choices.some(c => !c)) return showAlert('All choices must be filled.');
      if (!(correctIndex >= 0 && correctIndex <= 3)) return showAlert('Correct option index invalid.');

      questions.push({ id: genId('q'), text, choices, correctIndex });
    }

    const quizzes = loadJSON(STORAGE.quizzes);
    const newQuiz = {
      id: genId('quiz'),
      creatorId: current.id,
      title,
      description: desc,
      questions,
      createdAt: new Date().toISOString()
    };
    quizzes.push(newQuiz);
    saveJSON(STORAGE.quizzes, quizzes);

    // generate share link (relative)
    let rel = `./home.html?take=${newQuiz.id}`;
    try {
      if (location.protocol.startsWith('http')) rel = location.origin + location.pathname.replace(/[^\/]*$/, '') + `home.html?take=${newQuiz.id}`;
    } catch (e) { /* ignore */ }

    if (shareLinkInput) {
      shareLinkInput.value = rel;
      shareArea.style.display = 'flex';
      shareArea.style.alignItems = 'center';
    }
    renderQuizzes();
    populateScoresSelect();
    showAlert('Quiz saved! Shareable link generated below.');
  });

  if (copyLinkBtn) copyLinkBtn.addEventListener('click', async () => {
    const text = document.getElementById('shareLink')?.value || '';
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      copyLinkBtn.textContent = 'Copied';
      setTimeout(() => copyLinkBtn.textContent = 'Copy Link', 1400);
    } catch (e) {
      showAlert('Copy failed; manual copy required.');
    }
  });

  // ---------- Render quizzes list ----------
  const myQuizzesList = document.getElementById('myQuizzesList');
  function renderQuizzes() {
    if (!myQuizzesList) return;
    const allQuizzes = loadJSON(STORAGE.quizzes);
    const mine = allQuizzes.filter(q => q.creatorId === current.id);
    if (!mine.length) {
      myQuizzesList.innerHTML = `<div class="glass card">You have no quizzes yet. Create one from the Create Quiz tab.</div>`;
      return;
    }
    myQuizzesList.innerHTML = mine.map(q => `
      <div class="quiz-tile">
        <div>
          <div style="font-weight:700">${escapeHtml(q.title)}</div>
          <div class="small muted">${escapeHtml(q.description || '')}</div>
          <div class="small muted">Created: ${new Date(q.createdAt).toLocaleString()}</div>
        </div>
        <div style="display:flex; gap:8px; align-items:center">
          <button class="btn ghost openQuiz" data-id="${q.id}">Open</button>
          <button class="btn ghost copyQuiz" data-id="${q.id}">Copy Link</button>
        </div>
      </div>
    `).join('');
    // attach events
    myQuizzesList.querySelectorAll('.openQuiz').forEach(b => b.addEventListener('click', () => openQuizAsParticipant(b.dataset.id)));
    myQuizzesList.querySelectorAll('.copyQuiz').forEach(b => b.addEventListener('click', () => {
      const qid = b.dataset.id;
      let rel = `./home.html?take=${qid}`;
      try {
        if (location.protocol.startsWith('http')) rel = location.origin + location.pathname.replace(/[^\/]*$/, '') + `home.html?take=${qid}`;
      } catch (e) {}
      navigator.clipboard.writeText(rel).then(() => { b.textContent = 'Copied'; setTimeout(() => b.textContent = 'Copy Link', 1200); }).catch(() => prompt('Copy this link', rel));
    }));
  }
  renderQuizzes();

  // ---------- Scores (leaderboard) ----------
  const scoresSelect = document.getElementById('scoresQuizSelect');
  const leaderboard = document.getElementById('leaderboard');
  const exportCsvBtn = document.getElementById('exportCsv');
  function populateScoresSelect() {
    if (!scoresSelect) return;
    const quizzes = loadJSON(STORAGE.quizzes).filter(q => q.creatorId === current.id);
    scoresSelect.innerHTML = `<option value="">Select a quiz</option>` + quizzes.map(q => `<option value="${q.id}">${escapeHtml(q.title)}</option>`).join('');
  }
  populateScoresSelect();

  if (scoresSelect) scoresSelect.addEventListener('change', () => {
    const qid = scoresSelect.value;
    if (!qid) { if (leaderboard) leaderboard.innerHTML = `<div class="small muted">Select a quiz to see results</div>`; return; }
    const allResults = loadJSON(STORAGE.results);
    const results = allResults.filter(r => r.quizId === qid);
    if (!results.length) { if (leaderboard) leaderboard.innerHTML = `<div class="small muted">No participants yet.</div>`; return; }
    results.sort((a, b) => b.score - a.score);
    if (leaderboard) {
      leaderboard.innerHTML = results.map(r => `
        <div class="leader-row">
          <div>
            <div style="font-weight:700">${escapeHtml(r.participantName)} ${r.participantEmail ? `<div class="small muted">${escapeHtml(r.participantEmail)}</div>` : ''}</div>
            <div class="small muted">${new Date(r.takenAt).toLocaleString()}</div>
          </div>
          <div style="font-weight:700">${r.score} / ${r.total}</div>
        </div>
      `).join('');
    }
  });

  if (exportCsvBtn) exportCsvBtn.addEventListener('click', () => {
    const qid = scoresSelect?.value;
    if (!qid) return showAlert('Select a quiz first.');
    const rows = [['Name','Email','Score','Total','TakenAt','Answers']];
    const results = loadJSON(STORAGE.results).filter(r => r.quizId === qid);
    results.forEach(r => rows.push([r.participantName || '', r.participantEmail || '', r.score, r.total, r.takenAt, JSON.stringify(r.answers || [])]));
    if (rows.length <= 1) return showAlert('No results to export.');
    const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `quiz_${qid}_results.csv`; a.click();
    URL.revokeObjectURL(url);
  });

  // ---------- Modal / Take Quiz ----------
  const quizModal = document.getElementById('quizModal');
  const modalQuizTitle = document.getElementById('modalQuizTitle');
  const modalQuizDesc = document.getElementById('modalQuizDesc');
  const questionCard = document.getElementById('questionCard');
  const prevQBtn = document.getElementById('prevQ');
  const nextQBtn = document.getElementById('nextQ');
  const submitQuizBtn = document.getElementById('submitQuiz');
  const curQEl = document.getElementById('curQ');
  const totQEl = document.getElementById('totQ');
  const resultPanel = document.getElementById('resultPanel');
  const finalScoreTitle = document.getElementById('finalScoreTitle');
  const finalScoreMsg = document.getElementById('finalScoreMsg');
  const saveResultBtnEl = document.getElementById('saveResultBtn');
  const participantNameInput = document.getElementById('participantName');
  const participantEmailInput = document.getElementById('participantEmail');
  const closeModalBtn = document.getElementById('closeModal');
  const closeResultBtn = document.getElementById('closeResultBtn');

  let activeQuiz = null, answers = [], currentIndex = 0, computedScore = 0;

  function openQuizAsParticipant(quizId) {
    const quiz = loadJSON(STORAGE.quizzes).find(q => q.id === quizId);
    if (!quiz) { showAlert('Quiz not found'); return; }
    activeQuiz = quiz;
    modalQuizTitle.textContent = quiz.title;
    modalQuizDesc.textContent = quiz.description || '';
    answers = Array(quiz.questions.length).fill(null);
    currentIndex = 0;
    computedScore = 0;
    resultPanel.style.display = 'none';
    document.getElementById('modalBody').style.display = 'block';
    renderQuestion();
    if (quizModal) quizModal.style.display = 'flex';
  }

  // attach open from share link on page load if ?take=ID present
  (function handleUrlTake() {
    try {
      const url = new URL(window.location.href);
      const takeId = url.searchParams.get('take');
      if (takeId) openQuizAsParticipant(takeId);
    } catch (e) { /* ignore */ }
  })();

  function renderQuestion() {
    if (!activeQuiz) return;
    const q = activeQuiz.questions[currentIndex];
    if (!q) return;
    curQEl.textContent = currentIndex + 1;
    totQEl.textContent = activeQuiz.questions.length;
    questionCard.innerHTML = `
      <div style="font-weight:700; font-size:16px">${escapeHtml(q.text)}</div>
      <div style="margin-top:10px">
        ${q.choices.map((c,i) => `
          <div style="margin-top:8px">
            <label style="cursor:pointer">
              <input type="radio" name="choice" value="${i}" ${answers[currentIndex] === i ? 'checked' : ''} />
              <span style="margin-left:10px">${escapeHtml(c)}</span>
            </label>
          </div>
        `).join('')}
      </div>
    `;
    prevQBtn.style.display = currentIndex === 0 ? 'none' : 'inline-block';
    nextQBtn.style.display = currentIndex === activeQuiz.questions.length - 1 ? 'none' : 'inline-block';
    submitQuizBtn.style.display = currentIndex === activeQuiz.questions.length - 1 ? 'inline-block' : 'none';

    // radio handlers
    questionCard.querySelectorAll('input[name="choice"]').forEach(inp => {
      inp.addEventListener('change', e => {
        answers[currentIndex] = Number(e.target.value);
      });
    });
  }

  if (prevQBtn) prevQBtn.addEventListener('click', () => { if (currentIndex > 0) { currentIndex--; renderQuestion(); } });
  if (nextQBtn) nextQBtn.addEventListener('click', () => { if (currentIndex < activeQuiz.questions.length - 1) { currentIndex++; renderQuestion(); } });
  if (submitQuizBtn) submitQuizBtn.addEventListener('click', () => {
    const total = activeQuiz.questions.length;
    let score = 0;
    for (let i = 0; i < total; i++) {
      if (answers[i] === Number(activeQuiz.questions[i].correctIndex)) score++;
    }
    computedScore = score;
    document.getElementById('modalBody').style.display = 'none';
    resultPanel.style.display = 'block';
    finalScoreTitle.textContent = `Score: ${score} / ${total}`;
    finalScoreMsg.textContent = 'Enter your name to save the result for the creator.';
  });

  if (saveResultBtnEl) saveResultBtnEl.addEventListener('click', () => {
    const name = (participantNameInput?.value || '').trim();
    const email = (participantEmailInput?.value || '').trim();
    if (!name) return showAlert('Enter your name to save');
    const allResults = loadJSON(STORAGE.results);
    allResults.push({
      quizId: activeQuiz.id,
      participantName: name,
      participantEmail: email || null,
      score: computedScore,
      total: activeQuiz.questions.length,
      answers,
      takenAt: new Date().toISOString()
    });
    saveJSON(STORAGE.results, allResults);
    // refresh leaderboard if same quiz is selected
    if (scoresSelect && scoresSelect.value === activeQuiz.id) scoresSelect.dispatchEvent(new Event('change'));
    showAlert('Result saved. Thank you!');
    participantNameInput.value = participantEmailInput.value = '';
    if (quizModal) quizModal.style.display = 'none';
  });

  if (closeModalBtn) closeModalBtn.addEventListener('click', () => { if (quizModal) quizModal.style.display = 'none'; });
  if (closeResultBtn) closeResultBtn.addEventListener('click', () => { if (quizModal) quizModal.style.display = 'none'; });
}

// ---------- small helper ----------
function escapeHtml(s = '') {
  return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

// ---------- Initialize all relevant flows ----------
document.addEventListener('DOMContentLoaded', () => {
  initRegistration();
  initLogin();
  initHome();
});

// ---------- initLogin is small wrapper calling initLogin defined above ----------
function initLogin() {
  // wrapper to not conflict naming earlier
  const form = document.getElementById('loginForm');
  if (!form) return;
  // login logic is in top-level initLogin from above; but to ensure both run, call the function that registers login handler:
  // Re-run the login setup here for robustness (same effect)
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const email = firstExistingIdValue(['loginEmail','email','loginMail']);
    const password = firstExistingIdValue(['loginPassword','password','loginPass']);
    if (!email || !password) { showAlert('Please enter email & password.'); return; }
    const users = loadJSON(STORAGE.users);
    const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) { showAlert('Invalid credentials.'); return; }
    setCurrentUser(user);
    showAlert('Login successful');
    window.location.href = 'home.html';
  });
}
