import { getInputParameters } from './input-parameters'
import { debug, info, warning, error, setFailed, setOutput, isDebug } from '@actions/core'
import { writeFileSync } from 'fs'
import { Client, ClientConfiguration, Logger } from '@octopusdeploy/api-client'
import { createDeploymentFromInputs } from './api-wrapper'

// GitHub actions entrypoint
;(async (): Promise<void> => {
  try {
    const logger: Logger = {
      debug: message => {
        if (isDebug()) {
          debug(message)
        }
      },
      info: message => info(message),
      warn: message => warning(message),
      error: (message, err) => {
        if (err !== undefined) {
          error(err.message)
        } else {
          error(message)
        }
      }
    }

    const parameters = getInputParameters()

    const config: ClientConfiguration = {
      userAgentApp: 'GitHubActions deploy-release-untenanted-action',
      instanceURL: parameters.server,
      apiKey: parameters.apiKey,
      logging: logger
    }

    const client = await Client.create(config)

    const deploymentResults = await createDeploymentFromInputs(client, parameters)

    if (deploymentResults.length > 0) {
      setOutput(
        'server_tasks',
        deploymentResults.map(t => {
          return {
            serverTaskId: t.serverTaskId,
            environmentName: t.environmentName
          }
        })
      )
    }

    const stepSummaryFile = process.env.GITHUB_STEP_SUMMARY
    if (stepSummaryFile && deploymentResults.length > 0) {
      writeFileSync(stepSummaryFile, `🐙 Octopus Deploy queued deployment(s) in Project **${parameters.project}**.`)
    }
  } catch (e: unknown) {
    if (e instanceof Error) {
      setFailed(e)
    }
  }
})()
