const HOBBIES = [
    'Настольные игры','Походы','Фотография','Рисование','Бег','Йога',
    'Велосипед','Книги','Кино','Музыка','Видеоигры','Кулинария',
    'Танцы','Плавание','Теннис','Волейбол','Футбол','Шахматы',
    'Рукоделие','Изучение языков'
];

const SEED = {
    users: [
        {id:1,username:'анна',email:'anna@test.com',password:'123',city:'Москва',bio:'Люблю кино и настолки',hobbies:[4,9]},
        {id:2,username:'дима',email:'dima@test.com',password:'123',city:'Москва',bio:'Фотограф, ищу компанию для походов',hobbies:[3,2]},
        {id:3,username:'лена',email:'lena@test.com',password:'123',city:'СПб',bio:'Бегаю по утрам и пеку торты',hobbies:[5,12]},
        {id:4,username:'петр',email:'petr@test.com',password:'123',city:'Казань',bio:'Игроман и книжный червь',hobbies:[11,8]},
        {id:5,username:'юля',email:'yulia@test.com',password:'123',city:'Москва',bio:'Йога и рисование — моя жизнь',hobbies:[6,4]}
    ],
    events: [
        {id:1,title:'Вечер настольных игр',desc:'Приносите свои любимые игры, будет чай и печеньки. Ждём всех!',date:'2026-05-29T18:00',loc:'Москва, ул. Тверская 15',creator:1,hobbies:[1],max_p:10,participants:[1]},
        {id:2,title:'Фотопрогулка по центру',desc:'Ищем красивые локации и учимся снимать на любой фотоаппарат.',date:'2026-05-31T18:00',loc:'Москва, Красная площадь',creator:2,hobbies:[3,2],max_p:null,participants:[2]},
        {id:3,title:'Утренняя пробежка в парке',desc:'5 км по живописному маршруту. Темп средний, новичков поддержим.',date:'2026-05-27T18:00',loc:'СПб, Парк Горького',creator:3,hobbies:[5],max_p:15,participants:[3]},
        {id:4,title:'Игровой вечер за консолями',desc:'Mario Kart, FIFA, Mortal Kombat — кто круче?',date:'2026-06-02T18:00',loc:'Казань, пр. Победы 50',creator:4,hobbies:[11],max_p:8,participants:[4]},
        {id:5,title:'Йога на закате',desc:'Занятие на открытом воздухе. Берите коврики и хорошее настроение.',date:'2026-05-28T18:00',loc:'Москва, Воробьёвы горы',creator:5,hobbies:[6],max_p:20,participants:[5]}
    ]
};

let DB = { users: [], events: [], nextUserId: 6, nextEventId: 6, currentUser: null };

function initDB() {
    const saved = localStorage.getItem('hobbymate_db');
    if (saved) {
        DB = JSON.parse(saved);
        DB.currentUser = null;
    } else {
        DB.users = SEED.users.map(u => ({...u}));
        DB.events = SEED.events.map(e => ({...e, participants: [...e.participants]}));
        DB.nextUserId = 6;
        DB.nextEventId = 6;
    }
    saveDB();
}

function saveDB() {
    const toSave = {...DB, currentUser: null};
    localStorage.setItem('hobbymate_db', JSON.stringify(toSave));
}

function flash(msg, type) {
    const c = document.getElementById('flashContainer');
    c.innerHTML = `<div class="flash ${type}">${msg}</div>`;
    setTimeout(() => c.innerHTML = '', 3000);
}

function authLinks() {
    const el = document.getElementById('authLinks');
    if (DB.currentUser) {
        el.innerHTML = `<a href="#" onclick="navigate('dashboard')">${DB.currentUser.username}</a> <a href="#" onclick="logout()">Выйти</a>`;
    } else {
        el.innerHTML = `<a href="#" onclick="navigate('login')">Войти</a> <a href="#" onclick="navigate('register')" class="btn-primary">Регистрация</a>`;
    }
}

function navigate(page) {
    window.location.hash = page ? '#' + page : '#/';
}

function findUser(id) { return DB.users.find(u => u.id === id); }
function findEvent(id) { return DB.events.find(e => e.id === id); }
function hobbyName(id) { return HOBBIES[id-1]; }

