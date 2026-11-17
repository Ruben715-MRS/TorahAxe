const test = require('node:test');
const assert = require('node:assert');
const { create } = require('../js/notifications.js');
const Reminder = require('../js/zmanimReminderCore.js');

const place = { name: 'Marseille', lat: 43.2965, lon: 5.3698, elevation: 0, tz: 'Europe/Paris' };
const ZmanimCore = require('../js/zmanimCore.js');
const NOW = Date.parse('2026-11-15T10:00:00+01:00');

function fakePlugin(state) {
    const calls = { cancel: [], schedule: [] };
    return {
        calls,
        checkPermissions: async () => ({ display: state.permission }),
        requestPermissions: async () => ({ display: state.permission }),
        getPending: async () => ({ notifications: state.pending }),
        cancel: async (arg) => { calls.cancel.push(arg); },
        schedule: async (arg) => { calls.schedule.push(arg); }
    };
}
const Dates = require('../js/personalDatesCore.js');
function build(state, settings, extra) {
    const plugin = state.plugin === null ? null : fakePlugin(state);
    const api = create(Object.assign({
        plugin: () => plugin, core: () => Reminder, settings: () => settings, place: () => ZmanimCore.normalizePlace(place),
        opts: () => ({}), tr: (k, p) => k + (p ? JSON.stringify(p) : ''), now: () => NOW, locale: 'fr'
    }, extra));
    return { api, plugin };
}
const ON = { on: true, candles: { on: true, before: 30 }, omer: { on: false }, roshChodesh: { on: false }, levana: { on: false }, days: [], custom: {} };

test('hors de l\'app (sans plugin) : rien n\'est programmé', async () => {
    const { api } = build({ plugin: null }, ON);
    assert.strictEqual(api.isSupported(), false);
    assert.strictEqual(await api.scheduleZmanim(), 0);
    assert.strictEqual(await api.enableZmanim(), false);
});

test('les bougies de Chabbat sont programmées, avec les seuls identifiants réservés annulés', async () => {
    const state = { permission: 'granted', pending: [{ id: 7340003 }, { id: 42 }] };
    const { api, plugin } = build(state, ON);
    const n = await api.scheduleZmanim();
    assert.ok(n >= 1, 'au moins un rappel de bougies dans les 7 jours');
    assert.deepStrictEqual(plugin.calls.cancel[0].notifications, [{ id: 7340003 }]);   // l'id 42 n'est pas à nous
    const first = plugin.calls.schedule[0].notifications[0];
    assert.ok(first.id >= api.ID_BASE);
    assert.ok(first.schedule.at.getTime() > NOW);
    assert.match(first.title, /candles/);
});

test('sans autorisation, rien n\'est programmé', async () => {
    const { api, plugin } = build({ permission: 'denied', pending: [] }, ON);
    assert.strictEqual(await api.scheduleZmanim(), 0);
    assert.strictEqual(plugin.calls.schedule.length, 0);
    assert.strictEqual(await api.enableZmanim(), false);
});

test('rappels désactivés : les anciens sont annulés, aucun nouveau', async () => {
    const { api, plugin } = build({ permission: 'granted', pending: [{ id: 7340000 }] }, Object.assign({}, ON, { on: false }));
    assert.strictEqual(await api.scheduleZmanim(), 0);
    assert.strictEqual(plugin.calls.cancel.length, 1);
    assert.strictEqual(plugin.calls.schedule.length, 0);
});

test('l\'Omer : un rappel par soir, avec le numéro du jour', () => {
    const settings = Object.assign({}, ON, { candles: { on: false }, omer: { on: true, at: 'tzeit', text: 'count' } });
    const items = Reminder.plan(settings, ZmanimCore.normalizePlace(place), {}, Date.parse('2027-04-25T10:00:00+02:00'), 7);
    const omer = items.filter(i => i.kind === 'omer');
    assert.ok(omer.length >= 6);
    assert.strictEqual(omer[1].day, omer[0].day + 1);
});

// --- Les dates personnelles ---------------------------------------------------------------------------------------------------------------------------------
const HAZKARA = { items: [{ id: 'a', type: 'hazkara', name: 'Père', hebrew: { day: 10, month: 'Kislev', year: 5780 }, remind: { eve: true, morning: true } }] };   // vendredi 20 novembre 2026
const OFF = { on: false, candles: { on: false }, omer: { on: false }, roshChodesh: { on: false }, levana: { on: false }, days: [], custom: {} };

test('dates personnelles : programmées même quand les rappels des Zmanim sont désactivés, avec le terme du rite', async () => {
    const state = { permission: 'granted', pending: [] };
    const { api, plugin } = build(state, OFF, { datesCore: () => Dates, dates: () => HAZKARA, rite: () => 'ashkenaze' });
    assert.strictEqual(await api.scheduleZmanim(), 2);
    const list = plugin.calls.schedule[0].notifications;
    assert.strictEqual(list.length, 2);
    assert.match(list[0].title, /dates\.rem_hazkara_eve_title.*"term":"dates\.term_yahrzeit"/);
    assert.match(list[1].title, /dates\.rem_hazkara_morning_title/);
    assert.ok(list[0].schedule.at < list[1].schedule.at);
    const sefarade = build({ permission: 'granted', pending: [] }, OFF, { datesCore: () => Dates, dates: () => HAZKARA, rite: () => 'sefarade' });
    await sefarade.api.scheduleZmanim();
    assert.match(sefarade.plugin.calls.schedule[0].notifications[0].title, /dates\.term_hazkara/);
});

