import { Client, DeploymentEnvironmentV2, ResourceCollection, spaceScopedRoutePrefix } from '@octopusdeploy/api-client'

// CC TEMPORARY FOR TESTING ONLY!!

type EnvironmentV2RepositoryListArgs = {
  ids?: string[]
  partialName?: string
  skip: number
  take: number
}

export class EnvironmentV2Repository {
  private client: Client
  private spaceName: string

  constructor(client: Client, spaceName: string) {
    this.client = client
    this.spaceName = spaceName
  }

  async list(args?: EnvironmentV2RepositoryListArgs): Promise<ResourceCollection<DeploymentEnvironmentV2>> {
    return this.client.request(`${spaceScopedRoutePrefix}/environments/v2{?ids,partialName,skip,take}`, {
      spaceName: this.spaceName,
      ...args
    })
  }
}
