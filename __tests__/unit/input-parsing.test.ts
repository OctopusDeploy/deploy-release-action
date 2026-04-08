import { getInputParameters } from '../../src/input-parameters'

test('get input parameters', () => {
  const inputParameters = getInputParameters()
  expect(inputParameters).toBeDefined()
  expect(inputParameters.environments).toBeDefined()
  expect(inputParameters.environments[0]).toBe('Dev')
  expect(inputParameters.environments[1]).toBe('Staging')
  expect(inputParameters.variables).toBeDefined()
  expect(inputParameters.variables?.['foo']).toBe('quux')
  expect(inputParameters.variables?.['bar']).toBe('xyzzy')
  expect(inputParameters.runAt).toBeUndefined()
  expect(inputParameters.noRunAfter).toBeUndefined()
})

test('deploy_at and deploy_at_expiry are parsed as dates', () => {
  const original = process.env
  process.env = Object.assign({}, process.env, {
    INPUT_DEPLOY_AT: '2026-04-02T09:00:00+10:00',
    INPUT_DEPLOY_AT_EXPIRY: '2026-04-02T17:00:00+10:00'
  })

  const inputParameters = getInputParameters()
  expect(inputParameters.runAt).toStrictEqual(new Date('2026-04-02T09:00:00+10:00'))
  expect(inputParameters.noRunAfter).toStrictEqual(new Date('2026-04-02T17:00:00+10:00'))

  process.env = original
})

test('invalid deploy_at throws error', () => {
  const original = process.env
  process.env = Object.assign({}, process.env, {
    INPUT_DEPLOY_AT: 'notadate'
  })

  expect(() => getInputParameters()).toThrowError("deploy_at 'notadate' is not a valid ISO 8601 date-time string.")

  process.env = original
})

test('invalid deploy_at_expiry throws error', () => {
  const original = process.env
  process.env = Object.assign({}, process.env, {
    INPUT_DEPLOY_AT_EXPIRY: 'notadate'
  })

  expect(() => getInputParameters()).toThrowError("deploy_at_expiry 'notadate' is not a valid ISO 8601 date-time string.")

  process.env = original
})