function render() {
    const app = document.getElementById('app');
    app.innerHTML = '';
    const hash = window.location.hash.slice(1) || '/';
    const parts = hash.split('/');
    const page = parts[0] || '';
    authLinks();
    if (page === '' || page === '/') renderHome(app);
    else if (page === 'events' && parts[1] === 'create') renderCreateEvent(app);
    else if (page === 'events') renderEvents(app);
    else if (page === 'event') renderEventDetail(app, parseInt(parts[1]));
    else if (page === 'people') renderPeople(app);
    else if (page === 'profile') renderProfile(app, parseInt(parts[1]));
    else if (page === 'login') renderLogin(app);
    else if (page === 'register') renderRegister(app);
    else if (page === 'dashboard') renderDashboard(app);
    else renderHome(app);
}

function eventCard(e) {
    const u = findUser(e.creator);
    const d = new Date(e.date);
    return `<div class="card" onclick="navigate('event/${e.id}')">
        <h3>${e.title}</h3>
        <div class="meta">${d.toLocaleDateString('ru-RU')} в ${d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})} · ${e.loc}${e.max_p ? ` · ${e.participants.length}/${e.max_p}` : ''}</div>
        <div class="meta">Организатор: ${u ? u.username : '—'}</div>
        <div class="tags">${e.hobbies.map(h => `<span class="tag">${hobbyName(h)}</span>`).join('')}</div>
    </div>`;
}

function renderHome(app) {
    app.innerHTML = `
        <div class="hero">
            <h1>Найди компанию по душе</h1>
            <p>HobbyMate помогает найти людей с твоими интересами и создавать совместные мероприятия</p>
            ${!DB.currentUser ? `<a href="#" onclick="navigate('register')" class="btn-primary" style="padding:12px 32px;font-size:18px;text-decoration:none;">Присоединиться</a>` : ''}
            <div class="stats">
                <div class="stat-item"><div class="stat-number">${DB.users.length}</div><div class="stat-label">пользователей</div></div>
                <div class="stat-item"><div class="stat-number">${DB.events.length}</div><div class="stat-label">ивентов</div></div>
                <div class="stat-item"><div class="stat-number">${HOBBIES.length}</div><div class="stat-label">хобби</div></div>
            </div>
        </div>
        <h2>Ближайшие ивенты</h2>
        <div class="card-grid">${DB.events.length ? DB.events.slice(-6).reverse().map(e => eventCard(e)).join('') : '<div class="empty-state"><h3>Пока нет ивентов</h3></div>'}</div>`;
}

function renderEvents(app) {
    let hobbyF = new URLSearchParams(window.location.search).get('hobby') || '';
    let cityF = new URLSearchParams(window.location.search).get('city') || '';
    let list = DB.events;
    if (hobbyF) list = list.filter(e => e.hobbies.includes(parseInt(hobbyF)));
    if (cityF) list = list.filter(e => e.loc.toLowerCase().includes(cityF.toLowerCase()));
    app.innerHTML = `
        <h2>Ивенты</h2>
        <div class="filters">
            <select id="fhobby"><option value="">Все хобби</option>${HOBBIES.map((h,i) => `<option value="${i+1}" ${hobbyF == i+1 ? 'selected' : ''}>${h}</option>`).join('')}</select>
            <input type="text" id="fcity" placeholder="Город" value="${cityF}">
            <button class="btn-sm" onclick="applyEventFilters()">Поиск</button>
            ${DB.currentUser ? `<a href="#" onclick="navigate('events/create')" class="btn-primary btn-sm" style="text-decoration:none;">+ Создать ивент</a>` : ''}
        </div>
        <div class="card-grid">${list.length ? list.slice().reverse().map(e => eventCard(e)).join('') : '<div class="empty-state"><h3>Ничего не найдено</h3><p>Попробуй изменить фильтры</p></div>'}</div>`;
}

