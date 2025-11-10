// import { EnvironmentV2Repository } from './environment-v2-repository'
import { InputParameters } from './input-parameters'
import {
  Client,
  CreateDeploymentUntenantedCommandV1,
  EnvironmentRepository,
  EnvironmentV2Repository,
  DeploymentRepository,
  DeploymentEnvironmentV2,
  DeploymentEnvironment,
  ResourceCollection
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

  const deploymentRepository = new DeploymentRepository(client, parameters.space)
  const response = await deploymentRepository.create(command)

  client.info(
    `🎉 ${response.DeploymentServerTasks.length} Deployment${
      response.DeploymentServerTasks.length > 1 ? 's' : ''
    } queued successfully!`
  )

  if (response.DeploymentServerTasks.length === 0) {
    throw new Error('Expected at least one deployment to be queued.')
  }
  if (
    response.DeploymentServerTasks[0].ServerTaskId === null ||
    response.DeploymentServerTasks[0].ServerTaskId === undefined
  ) {
    throw new Error('Server task id was not deserialized correctly.')
  }

  const deploymentIds = response.DeploymentServerTasks.map(x => x.DeploymentId)

  const deployments = await deploymentRepository.list({ ids: deploymentIds, take: deploymentIds.length })

  const envIds = deployments.Items.map(d => d.EnvironmentId)
  let environments: ResourceCollection<DeploymentEnvironmentV2 | DeploymentEnvironment>
  const environmentsV2Repository = new EnvironmentV2Repository(client, parameters.space) // can dodgey this up!!! Can push this up and test the action :D
  try {
    environments = await environmentsV2Repository.list({ ids: envIds, skip: 0, take: envIds.length })

    if (environments.Items.length === 0) {
      // Catches cases where the environmentsV2Repository returns an empty array due to a
      // historical compatibility issue taking multiple ID parameters from the Octopus API client.
      environments = await fallBackToEnvironmentRepository(client, parameters.space, envIds)
    }
  } catch (error) {
    // Catch cases in which GetEnvironmentsRequestV2 cabability is toggled off or not available on Octopus Server version.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.response?.status === 404) {
      environments = await fallBackToEnvironmentRepository(client, parameters.space, envIds)
    } else {
      throw error
    }
  }

  const results = response.DeploymentServerTasks.map(x => {
    return {
      serverTaskId: x.ServerTaskId,
      environmentName: environments.Items.filter(
        e => e.Id === deployments.Items.filter(d => d.TaskId === x.ServerTaskId)[0].EnvironmentId
      )[0].Name
    }
  })

  return results
}

async function fallBackToEnvironmentRepository(
  client: Client,
  spaceName: string,
  envIds: string[]
): Promise<ResourceCollection<DeploymentEnvironmentV2 | DeploymentEnvironment>> {
  const envRepository = new EnvironmentRepository(client, spaceName)
  return await envRepository.list({ ids: envIds, take: envIds.length })
}
