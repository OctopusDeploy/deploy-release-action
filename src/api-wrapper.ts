import { InputParameters } from './input-parameters'
import { Client, deployReleaseUntenanted, CreateDeploymentUntenantedCommandV1 } from '@octopusdeploy/api-client'

export async function createDeploymentFromInputs(client: Client, parameters: InputParameters): Promise<string[]> {
  client.info('🐙 Deploying a release in Octopus Deploy...')

  const command: CreateDeploymentUntenantedCommandV1 = {
    spaceName: parameters.space,
    projectName: parameters.project,
    releaseVersion: parameters.releaseNumber,
    environmentNames: parameters.environments,
    useGuidedFailure: parameters.useGuidedFailure,
    variables: parameters.variables
  }

  const response = await deployReleaseUntenanted(client, command)

  client.info(`🎉 Deployment(s) queued successfully!`)

  return response.deploymentServerTasks.map(x => x.serverTaskId)
}
