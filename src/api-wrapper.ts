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
    ProjectName: parameters.project,
    ReleaseVersion: parameters.releaseNumber,
    EnvironmentNames: parameters.environments,
    UseGuidedFailure: parameters.useGuidedFailure,
    Variables: parameters.variables
  }

  const response = await deployReleaseUntenanted(client, command)

  client.info(
    `🎉 ${response.DeploymentServerTasks.length} Deployment${
      response.DeploymentServerTasks.length > 1 ? 's' : ''
    } queued successfully!`
  )

  const deploymentIds = response.DeploymentServerTasks.map(x => x.deploymentId)

  const deploymentRepository = new DeploymentRepository(client, parameters.space)
  const deployments = await deploymentRepository.list({ ids: deploymentIds, take: deploymentIds.length })

  const envIds = deployments.Items.map(d => d.EnvironmentId)
  const envRepository = new EnvironmentRepository(client, parameters.space)
  const environments = await envRepository.list({ ids: envIds, take: envIds.length })

  const results = response.DeploymentServerTasks.map(x => {
    return {
      serverTaskId: x.serverTaskId,
      environmentName: environments.Items.filter(
        e => e.Id === deployments.Items.filter(d => d.TaskId === x.serverTaskId)[0].EnvironmentId
      )[0].Name
    }
  })

  return results
}
