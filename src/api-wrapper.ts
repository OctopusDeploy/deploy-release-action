import { InputParameters } from './input-parameters'
import {
  Client,
  deployReleaseUntenanted,
  CreateDeploymentUntenantedCommandV1,
  EnvironmentRepository,
  DeploymentRepository
} from '@octopusdeploy/api-client'

export interface DeploymentResult {
  serverTaskId: string
  environmentName: string
}

export async function createDeploymentFromInputs(
  client: Client,
  parameters: InputParameters
): Promise<DeploymentResult[]> {
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

  const deploymentIds = response.deploymentServerTasks.map(x => x.deploymentId)

  const deploymentRepository = new DeploymentRepository(client)
  const deployments = await deploymentRepository.list({ ids: deploymentIds, take: deploymentIds.length })

  const envIds = deployments.Items.map(d => d.EnvironmentId)
  const envRepository = new EnvironmentRepository(client)
  const environments = await envRepository.list({ ids: envIds, take: envIds.length })

  const results = response.deploymentServerTasks.map(x => {
    return {
      serverTaskId: x.serverTaskId,
      environmentName: environments.Items.filter(
        e => e.Id === deployments.Items.filter(d => d.Id === x.deploymentId)[0].Id
      )[0].Name
    }
  })

  return results
}
