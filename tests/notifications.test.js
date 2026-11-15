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
function build(state, settings) {
    const plugin = state.plugin === null ? null : fakePlugin(state);
    const api = create({
        plugin: () => plugin, core: () => Reminder, settings: () => settings, place: () => ZmanimCore.normalizePlace(place),
        opts: () => ({}), tr: (k, p) => k + (p ? JSON.stringify(p) : ''), now: () => NOW, locale: 'fr'
    });
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
