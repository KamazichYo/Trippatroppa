// Описания всех зданий: стоимость, содержание, вместимость, производство и потребление ресурсов.

export const RANKS = [
  { name: 'Деревня', pop: 0, gift: 0 },
  { name: 'Село', pop: 250, gift: 5000 },
  { name: 'Посёлок', pop: 900, gift: 10000 },
  { name: 'Городок', pop: 2500, gift: 20000 },
  { name: 'Город', pop: 7000, gift: 40000 },
  { name: 'Крупный город', pop: 20000, gift: 80000 },
  { name: 'Мегаполис', pop: 60000, gift: 150000 },
];

// Ресурсы города
export const RES = {
  power: { name: 'Электричество', unit: 'кВт', icon: '⚡', color: 0xf2d13a },
  water: { name: 'Вода', unit: 'м³', icon: '💧', color: 0x3a9ae8 },
  gas: { name: 'Газ', unit: 'м³', icon: '🔥', color: 0x6ad0f0 },
  heat: { name: 'Отопление', unit: 'Гкал', icon: '♨', color: 0xe86a3a },
  sewage: { name: 'Канализация', unit: 'м³', icon: '🚽', color: 0x8a6a3a },
  garbage: { name: 'Вывоз мусора', unit: 'т', icon: '🗑', color: 0x7a8a5a },
};

// Потребление на одного жителя/работника по зонам и плотности.
// heat — только в холодный сезон (умножается на сезонный коэффициент).
export const USE = {
  R1: { power: 0.25, water: 0.3, gas: 0.3, heat: 0, sewage: 0, garbage: 0.15 }, // печь/котёл и септик
  R2: { power: 0.25, water: 0.35, gas: 0.15, heat: 0.35, sewage: 0.32, garbage: 0.2 },
  R3: { power: 0.3, water: 0.35, gas: 0.12, heat: 0.35, sewage: 0.33, garbage: 0.22 },
  C1: { power: 0.4, water: 0.2, gas: 0.1, heat: 0, sewage: 0, garbage: 0.4 },
  C2: { power: 0.45, water: 0.2, gas: 0.05, heat: 0.3, sewage: 0.18, garbage: 0.4 },
  C3: { power: 0.55, water: 0.25, gas: 0.02, heat: 0.3, sewage: 0.22, garbage: 0.35 },
  I1: { power: 0.6, water: 0.3, gas: 0.3, heat: 0, sewage: 0.2, garbage: 0.5 },
  I2: { power: 0.8, water: 0.5, gas: 0.4, heat: 0.15, sewage: 0.45, garbage: 0.6 },
  I3: { power: 1.0, water: 0.7, gas: 0.5, heat: 0.15, sewage: 0.6, garbage: 0.7 },
  A1: { power: 0.2, water: 0.8, gas: 0.05, heat: 0, sewage: 0, garbage: 0.1 },
};

export const ZONES = {
  R: { name: 'Жилая', color: 0x4caf50, short: 'Ж' },
  C: { name: 'Коммерческая', color: 0x3f8fe0, short: 'К' },
  I: { name: 'Промышленная', color: 0xe0b030, short: 'П' },
  A: { name: 'Сельхоз', color: 0xb07a3a, short: 'С' },
};
export const DENS = ['', 'низкая', 'средняя', 'высокая'];
export const ZONE_TOOLS = [
  { zone: 'R', dens: 1, rank: 0, cost: 5 }, { zone: 'R', dens: 2, rank: 3, cost: 10 }, { zone: 'R', dens: 3, rank: 4, cost: 20 },
  { zone: 'C', dens: 1, rank: 1, cost: 5 }, { zone: 'C', dens: 2, rank: 3, cost: 10 }, { zone: 'C', dens: 3, rank: 4, cost: 20 },
  { zone: 'I', dens: 1, rank: 1, cost: 5 }, { zone: 'I', dens: 2, rank: 3, cost: 10 }, { zone: 'I', dens: 3, rank: 4, cost: 20 },
  { zone: 'A', dens: 1, rank: 0, cost: 3 },
];

