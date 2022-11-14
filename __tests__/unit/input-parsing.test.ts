import * as inputs from '../../src/input-parameters'

test('get input parameters', () => {
  const inputParameters = inputs.getInputParameters()
  expect(inputParameters).toBeDefined()
  expect(inputParameters.variables).toBeDefined()
  expect(inputParameters.variables?.get('foo')).toBe('quux')
  expect(inputParameters.variables?.get('bar')).toBe('xyzzy')
})
