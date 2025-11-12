import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'
import { Client } from '@octopusdeploy/api-client'
import { listEnvironments } from '../../src/api-wrapper'

describe('listEnvironments', () => {
  const testData = {
    spaceName: 'Default',
    spaceId: 'Spaces-1',
    apiKey: 'API-XXXXXXXXXXXXXXXXXXXXXXXX',
    environmentId1: 'Environments-123',
    environmentId2: 'Environments-124',
    environmentName1: 'Production',
    environmentName2: 'Staging'
  }

  // Test cases: ??
  // - existing: deploys a release to two static envs

  // unit test - hits v2 - doesnt exist - returns a 404
  // v2 does exist but returns empty array

  const mockClient = {
    debug: jest.fn()
  } as unknown as Client

  describe('when v2 endpoint is available', () => {
    test('should successfully retrieve environments using v2 endpoint', async () => {
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
        })
      )
      server.listen()

      const result = await listEnvironments(mockClient, testData.spaceName, envIds)

      expect(result.Items).toHaveLength(2)
      expect(result.Items[0].Name).toBe(testData.environmentName1)
      expect(result.Items[1].Name).toBe(testData.environmentName2)

      server.close()
    })
  })
})