const Z = (id, name, zone, dens, lvl, cap, size = 1, extra = {}) => ({ id, name, zone, dens, lvl, cap, size, kind: 'zone', ...extra });

export const ZONE_BUILDINGS = [
  // --- жилые, низкая плотность ---
  Z('r1_izba', 'Изба', 'R', 1, 1, 4),
  Z('r1_house', 'Частный дом', 'R', 1, 1, 5),
  Z('r1_dacha', 'Дача', 'R', 1, 1, 3),
  Z('r1_brick', 'Кирпичный дом', 'R', 1, 2, 6),
  Z('r1_duplex', 'Дом на две семьи', 'R', 1, 2, 9),
  Z('r1_cottage', 'Коттедж', 'R', 1, 3, 7),
  // --- жилые, средняя ---
  Z('r2_barrack', 'Двухэтажный барак', 'R', 2, 1, 24),
  Z('r2_khrush', 'Хрущёвка', 'R', 2, 1, 60),
  Z('r2_brick4', 'Кирпичная четырёхэтажка', 'R', 2, 2, 48),
  Z('r2_town', 'Таунхаус', 'R', 2, 3, 30),
  Z('r2_stalin', 'Сталинка', 'R', 2, 3, 44),
  // --- жилые, высокая ---
  Z('r3_panel9', 'Девятиэтажка', 'R', 3, 1, 150),
  Z('r3_panel12', 'Двенадцатиэтажка', 'R', 3, 2, 190),
  Z('r3_tower16', 'Башня (16 этажей)', 'R', 3, 2, 240),
  Z('r3_elite', 'Элитный дом', 'R', 3, 3, 170),
  Z('r3_long', 'Панельный квартал', 'R', 3, 1, 640, 2),
  Z('r3_complex', 'Жилой комплекс', 'R', 3, 3, 900, 2, { minRank: 5 }),
  // --- коммерция, низкая ---
  Z('c1_kiosk', 'Ларьки', 'C', 1, 1, 3, 1, { tags: ['shop', 'food'] }),
  Z('c1_shop', 'Магазин «Продукты»', 'C', 1, 1, 6, 1, { tags: ['shop'] }),
  Z('c1_cafe', 'Кафе', 'C', 1, 1, 6, 1, { tags: ['food'] }),
  Z('c1_bar', 'Пивбар', 'C', 1, 1, 5, 1, { tags: ['food', 'fun'] }),
  Z('c1_video', 'Видеосалон', 'C', 1, 1, 3, 1, { tags: ['fun'] }),
  Z('c1_pharmacy', 'Аптека', 'C', 1, 2, 4, 1, { tags: ['shop'] }),
  Z('c1_barber', 'Парикмахерская', 'C', 1, 2, 4, 1, { tags: ['shop'] }),
  Z('c1_gas', 'Автозаправка', 'C', 1, 2, 5, 1, { tags: ['shop'] }),
  // --- коммерция, средняя ---
  Z('c2_univ', 'Универсам', 'C', 2, 1, 40, 1, { tags: ['shop'] }),
  Z('c2_market', 'Рынок', 'C', 2, 1, 70, 2, { tags: ['shop', 'food'] }),
  Z('c2_rest', 'Ресторан', 'C', 2, 2, 25, 1, { tags: ['food', 'fun'] }),
  Z('c2_cinema', 'Кинотеатр', 'C', 2, 2, 20, 1, { tags: ['fun'] }),
  Z('c2_hotel', 'Гостиница', 'C', 2, 2, 30, 1),
  Z('c2_dept', 'Универмаг', 'C', 2, 2, 60, 1, { tags: ['shop'] }),
  Z('c2_bank', 'Банк', 'C', 2, 3, 30, 1),
  // --- коммерция, высокая ---
  Z('c3_office', 'Офисный центр', 'C', 3, 2, 220),
  Z('c3_hotel', 'Отель «Интурист»', 'C', 3, 3, 150, 1, { tags: ['food'] }),
  Z('c3_casino', 'Казино', 'C', 3, 3, 80, 1, { tags: ['fun'] }),
  Z('c3_mall', 'Торговый центр', 'C', 3, 2, 320, 2, { tags: ['shop', 'food', 'fun'] }),
  Z('c3_tower', 'Бизнес-башня', 'C', 3, 3, 700, 2, { minRank: 5 }),
  // --- промышленность ---
  Z('i1_workshop', 'Мастерская', 'I', 1, 1, 8, 1, { poll: 2, goods: 1 }),
  Z('i1_garage', 'Автосервис и гаражи', 'I', 1, 1, 8, 1, { poll: 2, goods: 0.8 }),
  Z('i1_sawmill', 'Лесопилка', 'I', 1, 1, 12, 1, { poll: 3, goods: 1.2 }),
  Z('i1_warehouse', 'Склад', 'I', 1, 2, 10, 1, { poll: 1, goods: 0.8 }),
  Z('i2_bakery', 'Хлебозавод', 'I', 2, 1, 60, 1, { poll: 4, food: 1.5, goods: 0.3 }),
  Z('i2_dairy', 'Молокозавод', 'I', 2, 1, 55, 1, { poll: 4, food: 1.4, goods: 0.3 }),
  Z('i2_textile', 'Текстильная фабрика', 'I', 2, 2, 80, 1, { poll: 6, goods: 1.3 }),
  Z('i2_factory', 'Завод', 'I', 2, 2, 100, 1, { poll: 9, goods: 1.5 }),
  Z('i3_steel', 'Металлургический комбинат', 'I', 3, 1, 420, 2, { poll: 30, goods: 1.8 }),
  Z('i3_chem', 'Химический завод', 'I', 3, 2, 320, 2, { poll: 26, goods: 1.8 }),
  Z('i3_auto', 'Автозавод', 'I', 3, 2, 520, 2, { poll: 16, goods: 2 }),
  Z('i3_tech', 'НИИ и технопарк', 'I', 3, 3, 300, 2, { poll: 2, goods: 2.4, edu: 0.5 }),
  // --- сельское хозяйство ---
  Z('a_wheat', 'Поле пшеницы', 'A', 1, 1, 3, 1, { food: 1.6 }),
  Z('a_potato', 'Картофельное поле', 'A', 1, 1, 3, 1, { food: 1.8 }),
  Z('a_sunflower', 'Поле подсолнечника', 'A', 1, 1, 3, 1, { food: 1.5 }),
  Z('a_cows', 'Коровник', 'A', 1, 1, 8, 1, { food: 2, poll: 2 }),
  Z('a_green', 'Теплица', 'A', 1, 2, 6, 1, { food: 2.2 }),
  Z('a_farm', 'Колхозная ферма', 'A', 1, 2, 22, 2, { food: 2.4, poll: 3 }),
];

