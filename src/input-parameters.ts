import { getBooleanInput, getInput, getMultilineInput } from '@actions/core'
import { PromptedVariableValues } from '@octopusdeploy/api-client'

const EnvironmentVariables = {
  URL: 'OCTOPUS_URL',
  ApiKey: 'OCTOPUS_API_KEY',
  AccessToken: 'OCTOPUS_ACCESS_TOKEN',
  Space: 'OCTOPUS_SPACE'
} as const

export interface InputParameters {
  // Optional: A server is required, but you should use the OCTOPUS_URL env
  server: string
  // Optional: An API key is required, but you should use the OCTOPUS_API_KEY environment variable instead of this.
  apiKey?: string
  // Optional: Access token can only be obtained from the OCTOPUS_ACCESS_TOKEN environment variable.
  accessToken?: string
  // Optional: You should prefer the OCTOPUS_SPACE environment variable
  space: string
  // Required
  project: string
  releaseNumber: string
  environments: string[]

  // Optional
  useGuidedFailure?: boolean
  variables?: PromptedVariableValues
}

export function getInputParameters(): InputParameters {
  let variablesMap: PromptedVariableValues | undefined = undefined
  const variables = getMultilineInput('variables').map(p => p.trim()) || undefined
  if (variables) {
    variablesMap = {}
    for (const variable of variables) {
      const variableMap = variable.split(':').map(x => x.trim())
      variablesMap[variableMap[0]] = variableMap[1]
    }
  }

  const parameters: InputParameters = {
    server: getInput('server') || process.env[EnvironmentVariables.URL] || '',
    apiKey: getInput('api_key') || process.env[EnvironmentVariables.ApiKey],
    accessToken: process.env[EnvironmentVariables.AccessToken],
    space: getInput('space') || process.env[EnvironmentVariables.Space] || '',
    project: getInput('project', { required: true }),
    releaseNumber: getInput('release_number', { required: true }),
    environments: getMultilineInput('environments', { required: true }).map(p => p.trim()),
    useGuidedFailure: getBooleanInput('use_guided_failure') || undefined,
    variables: variablesMap
  }

  const errors: string[] = []
  if (!parameters.server) {
    errors.push(
      "The Octopus instance URL is required, please specify explicitly through the 'server' input or set the OCTOPUS_URL environment variable."
    )
  }
// temp: Make github run things
  if (!parameters.apiKey && !parameters.accessToken) {
    errors.push(
      "The Octopus API Key is required, please specify explicitly through the 'api_key' input or set the OCTOPUS_API_KEY environment variable."
    )
  }

  if (!parameters.space) {
    errors.push(
      "The Octopus space name is required, please specify explicitly through the 'space' input or set the OCTOPUS_SPACE environment variable."
    )
  }

  if (errors.length > 0) {
    throw new Error(errors.join('\n'))
  }

  return parameters
}