function renderCreateEvent(app) {
    if (!DB.currentUser) { flash('Войди, чтобы создать ивент', 'error'); navigate('login'); return; }
    app.innerHTML = `
        <div class="hero"><h2>Создать ивент</h2><p style="font-size:16px;color:#666;">Пригласи людей на встречу по интересам</p></div>
        <form class="wide" onsubmit="createEventSubmit(event)">
            <label>Название</label><input type="text" id="etitle" required placeholder="Вечер настольных игр">
            <label>Описание</label><textarea id="edesc" placeholder="Опиши, что планируется..."></textarea>
            <label>Дата и время</label><input type="datetime-local" id="edate" required>
            <label>Место</label><input type="text" id="eloc" required placeholder="Москва, ул. Тверская 15">
            <label>Макс. участников (пусто = без лимита)</label><input type="number" id="emax" min="2" placeholder="10">
            <label>Категории</label><div class="hobbies-grid">${HOBBIES.map((h,i) => `<label class="hobby-check"><input type="checkbox" value="${i+1}">${h}</label>`).join('')}</div>
            <button>Создать ивент</button>
        </form>`;
}

function createEventSubmit(e) {
    e.preventDefault();
    const title = document.getElementById('etitle').value;
    const desc = document.getElementById('edesc').value;
    const date = document.getElementById('edate').value;
    const loc = document.getElementById('eloc').value;
    const max = document.getElementById('emax').value;
    const hobbies = [...document.querySelectorAll('.hobby-check input:checked')].map(el => parseInt(el.value));
    if (!hobbies.length) { flash('Выбери хотя бы одну категорию', 'error'); return; }
    const ev = {
        id: DB.nextEventId++, title, desc, date, loc,
        creator: DB.currentUser.id, max_p: max ? parseInt(max) : null,
        hobbies, participants: [DB.currentUser.id]
    };
    DB.events.push(ev);
    saveDB(); flash('Ивент создан!', 'success'); navigate('event/' + ev.id);
}

function applyEventFilters() {
    window.location.search = `?hobby=${document.getElementById('fhobby').value}&city=${document.getElementById('fcity').value}`;
}

function renderEventDetail(app, id) {
    const e = findEvent(id);
    if (!e) { app.innerHTML = '<div class="empty-state"><h3>Ивент не найден</h3></div>'; return; }
    const u = findUser(e.creator);
    const d = new Date(e.date);
    const isPart = DB.currentUser && e.participants.includes(DB.currentUser.id);
    const isFull = e.max_p && e.participants.length >= e.max_p;
    app.innerHTML = `
        <div class="event-detail">
            <div class="tags" style="margin-bottom:12px;">${e.hobbies.map(h => `<span class="tag">${hobbyName(h)}</span>`).join('')}</div>
            <h1>${e.title}</h1>
            <p style="color:#888;">Организатор: <a href="#" onclick="navigate('profile/${e.creator}')" style="color:#6c5ce7;">${u ? u.username : '—'}</a></p>
            <div class="event-info">
                <p><strong>Дата:</strong> ${d.toLocaleDateString('ru-RU')} в ${d.toLocaleTimeString('ru-RU',{hour:'2-digit',minute:'2-digit'})}</p>
                <p><strong>Место:</strong> ${e.loc}</p>
                <p><strong>Участники:</strong> ${e.participants.length}${e.max_p ? ' / ' + e.max_p : ''}</p>
            </div>
            ${e.desc ? `<div style="margin:20px 0;"><strong>Описание:</strong><p>${e.desc}</p></div>` : ''}
            ${e.participants.length ? `<div style="margin:20px 0;"><strong>Участники:</strong><ul class="participants-list">${e.participants.map(pid => { const pu=findUser(pid); return `<li><a href="#" onclick="navigate('profile/${pid}')">${pu?pu.username:'—'}</a></li>`;}).join('')}</ul></div>` : ''}
            <div class="event-actions">
                ${DB.currentUser ? (isPart ? `<button class="btn-sm btn-outline" onclick="leaveEvent(${e.id})">Отписаться</button>`
                    : isFull ? `<button class="btn-sm" style="background:#ccc;" disabled>Мест нет</button>`
                    : `<button class="btn-sm" onclick="joinEvent(${e.id})">Участвовать</button>`)
                : '<p style="color:#888;">Войди, чтобы записаться</p>'}
                ${DB.currentUser && DB.currentUser.id === e.creator ? `<button class="btn-sm btn-danger" onclick="deleteEvent(${e.id})">Удалить ивент</button>` : ''}
            </div>
        </div>`;
}

