import { expect, mock, test } from 'claude-code/testing'

const WINDOWS = [
  { kind: 'five_hour', percentUsed: 58, resetsAt: '2099-01-01T00:00:00Z' },
  { kind: 'seven_day', percentUsed: 12.5 },
]

const PROPS = {
  hasSurvey: false,
  isCollapsed: false,
  isWorking: false,
  maxRows: 4,
  bodyColumns: 100,
  scroll: { offset: 0, bodyRows: 4 },
  view: {},
} as const

test('the band shows percent left for each window once a reading lands', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: Date.parse('2098-12-31T22:00:00Z') })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000 }, rateLimits: WINDOWS },
  }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({
      plugin: 'ribbon',
      surface,
      component: 'AbovePrompt',
      props: PROPS,
    })
    expect(await band.find({ text: '42% left' })).toBeDefined()
    expect(await band.find({ text: '87.5% left' })).toBeDefined()
    // 7D (87.5% left) draws before 5H (42% left)
    const all = JSON.stringify(await band.find({ type: 'Box' }))
    expect(all.indexOf('7D')).toBeLessThan(all.indexOf('5H'))
    await band.unmount()
  }
})

test('in a narrow band each window stacks, with percent left and reset time on their own lines', async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: Date.parse('2098-12-31T22:00:00Z') })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000 }, rateLimits: WINDOWS },
  }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

  const band = await $.ui.mount({
    plugin: 'ribbon',
    surface: 'desktop',
    component: 'AbovePrompt',
    props: { ...PROPS, bodyColumns: 36 },
  })
  expect(await band.find({ text: '42% left' })).toBeDefined()
  expect(await band.find({ text: 'resets 2h 0m' })).toBeDefined()
  await band.unmount()
})

test('with showWeekly off, only the 5-hour window draws', { options: { showWeekly: false } }, async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: Date.parse('2098-12-31T22:00:00Z') })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000 }, rateLimits: WINDOWS },
  }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

  for (const surface of ['terminal', 'desktop'] as const) {
    for (const bodyColumns of [100, 36]) {
      const band = await $.ui.mount({
        plugin: 'ribbon',
        surface,
        component: 'AbovePrompt',
        props: { ...PROPS, bodyColumns },
      })
      expect(await band.find({ text: '42% left' })).toBeDefined()
      expect(await band.find({ text: '87.5% left' })).toBeUndefined()
      const all = JSON.stringify(await band.find({ type: 'Box' }))
      expect(all.includes('7D')).toBe(false)
      expect(all.includes('5H')).toBe(true)
      await band.unmount()
    }
  }
})

test('textSize draws the band text at the chosen size', { options: { textSize: 'caption' } }, async ($, on) => {
  mock.store(on)
  mock.clock(on, { now: Date.parse('2098-12-31T22:00:00Z') })
  on('session.start', ($, e) => ({ cwd: e.cwd }))
  on('session.usage', () => ({
    value: { startedAt: 0, context: { window: 200000 }, rateLimits: WINDOWS },
  }))
  await $.session.start({ surface: 'terminal', isInteractive: true, cwd: '/work' })

  for (const surface of ['terminal', 'desktop'] as const) {
    const band = await $.ui.mount({ plugin: 'ribbon', surface, component: 'AbovePrompt', props: PROPS })
    expect(await band.find({ text: '42% left' })).toBeDefined()
    const all = JSON.stringify(await band.find({ type: 'Text' }))
    expect(all.includes('"size":"caption"')).toBe(true)
    expect(all.includes('"size":"body"')).toBe(false)
    await band.unmount()
  }
})
