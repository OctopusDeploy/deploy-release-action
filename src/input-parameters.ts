import { getBooleanInput, getInput, getMultilineInput } from '@actions/core'

const EnvironmentVariables = {
  URL: 'OCTOPUS_URL',
  ApiKey: 'OCTOPUS_API_KEY',
  Space: 'OCTOPUS_SPACE'
} as const

export interface InputParameters {
  // Optional: A server is required, but you should use the OCTOPUS_URL env
  server: string
  // Optional: An API key is required, but you should use the OCTOPUS_API_KEY environment variable instead of this.
  apiKey: string
  // Optional: You should prefer the OCTOPUS_SPACE environment variable
  space: string
  // Required
  project: string
  releaseNumber: string
  environments: string[]

  // Optional
  useGuidedFailure?: boolean
  variables?: Map<string, string>
}

export function getInputParameters(): InputParameters {
  let variablesMap: Map<string, string> | undefined = undefined
  const variables = getMultilineInput('variables').map(p => p.trim()) || undefined
  if (variables) {
    variablesMap = new Map()
    for (const variable of variables) {
      const variableMap = variable.split(':').map(x => x.trim())
      variablesMap?.set(variableMap[0], variableMap[1])
    }
  }

  const parameters: InputParameters = {
    server: getInput('server') || process.env[EnvironmentVariables.URL] || '',
    apiKey: getInput('api_key') || process.env[EnvironmentVariables.ApiKey] || '',
    space: getInput('space') || process.env[EnvironmentVariables.Space] || '',
    project: getInput('project'),
    releaseNumber: getInput('release_number'),
    environments: getMultilineInput('environments').map(p => p.trim()),
    useGuidedFailure: getBooleanInput('use_guided_failure') || undefined,
    variables: variablesMap
  }

  const errors: string[] = []
  if (!parameters.server) {
    errors.push(
      "The Octopus instance URL is required, please specify explictly through the 'server' input or set the OCTOPUS_URL environment variable."
    )
  }
  if (!parameters.apiKey) {
    errors.push(
      "The Octopus API Key is required, please specify explictly through the 'api_key' input or set the OCTOPUS_API_KEY environment variable."
    )
  }
  if (!parameters.space) {
    errors.push(
      "The Octopus space name is required, please specify explictly through the 'space' input or set the OCTOPUS_SPACE environment variable."
    )
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }

  return parameters
}
