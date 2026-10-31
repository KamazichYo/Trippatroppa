'use strict';
// ───────────── тексты: шёпоты, голоса, концовки ─────────────
const TXT = {
  whispers: [
    ['НЕУДАЧНИК', 'LOSER'], ['ВСЕ СМОТРЯТ', 'EVERYONE IS LOOKING'], ['ТЫ ВЫКЛЮЧИЛ УТЮГ?', 'DID YOU TURN OFF THE IRON?'],
    ['ЗАЧЕМ ТЫ ВЫШЕЛ', 'WHY DID YOU GO OUT'], ['У ТЕБЯ ПЯТНО', "THERE'S A STAIN"], ['ОНИ ЗНАЮТ', 'THEY KNOW'],
    ['СМЕШНАЯ ПОХОДКА', 'FUNNY WALK'], ['ИДИ ДОМОЙ', 'GO HOME'], ['ПСИХ', 'FREAK'], ['МАМА БЫЛА ПРАВА', 'MOM WAS RIGHT'],
    ['КТО ТАК ХОДИТ', 'WHO WALKS LIKE THAT'], ['ШНУРОК!', 'SHOELACE!'], ['ТЫ В ТАПКАХ', "YOU'RE IN SLIPPERS"], ['ПАХНЕШЬ СТРАХОМ', 'YOU SMELL OF FEAR'],
  ],
  voices: [
    ['Сзади.', 'Behind you.'], ['Он идёт за тобой.', 'He is following you.'], ['Не оборачивайся.', "Don't turn around."],
    ['Хлеб — это ловушка.', 'The bread is a trap.'], ['Молоко скисло ещё вчера.', 'The milk went sour yesterday.'],
    ['Мы в твоей голове. Тут тесно.', "We're in your head. It's cramped."], ['Ты забыл, как дышать?', 'Did you forget how to breathe?'],
    ['Психолог тебе врёт.', 'The therapist is lying to you.'], ['Посчитай до десяти. Неправильно.', 'Count to ten. Wrong.'],
    ['Кассирша знает.', 'The cashier knows.'], ['Ты не закрыл дверь.', "You didn't lock the door."], ['Здесь кто-то есть.', 'Someone is here.'],
  ],
  store: [
    ['СКИДКА −100% РАССУДКА', '−100% SANITY SALE'], ['2 ПО ЦЕНЕ 1', 'BUY 1 GET 1'], ['АКЦИЯ: ПАНИКА', 'PANIC DEAL'],
    ['ПАКЕТ НУЖЕН?', 'NEED A BAG?'], ['КАРТА МАГАЗИНА ЕСТЬ?', 'LOYALTY CARD?'], ['МЕЛОЧИ НЕ БУДЕТ?', 'GOT EXACT CHANGE?'], ['ОТОЙДИТЕ ОТ КАССЫ', 'STEP AWAY FROM THE TILL'],
  ],
  bossWords: {
    space: [['КАК ВЫ СЕБЯ ЧУВСТВУЕТЕ?', 'HOW DO YOU FEEL?'], ['РАССКАЖИТЕ О МАМЕ', 'TELL ME ABOUT YOUR MOTHER'], ['?', '?'], ['МХМ', 'MHM'], ['СЕАНС ОКОНЧЕН', 'SESSION IS OVER']],
    heaven: [['ДА БУДЕТ СВЕТ', 'LET THERE BE LIGHT'], ['Я ВСЁ ВИЖУ', 'I SEE ALL'], ['СМИРЕНИЕ', 'HUMILITY'], ['НЕ ПОМИНАЙ', 'IN VAIN']],
    hell: [['ПОДПИШИ ТУТ', 'SIGN HERE'], ['ДУША — 3 ₽', 'SOUL — $1'], ['ДОГОВОР', 'CONTRACT'], ['МЕЛКИЙ ШРИФТ', 'FINE PRINT']],
    jesus: [['ПРОЩАЮ', 'I FORGIVE YOU'], ['ВОЗЛЮБИ', 'LOVE THY NEIGHBOR'], ['ХЛЕБ НАСУЩНЫЙ', 'DAILY BREAD']],
    atom: [['ЛОЖИСЬ И НАКРОЙСЯ', 'DUCK AND COVER'], ['КРАСНАЯ УГРОЗА', 'RED MENACE'], ['КУПИ ОБЛИГАЦИИ', 'BUY BONDS'], ['ПРОГРЕСС!', 'PROGRESS!']],
    art: [['ОТКАЗАНО', 'REJECTED'], ['БЕЗДАРНО', 'NO TALENT'], ['ПЕРСПЕКТИВА!', 'PERSPECTIVE!'], ['ГДЕ ЛЮДИ?', 'WHERE ARE THE PEOPLE?']],
    cashier: [['ПАКЕТ?', 'BAG?'], ['СЛЕДУЮЩИЙ!', 'NEXT!'], ['КАРТОЙ ИЛИ НАЛИЧНЫМИ', 'CARD OR CASH'], ['ПОДОЖДИТЕ', 'WAIT']],
  },
  stages: [
    ['Стадия 1 · Лёгкая нервозность', 'Stage 1 · Mild nervousness'],
    ['Стадия 2 · Социофобия', 'Stage 2 · Social anxiety'],
    ['Стадия 3 · Паранойя', 'Stage 3 · Paranoia'],
    ['Стадия 4 · Галлюцинации', 'Stage 4 · Hallucinations'],
    ['Стадия 5 · Шизофрения', 'Stage 5 · Schizophrenia'],
    ['Стадия ∞ · Мания величия', 'Stage ∞ · Delusions of grandeur'],
  ],
  stageHints: [
    ['Прохожие пихаются. Просто дойди до арки.', 'Passers-by shove you. Just get to the archway.'],
    ['Они шепчут. Слова тоже можно бить.', 'They whisper. Words can be hit too.'],
    ['Все против тебя. Это уже не кажется.', "Everyone's against you. It's no longer just a feeling."],
    ['Слушай. Голоса видно только по кругам.', 'Listen. Voices only show up as ripples.'],
    ['Манекены двигаются, когда ты не смотришь.', "Mannequins move when you're not looking."],
  ],
  intro: [
    ['«Просто сходи в магазин. Хлеб, молоко. Это всего лишь улица», — сказала психолог.',
      '"Just go to the store. Bread, milk. It\'s only a street," the therapist said.'],
    ['Ты не выходил из квартиры четыре месяца. Тапки, толстовка, авоська. Дверь подъезда скрипит.',
      "You haven't left the flat in four months. Slippers, hoodie, string bag. The front door creaks."],
    ['Иди по жёлтой линии. Не останавливайся. Не слушай их.', "Follow the yellow line. Don't stop. Don't listen to them."],
  ],
};