test('dates personnelles : mêlées aux rappels des Zmanim, triées par instant, et les rappels de l\'app annulés avant', async () => {
    const state = { permission: 'granted', pending: [{ id: 7340001 }, { id: 5 }] };
    const { api, plugin } = build(state, ON, { datesCore: () => Dates, dates: () => HAZKARA, rite: () => 'sefarade' });
    const n = await api.scheduleZmanim();
    assert.ok(n >= 3);
    const ats = plugin.calls.schedule[0].notifications.map(x => +x.schedule.at);
    assert.deepStrictEqual(ats, ats.slice().sort((a, b) => a - b));
    assert.deepStrictEqual(plugin.calls.cancel[0].notifications.map(x => x.id), [7340001]);
});

test('dates personnelles : sans lieu ou sans registre, aucun rappel de plus ; hors de l\'app, rien', async () => {
    const noPlace = build({ permission: 'granted', pending: [] }, OFF, { datesCore: () => Dates, dates: () => HAZKARA, place: () => null });
    assert.strictEqual(await noPlace.api.scheduleZmanim(), 0);
    const none = build({ permission: 'granted', pending: [] }, OFF, { datesCore: () => Dates, dates: () => null });
    assert.strictEqual(await none.api.scheduleZmanim(), 0);
    const web = build({ plugin: null }, OFF, { datesCore: () => Dates, dates: () => HAZKARA });
    assert.strictEqual(await web.api.scheduleZmanim(), 0);
});

test('l\'Omer : le soir est actif par défaut, le matin non ; le matin se lit sans bénédiction', () => {
    const d = Reminder.defaults();
    assert.strictEqual(d.omer.on, true);
    assert.strictEqual(d.omer.morning, false);
    assert.strictEqual(Reminder.normalize({ on: true, omer: { on: true } }).omer.morning, false);
    const s = Object.assign({}, ON, { candles: { on: false }, omer: { on: true, at: 'tzeit', text: 'count', morning: true } });
    const items = Reminder.plan(s, ZmanimCore.normalizePlace(place), {}, Date.parse('2027-04-25T10:00:00+02:00'), 7).filter(i => i.kind === 'omer');
    const mornings = items.filter(i => i.when === 'morning'), evenings = items.filter(i => i.when !== 'morning');
    assert.ok(mornings.length >= 5 && evenings.length >= 5);
    const m = mornings[0], e = evenings.find(x => x.day === m.day);
    assert.ok(e && e.at < m.at, 'la veille au soir précède le matin du même numéro');
    const tr = (k, p) => k + JSON.stringify(p || {});
    assert.ok(/morning_body/.test(Reminder.describe(m, tr, ZmanimCore.normalizePlace(place), 'fr').body));
});

test('toucher une notification : le rappel de l\'Omer porte de quoi ouvrir le compte du jour', async () => {
    const state = { permission: 'granted', pending: [] };
    const settings = { on: true, candles: { on: false }, omer: { on: true, at: 'tzeit', text: 'count', morning: true }, roshChodesh: { on: false }, levana: { on: false }, days: [], custom: {} };
    const now = Date.parse('2027-04-25T10:00:00+02:00');
    const { api, plugin } = build(state, settings, { now: () => now });
    await api.scheduleZmanim();
    const list = plugin.calls.schedule[0].notifications.filter(n => n.extra && n.extra.route === 'omer');
    assert.ok(list.length >= 6);
    assert.ok(list.some(n => n.extra.mode === 'morning') && list.some(n => n.extra.mode === 'evening'));
    assert.ok(list.every(n => Number.isInteger(n.extra.day)));
    // l'écoute du toucher
    let registered = null;
    const plugin2 = Object.assign(fakePlugin(state), { addListener: (name, fn) => { registered = { name, fn }; return Promise.resolve({}); } });
    const api2 = create({ plugin: () => plugin2, core: () => Reminder, settings: () => settings, place: () => null, tr: k => k, now: () => now, locale: 'fr' });
    const got = [];
    assert.strictEqual(api2.onOpen(e => got.push(e)), true);
    assert.strictEqual(registered.name, 'localNotificationActionPerformed');
    registered.fn({ notification: { extra: { route: 'omer', mode: 'evening', day: 8 } } });
    registered.fn({ notification: { extra: null } });
    assert.deepStrictEqual(got, [{ route: 'omer', mode: 'evening', day: 8 }]);
    assert.strictEqual(create({ plugin: () => null, core: () => Reminder, tr: k => k, now: () => now, locale: 'fr' }).onOpen(() => {}), false);
});