const P = (id, name, cat, size, rank, cost, upkeep, extra = {}) => ({ id, name, cat, size, rank, cost, upkeep, kind: 'plop', ...extra });

export const PLOP_BUILDINGS = [
  // ---- электричество ----
  P('p_diesel', 'Дизель-генератор', 'power', 1, 0, 1500, 70, { prod: { power: 140 }, poll: 4, jobs: 2, use: { water: 1 }, desc: 'Небольшой и шумный. Питает пару улиц.' }),
  P('p_wind', 'Ветряк', 'power', 1, 1, 1100, 12, { prod: { power: 45 }, wind: true, jobs: 0, desc: 'Чистая энергия, зависит от ветра.' }),
  P('p_coal', 'Угольная ТЭС', 'power', 3, 2, 14000, 450, { prod: { power: 2600 }, poll: 30, jobs: 60, use: { water: 30 }, desc: 'Много энергии, много дыма.' }),
  P('p_gas', 'Газовая ТЭЦ', 'power', 3, 3, 22000, 520, { prod: { power: 1900, heat: 1600 }, needs: { gas: 900 }, poll: 9, jobs: 50, use: { water: 40 }, desc: 'Даёт электричество и тепло, потребляет газ.' }),
  P('p_nuclear', 'АЭС', 'power', 4, 5, 90000, 1600, { prod: { power: 13000 }, poll: 0, jobs: 250, use: { water: 200 }, risk: true, desc: 'Огромная мощность. Требует воды.' }),
  // ---- вода ----
  P('w_well', 'Скважина с колонкой', 'water', 1, 0, 350, 6, { prod: { water: 30 }, use: { power: 2 }, jobs: 0, desc: 'Простая скважина. Нужно электричество.' }),
  P('w_tower', 'Водонапорная башня', 'water', 1, 0, 1400, 35, { prod: { water: 180 }, use: { power: 6 }, jobs: 1, desc: 'Классическая башня Рожновского.' }),
  P('w_pump', 'Насосная станция', 'water', 2, 2, 6500, 160, { prod: { water: 1600 }, use: { power: 45 }, needsShore: true, jobs: 10, desc: 'Ставится у воды.' }),
  P('w_intake', 'Водозабор', 'water', 3, 4, 22000, 450, { prod: { water: 6500 }, use: { power: 140 }, needsShore: true, jobs: 30, desc: 'Большой водозабор у реки.' }),
  // ---- канализация ----
  P('s_treat', 'Очистные сооружения', 'sewage', 3, 2, 8500, 220, { prod: { sewage: 1600 }, use: { power: 50 }, poll: 3, jobs: 15, desc: 'Очищает стоки.' }),
  P('s_aeration', 'Станция аэрации', 'sewage', 4, 5, 32000, 700, { prod: { sewage: 8000 }, use: { power: 200 }, poll: 3, jobs: 40, desc: 'Крупная очистная станция.' }),
  // ---- газ ----
  P('g_grs', 'Газораспределительная станция', 'gas', 2, 1, 4500, 90, { prod: { gas: 900 }, jobs: 4, gasImport: true, desc: 'Получает газ из магистрали (закупка газа).' }),
  P('g_holder', 'Газгольдер', 'gas', 2, 3, 9500, 160, { prod: { gas: 3200 }, jobs: 6, gasImport: true, desc: 'Большой запас газа.' }),
  // ---- отопление ----
  P('h_boiler', 'Котельная', 'heat', 2, 2, 5500, 140, { prod: { heat: 800 }, needs: { gas: 380 }, use: { power: 20, water: 20 }, poll: 7, jobs: 8, desc: 'Тепло для многоэтажек. Потребляет газ.' }),
  // ---- мусор ----
  P('t_dump', 'Свалка', 'garbage', 3, 1, 1800, 60, { prod: { garbage: 420 }, poll: 14, lv: -20, jobs: 6, desc: 'Дёшево и грязно.' }),
  P('t_recycle', 'Пункт вторсырья', 'garbage', 1, 3, 2600, 70, { prod: { garbage: 180 }, use: { power: 6 }, jobs: 5, desc: 'Принимает макулатуру и стеклотару.' }),
  P('t_incin', 'Мусоросжигательный завод', 'garbage', 2, 4, 16000, 380, { prod: { garbage: 1600, power: 160 }, use: { water: 20 }, poll: 12, jobs: 25, desc: 'Сжигает мусор, даёт немного энергии.' }),
  // ---- безопасность ----
  P('f_post', 'Пожарный пост', 'fire', 1, 1, 1300, 60, { service: { type: 'fire', r: 8 }, use: { power: 4, water: 6 }, jobs: 6 }),
  P('f_station', 'Пожарная часть', 'fire', 2, 3, 6500, 220, { service: { type: 'fire', r: 17 }, use: { power: 12, water: 15 }, jobs: 25 }),
  P('po_post', 'Опорный пункт милиции', 'police', 1, 1, 1300, 70, { service: { type: 'police', r: 8 }, use: { power: 4, water: 2 }, jobs: 6 }),
  P('po_station', 'Отделение милиции', 'police', 2, 3, 7000, 260, { service: { type: 'police', r: 17 }, use: { power: 12, water: 6 }, jobs: 35 }),
  // ---- медицина ----
  P('m_fap', 'Фельдшерский пункт', 'health', 1, 0, 1100, 50, { service: { type: 'health', r: 8 }, use: { power: 3, water: 3 }, jobs: 3, tags: ['health'] }),
  P('m_clinic', 'Поликлиника', 'health', 2, 2, 7000, 240, { service: { type: 'health', r: 15 }, use: { power: 15, water: 12, heat: 10 }, jobs: 30, tags: ['health'] }),
  P('m_hospital', 'Больница', 'health', 3, 4, 22000, 650, { service: { type: 'health', r: 26 }, use: { power: 40, water: 40, heat: 30 }, jobs: 90, tags: ['health'] }),
  // ---- образование ----
  P('e_kinder', 'Детский сад', 'edu', 1, 1, 1600, 60, { service: { type: 'kinder', r: 8 }, use: { power: 4, water: 4, heat: 4 }, jobs: 6, tags: ['kinder'] }),
  P('e_school', 'Школа', 'edu', 2, 1, 5000, 180, { service: { type: 'school', r: 15 }, use: { power: 10, water: 10, heat: 10 }, jobs: 30, tags: ['school'] }),
  P('e_library', 'Библиотека', 'edu', 1, 2, 1800, 50, { service: { type: 'library', r: 12 }, use: { power: 3 }, jobs: 3, tags: ['fun'] }),
  P('e_college', 'ПТУ', 'edu', 2, 3, 9000, 280, { service: { type: 'college', r: 35 }, use: { power: 15, water: 10, heat: 10 }, jobs: 30, tags: ['univ'] }),
  P('e_univ', 'Университет', 'edu', 3, 5, 30000, 800, { service: { type: 'univ', r: 60 }, use: { power: 40, water: 30, heat: 30 }, jobs: 120, tags: ['univ'] }),
  // ---- отдых ----
  P('l_square', 'Сквер', 'leisure', 1, 0, 300, 5, { service: { type: 'park', r: 4 }, lv: 8, tags: ['park'] }),
  P('l_play', 'Детская площадка', 'leisure', 1, 0, 450, 6, { service: { type: 'park', r: 4 }, lv: 6, tags: ['park'] }),
  P('l_park', 'Парк', 'leisure', 2, 2, 2400, 30, { service: { type: 'park', r: 9 }, lv: 15, tags: ['park'] }),
  P('l_fountain', 'Площадь с фонтаном', 'leisure', 1, 3, 2000, 25, { service: { type: 'park', r: 6 }, lv: 14, use: { water: 5, power: 2 }, tags: ['park'] }),
  P('l_monument', 'Памятник', 'leisure', 1, 2, 1500, 5, { service: { type: 'park', r: 5 }, lv: 10 }),
  P('l_church', 'Церковь', 'leisure', 2, 2, 6000, 20, { service: { type: 'culture', r: 12 }, lv: 12, jobs: 3 }),
  P('l_dk', 'Дом культуры', 'leisure', 2, 2, 7500, 180, { service: { type: 'culture', r: 15 }, use: { power: 10, heat: 8 }, jobs: 15, tags: ['fun'] }),
  P('l_stadium', 'Стадион', 'leisure', 3, 4, 25000, 450, { service: { type: 'culture', r: 26 }, use: { power: 60, water: 20 }, jobs: 40, tags: ['fun'] }),
  P('l_amuse', 'Парк аттракционов', 'leisure', 3, 5, 30000, 500, { service: { type: 'park', r: 20 }, lv: 18, use: { power: 50 }, jobs: 40, tags: ['fun', 'park'] }),
  P('l_tvtower', 'Телебашня', 'leisure', 2, 6, 60000, 600, { service: { type: 'culture', r: 45 }, use: { power: 80 }, jobs: 30, desc: 'Символ мегаполиса.' }),
  // ---- администрация и связь ----
  P('a_council', 'Сельсовет', 'admin', 1, 0, 2000, 40, { service: { type: 'admin', r: 10 }, use: { power: 3 }, jobs: 5, unique: true, desc: 'Повышает доверие жителей.' }),
  P('a_cityhall', 'Мэрия', 'admin', 3, 4, 35000, 500, { service: { type: 'admin', r: 30 }, use: { power: 30, heat: 20, water: 10 }, jobs: 80, unique: true, lv: 20 }),
  P('c_post', 'Почта', 'admin', 1, 1, 1500, 45, { service: { type: 'post', r: 10 }, use: { power: 3 }, jobs: 6 }),
  P('c_ats', 'Телефонная станция', 'admin', 1, 2, 3200, 90, { service: { type: 'phone', r: 14 }, use: { power: 15 }, jobs: 8, desc: 'Домашние телефоны! Нужна бизнесу.' }),
  // ---- транспорт ----
  P('tr_stop', 'Автобусная остановка', 'transport', 1, 2, 400, 15, { service: { type: 'transit', r: 6 }, jobs: 0 }),
  P('tr_station', 'Автовокзал', 'transport', 2, 3, 9000, 250, { service: { type: 'transit', r: 14 }, use: { power: 10 }, jobs: 25 }),
  P('tr_rail', 'Ж/д вокзал', 'transport', 3, 4, 26000, 500, { service: { type: 'transit', r: 20 }, use: { power: 30 }, jobs: 50, trade: 0.5, desc: 'Увеличивает экспорт товаров.' }),
  P('tr_airport', 'Аэропорт', 'transport', 4, 6, 120000, 1800, { service: { type: 'transit', r: 30 }, use: { power: 150, water: 40 }, jobs: 200, trade: 1, poll: 10, desc: 'Привлекает бизнес и туристов.' }),
];