// Концовки: аспект → босс, арена, текст
const ENDINGS = {
  space: {
    lane: ['КОСМОС', 'SPACE'], boss: ['Великий Психолог Космоса', 'The Great Cosmic Therapist'],
    intro: ['Касса проглотила тебя, и ты вылетел за пределы атмосферы. В центре галактики тебя ждёт она. Размером с Юпитер. С блокнотом.',
      'The checkout swallowed you and spat you out beyond the atmosphere. At the centre of the galaxy she waits for you. The size of Jupiter. Holding a notepad.'],
    win: ['Ты перебил Психолога Космоса на полуслове. Впервые за год ты сказал «нет» и не извинился. Галактика аплодирует. Сеанс окончен — оплата почасовая.',
      "You cut the Cosmic Therapist off mid-sentence. For the first time in a year you said \"no\" and didn't apologise. The galaxy applauds. Session's over — billed by the hour."],
    item: ['кусочек туманности (на вкус как ряженка)', 'a piece of nebula (tastes like sour cream)'],
  },
  heaven: {
    lane: ['РАЙ', 'HEAVEN'], boss: ['Всевышний (на приёме)', 'The Almighty (office hours)'],
    intro: ['Касса оказалась вратами. Рай похож на поликлинику: облака, бахилы, очередь. Ты без записи. Он смотрит.',
      "The checkout was a gate. Heaven looks like a clinic: clouds, shoe covers, a queue. You have no appointment. He is watching."],
    win: ['Ты победил Бога в честной драке. Он рассмеялся так, что пошёл дождь над Ереваном, и выдал тебе справку: «Годен. Без ограничений».',
      'You beat God in a fair fight. He laughed so hard it rained over Yerevan, and handed you a certificate: "Fit. No restrictions."'],
    item: ['нимб (б/у, слегка погнут)', 'a halo (used, slightly bent)'],
  },
  hell: {
    lane: ['АД', 'HELL'], boss: ['Дьявол, отдел договоров', 'The Devil, Contracts Dept.'],
    intro: ['Касса пробила чек на твою душу. Ад — это очередь в МФЦ, только жарче. Дьявол протягивает ручку.',
      'The till printed a receipt for your soul. Hell is a DMV queue, only hotter. The Devil offers you a pen.'],
    win: ['Ты не подписал. Ты победил. Дьявол рыдает над непроданной душой и пишет жалобу самому себе. Ад закрыт на санитарный день.',
      "You didn't sign. You won. The Devil weeps over an unsold soul and files a complaint with himself. Hell is closed for a sanitary day."],
    item: ['договор на душу, неподписанный', 'an unsigned soul contract'],
  },
  jesus: {
    lane: ['ГАЛИЛЕЯ', 'GALILEE'], boss: ['Иисус (по воде)', 'Jesus (on water)'],
    intro: ['Касса выплюнула тебя на гладь Галилейского моря. Ты стоишь на воде. Он тоже. Хлеба кончились — Он сделает ещё.',
      "The checkout spat you out onto the Sea of Galilee. You're standing on water. So is He. Out of bread — He'll make more."],
    win: ['Он и не дрался всерьёз. Он просто простил тебя — за всё, сразу. Это оказалось больнее любого удара. Ты плачешь на воде. Вода держит.',
      "He never really fought. He just forgave you — for everything, at once. It hurt more than any blow. You cry on the water. The water holds."],
    item: ['пять хлебов и две рыбы', 'five loaves and two fish'],
  },
  atom: {
    lane: ['1953', '1953'], boss: ['Президент Рейнолдс', 'President Reynolds'],
    intro: ['Касса отбросила тебя в 1953-й. Газон, белый заборчик, по телевизору — Президент Рейнолдс. Он объявил тебя красной угрозой.',
      'The checkout threw you back to 1953. A lawn, a white picket fence, President Reynolds on TV. He has declared you a Red Menace.'],
    win: ['Президент Рейнолдс сдался в прямом эфире, между рекламой сигарет и стирального порошка. Атомный век отменён. Бомбоубежище сдаётся в аренду.',
      'President Reynolds surrendered live on air, between a cigarette ad and a laundry powder ad. The Atomic Age is cancelled. The bomb shelter is up for rent.'],
    item: ['облигация займа 1953 года', 'a 1953 war bond'],
  },
  art: {
    lane: ['ВЕНА, 1907', 'VIENNA, 1907'], boss: ['Абитуриент Адольф', 'Adolf, the Applicant'],
    intro: ['Касса привела тебя в Венскую академию художеств, 1907 год. Ты — приёмная комиссия. Перед тобой абитуриент с папкой акварелей. Он очень не любит слово «нет».',
      'The checkout led you to the Vienna Academy of Fine Arts, 1907. You are the admissions committee. Before you stands an applicant with a folder of watercolours. He really hates the word "no".'],
    win: ['Комиссия единогласно: ОТКАЗАТЬ. Ты на всякий случай отказал ещё и в аренде мольберта, кисточках и усах. История, конечно, не изменится — это галлюцинация. Но приятно.',
      "The committee is unanimous: REJECTED. Just in case, you also denied him an easel, brushes and the moustache. History won't change, of course — it's a hallucination. But it felt good."],
    item: ['справку об отказе (не тебе)', 'a rejection letter (not yours)'],
  },
};
const ASPECTS = ['space', 'heaven', 'hell', 'jesus', 'atom', 'art'];