function joinEvent(id) {
    const e = findEvent(id);
    if (!e || !DB.currentUser) return;
    if (e.participants.includes(DB.currentUser.id)) { flash('Вы уже записаны', 'info'); return; }
    if (e.max_p && e.participants.length >= e.max_p) { flash('Лимит участников', 'error'); return; }
    e.participants.push(DB.currentUser.id);
    saveDB(); flash('Вы записаны!', 'success'); render();
}

function leaveEvent(id) {
    const e = findEvent(id);
    if (!e || !DB.currentUser) return;
    e.participants = e.participants.filter(p => p !== DB.currentUser.id);
    saveDB(); flash('Вы отписались', 'info'); render();
}

function deleteEvent(id) {
    if (!confirm('Удалить ивент?')) return;
    DB.events = DB.events.filter(ev => ev.id !== id);
    saveDB(); flash('Ивент удалён', 'info'); navigate('events');
}

function renderPeople(app) {
    let hobbyF = new URLSearchParams(window.location.search).get('hobby') || '';
    let cityF = new URLSearchParams(window.location.search).get('city') || '';
    let list = DB.users;
    if (hobbyF) list = list.filter(u => u.hobbies.includes(parseInt(hobbyF)));
    if (cityF) list = list.filter(u => u.city.toLowerCase().includes(cityF.toLowerCase()));
    app.innerHTML = `
        <h2>Люди</h2>
        <div class="filters">
            <select id="phobby"><option value="">Все хобби</option>${HOBBIES.map((h,i) => `<option value="${i+1}" ${hobbyF==i+1?'selected':''}>${h}</option>`).join('')}</select>
            <input type="text" id="pcity" placeholder="Город" value="${cityF}">
            <button class="btn-sm" onclick="applyPeopleFilters()">Поиск</button>
        </div>
        <div class="card-grid">${list.length ? list.map(u => `
            <div class="card" onclick="navigate('profile/${u.id}')" style="display:flex;gap:16px;align-items:center;">
                <div class="avatar-sm">${u.username[0].toUpperCase()}</div>
                <div>
                    <h3 style="margin-bottom:4px;">${u.username}</h3>
                    <p style="color:#888;font-size:13px;">${u.city || 'Город не указан'}</p>
                    <div class="tags">${u.hobbies.map(h => `<span class="tag-sm">${hobbyName(h)}</span>`).join('')}</div>
                </div>
            </div>`).join('') : '<div class="empty-state"><h3>Никого не найдено</h3><p>Попробуй изменить фильтры</p></div>'}
        </div>`;
}

function applyPeopleFilters() {
    window.location.search = `?hobby=${document.getElementById('phobby').value}&city=${document.getElementById('pcity').value}`;
}

function renderProfile(app, id) {
    const u = findUser(id);
    if (!u) { app.innerHTML = '<div class="empty-state"><h3>Пользователь не найден</h3></div>'; return; }
    const created = DB.events.filter(e => e.creator === id);
    app.innerHTML = `
        <div class="profile-header">
            <div class="avatar">${u.username[0].toUpperCase()}</div>
            <div>
                <h1>${u.username}</h1>
                <p style="color:#888;">${u.city || 'Город не указан'}</p>
                ${u.bio ? `<p>${u.bio}</p>` : ''}
                <div class="tags" style="margin-top:12px;">${u.hobbies.map(h => `<span class="tag">${hobbyName(h)}</span>`).join('')}</div>
            </div>
        </div>
        <h2>Созданные ивенты</h2>
        <div class="card-grid">${created.length ? created.slice().reverse().map(e => eventCard(e)).join('') : '<div class="empty-state"><h3>Пока нет ивентов</h3></div>'}</div>`;
}

function renderLogin(app) {
    if (DB.currentUser) { navigate(''); return; }
    app.innerHTML = `
        <div class="hero"><h2>Вход</h2><p style="font-size:16px;color:#666;">С возвращением!</p></div>
        <form onsubmit="loginSubmit(event)">
            <label>Email</label><input type="email" id="lemail" required>
            <label>Пароль</label><input type="password" id="lpass" required>
            <button>Войти</button>
            <p style="text-align:center;margin-top:16px;font-size:14px;color:#888;">Нет аккаунта? <a href="#" onclick="navigate('register')" style="color:#6c5ce7;">Зарегистрироваться</a></p>
        </form>`;
}

