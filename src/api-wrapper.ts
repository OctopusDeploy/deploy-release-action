import { InputParameters } from './input-parameters'
import {
  Client,
  CreateDeploymentUntenantedCommandV1,
  EnvironmentRepository,
  EnvironmentV2Repository,
  DeploymentRepository,
  DeploymentEnvironmentV2,
  DeploymentEnvironment,
  ResourceCollection,
  ServerTask,
  ServerTaskWaiter,
  TaskState
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
    Variables: parameters.variables,
    RunAt: parameters.runAt,
    NoRunAfter: parameters.noRunAfter
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

  const environments = await listEnvironments(client, envIds, parameters.space)
  if (!environmentsFound(environments)) {
    throw new Error(
      'Could not retrieve environment details. If you are deploying to an ephemeral environment please ensure you are using Octopus Server version 2025.4+.'
    )
  }

  const results = response.DeploymentServerTasks.map(x => {
    return {
      serverTaskId: x.ServerTaskId,
      environmentName: environments.Items.filter(
        e => e.Id === deployments.Items.filter(d => d.TaskId === x.ServerTaskId)[0].EnvironmentId
      )[0].Name
    }
  })

  if (parameters.waitForDeployment) {
    client.info(`⏳ Waiting for deployment${response.DeploymentServerTasks.length > 1 ? 's' : ''    } to complete...`)
    const waiter = new ServerTaskWaiter(client, parameters.space)
    const completedTasks = await waiter.waitForServerTasksToComplete(
      results.map(r => r.serverTaskId),
      5000,
      parameters.deploymentTimeoutMinutes * 60 * 1000,
      (serverTask: ServerTask): void => {
        client.info(`Waiting for task ${serverTask.Id}. Current status: ${serverTask.State}`)
      }
    )

    const failedTasks = completedTasks.filter(t => t.State !== TaskState.Success)
    if (failedTasks.length > 0) {
      const summary = failedTasks.map(t => `${t.Id} (${t.State})`).join(', ')
      throw new Error(`One or more deployments did not complete successfully: ${summary}`)
    }

    client.info(`✅ The deployment${
        response.DeploymentServerTasks.length > 1 ? 's' : ''
    } completed successfully!`)
  }

  return results
}

function environmentsFound(environments: ResourceCollection<DeploymentEnvironmentV2 | DeploymentEnvironment>): boolean {
  return !!environments?.Items && environments.Items.length > 0
}

export async function listEnvironments(
  client: Client,
  envIds: string[],
  spaceName: string
): Promise<ResourceCollection<DeploymentEnvironmentV2 | DeploymentEnvironment>> {
  const environmentV1Repository = new EnvironmentRepository(client, spaceName)
  const environmentV2Repository = new EnvironmentV2Repository(client, spaceName)

  let environments: ResourceCollection<DeploymentEnvironmentV2 | DeploymentEnvironment>

  try {
    environments = await environmentV2Repository.list({ ids: envIds, skip: 0, take: envIds.length })
  } catch (error) {
    // Catch cases in which GetEnvironmentsRequestV2 capability is toggled off or not available on Octopus Server version.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((error as any)?.StatusCode === 404) {
      client.debug('List environments v2 endpoint may be unavailable. Checking v1 endpoint...')
      environments = await environmentV1Repository.list({ ids: envIds, take: envIds.length })
    } else {
      throw error
    }
  }

  if (!environmentsFound(environments)) {
    // Catch cases where the environmentsV2Repository returns an empty response due to a
    // pre-2025.4 compatibility issue taking multiple ID parameters from the Octopus API client.
    client.debug('Found no matching environments. Rechecking with v1 endpoint...')
    environments = await environmentV1Repository.list({ ids: envIds, take: envIds.length })
  }

  return environments
}