export const CATEGORIES = [
  { id: 'power', name: 'Электричество', icon: '⚡' },
  { id: 'water', name: 'Водоснабжение', icon: '💧' },
  { id: 'sewage', name: 'Канализация', icon: '🚽' },
  { id: 'gas', name: 'Газ', icon: '🔥' },
  { id: 'heat', name: 'Отопление', icon: '♨' },
  { id: 'garbage', name: 'Мусор', icon: '🗑' },
  { id: 'fire', name: 'Пожарные', icon: '🚒' },
  { id: 'police', name: 'Милиция', icon: '🚓' },
  { id: 'health', name: 'Медицина', icon: '🏥' },
  { id: 'edu', name: 'Образование', icon: '🎓' },
  { id: 'leisure', name: 'Отдых', icon: '🌳' },
  { id: 'admin', name: 'Администрация', icon: '🏛' },
  { id: 'transport', name: 'Транспорт', icon: '🚌' },
];

export const SERVICE_NAMES = {
  fire: 'Пожарная охрана', police: 'Милиция', health: 'Здравоохранение', kinder: 'Детские сады',
  school: 'Школы', library: 'Библиотеки', college: 'Профобразование', univ: 'Высшее образование',
  park: 'Парки', culture: 'Культура', admin: 'Администрация', post: 'Почта', phone: 'Телефонная связь', transit: 'Общ. транспорт',
};

export const ALL = [...ZONE_BUILDINGS, ...PLOP_BUILDINGS];
export const DEFS = Object.fromEntries(ALL.map((d) => [d.id, d]));
export const DEF_LIST = ALL;
ALL.forEach((d, i) => { d.idx = i; });

// Расчёт базового потребления здания (на полную загрузку)
export function baseUse(def) {
  if (def.kind === 'zone') {
    const u = USE[def.zone + def.dens];
    const out = {};
    for (const k in u) out[k] = u[k] * def.cap;
    return out;
  }
  return { power: 0, water: 0, gas: 0, heat: 0, sewage: 0, garbage: 0, ...(def.use || {}), sewage: (def.use?.water || 0) * 0.8, garbage: (def.jobs || 0) * 0.3 };
}