function loginSubmit(e) {
    e.preventDefault();
    const u = DB.users.find(x => x.email === document.getElementById('lemail').value && x.password === document.getElementById('lpass').value);
    if (!u) { flash('Неверный email или пароль', 'error'); return; }
    DB.currentUser = u;
    saveDB(); flash('Вы вошли!', 'success'); navigate('');
}

function renderRegister(app) {
    if (DB.currentUser) { navigate(''); return; }
    app.innerHTML = `
        <div class="hero"><h2>Регистрация</h2><p style="font-size:16px;color:#666;">Создай аккаунт и найди единомышленников</p></div>
        <form onsubmit="registerSubmit(event)">
            <label>Имя пользователя</label><input type="text" id="ruser" required>
            <label>Email</label><input type="email" id="remail" required>
            <label>Пароль</label><input type="password" id="rpass" required minlength="3">
            <label>Город</label><input type="text" id="rcity" placeholder="Москва">
            <label>О себе</label><textarea id="rbio" placeholder="Расскажи про свои увлечения..."></textarea>
            <label>Твои хобби</label><div class="hobbies-grid">${HOBBIES.map((h,i) => `<label class="hobby-check"><input type="checkbox" value="${i+1}">${h}</label>`).join('')}</div>
            <button>Зарегистрироваться</button>
            <p style="text-align:center;margin-top:16px;font-size:14px;color:#888;">Уже есть аккаунт? <a href="#" onclick="navigate('login')" style="color:#6c5ce7;">Войти</a></p>
        </form>`;
}

function registerSubmit(e) {
    e.preventDefault();
    const username = document.getElementById('ruser').value;
    const email = document.getElementById('remail').value;
    const pass = document.getElementById('rpass').value;
    const city = document.getElementById('rcity').value;
    const bio = document.getElementById('rbio').value;
    const hobbies = [...document.querySelectorAll('.hobby-check input:checked')].map(el => parseInt(el.value));
    if (!hobbies.length) { flash('Выбери хотя бы одно хобби', 'error'); return; }
    if (DB.users.find(x => x.email === email)) { flash('Email уже используется', 'error'); return; }
    if (DB.users.find(x => x.username === username)) { flash('Логин уже занят', 'error'); return; }
    const u = {id: DB.nextUserId++, username, email, password: pass, city, bio, hobbies};
    DB.users.push(u);
    DB.currentUser = u;
    saveDB(); flash('Регистрация успешна!', 'success'); navigate('');
}

function renderDashboard(app) {
    if (!DB.currentUser) { flash('Войди в систему', 'error'); navigate('login'); return; }
    const created = DB.events.filter(e => e.creator === DB.currentUser.id);
    const joined = DB.events.filter(e => e.participants.includes(DB.currentUser.id) && e.creator !== DB.currentUser.id);
    app.innerHTML = `
        <h2>Мои ивенты</h2>
        <div class="dash-links">
            <a href="#" onclick="navigate('events/create')" class="btn-primary btn-sm" style="text-decoration:none;">+ Создать ивент</a>
            <a href="#" onclick="navigate('register')" class="btn-outline btn-sm" style="text-decoration:none;">Редактировать профиль</a>
        </div>
        <h3>Созданные мной (${created.length})</h3>
        <div class="card-grid">${created.length ? created.slice().reverse().map(e => eventCard(e)).join('') : '<div class="empty-state"><p>Ты ещё не создавал ивенты</p></div>'}</div>
        <h3>Куда записан(а) (${joined.length})</h3>
        <div class="card-grid">${joined.length ? joined.slice().reverse().map(e => eventCard(e)).join('') : '<div class="empty-state"><p>Ты пока никуда не записан(а)</p></div>'}</div>`;
}

function logout() {
    DB.currentUser = null;
    saveDB(); flash('Вы вышли', 'info'); navigate('');
}

initDB();
window.addEventListener('hashchange', render);
render();
