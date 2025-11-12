import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { Client, ClientConfiguration } from '@octopusdeploy/api-client'
import { listEnvironments } from '../../src/api-wrapper'

describe('listEnvironments', () => {
  const testData = {
    server: 'https://my.octopus.app',
    spaceName: 'Default',
    apiKey: 'API-XXXXXXXXXXXXXXXXXXXXXXXX',
    environmentId1: 'Environments-123',
    environmentId2: 'Environments-124',
    environmentName1: 'Production',
    environmentName2: 'Staging'
  }

  const config: ClientConfiguration = {
    userAgentApp: 'GitHubActions deprovision-ephemeral-environment',
    instanceURL: testData.server,
    apiKey: testData.apiKey
  }

  // When running a version of Octopus Server without EE's enabled
  describe('when v2 endpoint is not available', () => {
    test('should successfully retrieve environments using v1 endpoint', async () => {
      const envIds = [testData.environmentId1, testData.environmentId2]

      const server = setupServer(
        http.get('https://my.octopus.app/api/:spaceId/environments/v2', () => {
          return HttpResponse.json({ message: 'Not Found' }, { status: 404 })
        }),
        http.get('https://my.octopus.app/api/:spaceId/environments', () => {
          return HttpResponse.json({
            Items: [
              {
                Id: testData.environmentId1,
                Name: testData.environmentName1
              },
              {
                Id: testData.environmentId2,
                Name: testData.environmentName2
              }
            ]
          })
        }),
        http.get('https://my.octopus.app/api', () => {
          return HttpResponse.json([{}])
        }),
        http.get('https://my.octopus.app/api/spaces', () => {
          return HttpResponse.json({
            Items: [
              {
                Name: 'Default',
                Id: 'Spaces-1'
              }
            ]
          })
        })
      )
      server.listen()

      const client = await Client.create(config)

      const environments = await listEnvironments(client, envIds, testData.spaceName)

      expect(environments.Items).toHaveLength(2)
      expect(environments.Items[0].Name).toBe(testData.environmentName1)
      expect(environments.Items[1].Name).toBe(testData.environmentName2)

      server.close()
    })
  })

  // When running a version of Octopus Server with EE's enabled before 2025.4
  describe('when v2 endpoint cannot find environments', () => {
    test('should successfully retrieve environments using v1 endpoint', async () => {
      const envIds = [testData.environmentId1, testData.environmentId2]

      const server = setupServer(
        http.get('https://my.octopus.app/api/:spaceId/environments/v2', () => {
          return HttpResponse.json({ Items: [] })
        }),
        http.get('https://my.octopus.app/api/:spaceId/environments', () => {
          return HttpResponse.json({
            Items: [
              {
                Id: testData.environmentId1,
                Name: testData.environmentName1
              },
              {
                Id: testData.environmentId2,
                Name: testData.environmentName2
              }
            ]
          })
        }),
        http.get('https://my.octopus.app/api', () => {
          return HttpResponse.json([{}])
        }),
        http.get('https://my.octopus.app/api/spaces', () => {
          return HttpResponse.json({
            Items: [
              {
                Name: 'Default',
                Id: 'Spaces-1'
              }
            ]
          })
        })
      )
      server.listen()

      const client = await Client.create(config)

      const environments = await listEnvironments(client, envIds, testData.spaceName)

      expect(environments.Items).toHaveLength(2)
      expect(environments.Items[0].Name).toBe(testData.environmentName1)
      expect(environments.Items[1].Name).toBe(testData.environmentName2)

      server.close()
    })
  })
})
