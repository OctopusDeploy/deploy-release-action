import { InputParameters } from './input-parameters'
import { TaskResource } from '@octopusdeploy/message-contracts'
import {
  Client,
  deployReleaseUntenanted,
  CreateDeploymentUntenantedCommandV1,
  getServerTasks
} from '@octopusdeploy/api-client'

export async function createDeploymentFromInputs(client: Client, parameters: InputParameters): Promise<TaskResource[]> {
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

  client.info(
    `🎉 ${response.deploymentServerTasks.length} Deployment${
      response.deploymentServerTasks.length > 1 ? 's' : ''
    } queued successfully!`
  )

  const serverTaskIds = response.deploymentServerTasks.map(x => x.serverTaskId)

  var serverTasks = await getServerTasks(client, parameters.space, serverTaskIds)

  return serverTasks
}
