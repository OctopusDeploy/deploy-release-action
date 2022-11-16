import { createDeploymentFromInputs } from '../../src/api-wrapper'
// we use the Octopus API client to setup and teardown integration test data, it doesn't form part of create-release-action at this point
import { PackageRequirement, RunCondition, StartTrigger } from '@octopusdeploy/message-contracts'
import {
  Client,
  ClientConfiguration,
  createRelease,
  CreateReleaseCommandV1,
  Logger,
  Repository
} from '@octopusdeploy/api-client'
import { randomBytes } from 'crypto'
import { CleanupHelper } from './cleanup-helper'
import { RunConditionForAction } from '@octopusdeploy/message-contracts/dist/runConditionForAction'
import { setOutput } from '@actions/core'
import { CaptureOutput } from '../test-helpers'
import { InputParameters } from '../../src/input-parameters'

// NOTE: These tests assume Octopus is running and connectable.
// In the build pipeline they are run as part of a build.yml file which populates
// OCTOPUS_TEST_URL and OCTOPUS_TEST_API_KEY environment variables pointing to docker
// containers that are also running. AND it assumes that 'octo' is in your PATH
//
// If you want to run these locally outside the build pipeline, you need to launch
// octopus yourself, and set OCTOPUS_TEST_CLI_PATH, OCTOPUS_TEST_URL and OCTOPUS_TEST_API_KEY appropriately,
// and put octo in your path somewhere.
// all resources created by this script have a GUID in
// their name so we they don't clash with prior test runs

const apiClientConfig: ClientConfiguration = {
  userAgentApp: 'Test',
  apiKey: process.env.OCTOPUS_TEST_API_KEY || 'API-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXX',
  instanceURL: process.env.OCTOPUS_TEST_URL || 'http://localhost:8050'
}

const runId = randomBytes(16).toString('hex')
const localProjectName = `project${runId}`
let localReleaseNumber = ''

async function createReleaseForTest(client: Client): Promise<void> {
  client.info('🐙 Creating a release in Octopus Deploy...')

  const command: CreateReleaseCommandV1 = {
    spaceName: 'Default',
    projectName: localProjectName
  }

  const allocatedReleaseNumber = await createRelease(client, command)

  client.info(`🎉 Release ${allocatedReleaseNumber.releaseVersion} created successfully!`)

  localReleaseNumber = allocatedReleaseNumber.releaseVersion
}

// experimental. Should probably be a custom jest matcher
function expectMatchAll(actual: string[], expected: (string | RegExp)[]) {
  expect(actual.length).toEqual(expected.length)
  for (let i = 0; i < actual.length; i++) {
    const a = actual[i]
    const e = expected[i]
    if (e instanceof RegExp) {
      expect(a).toMatch(e)
    } else {
      expect(a).toEqual(e)
    }
  }
}

describe('integration tests', () => {
  const globalCleanup = new CleanupHelper()

  const standardInputParameters: InputParameters = {
    server: apiClientConfig.instanceURL,
    apiKey: apiClientConfig.apiKey,
    space: 'Default',
    project: localProjectName,
    releaseNumber: '',
    environments: ['Dev']
  }

  let apiClient: Client
  beforeAll(async () => {
    apiClient = await Client.create({ autoConnect: true, ...apiClientConfig })

    const repository = new Repository(apiClient)

    // pre-reqs: We need a project, which needs to have a deployment process

    const projectGroup = (await repository.projectGroups.all())[0]
    if (!projectGroup) throw new Error("Can't find first projectGroup")

    const devEnv = await repository.environments.create({ Name: 'Dev' })
    const stagingEnv = await repository.environments.create({ Name: 'Staging Demo' })

    const lifeCycle = (await repository.lifecycles.all())[0]
    if (!lifeCycle) throw new Error("Can't find first lifecycle")
    lifeCycle.Phases.push({
      Id: 'test',
      Name: 'Testing',
      OptionalDeploymentTargets: [devEnv.Id, stagingEnv.Id],
      AutomaticDeploymentTargets: [],
      MinimumEnvironmentsBeforePromotion: 1,
      IsOptionalPhase: false
    })
    await repository.lifecycles.modify(lifeCycle)

    const project = await repository.projects.create({
      Name: localProjectName,
      LifecycleId: lifeCycle.Id,
      ProjectGroupId: projectGroup.Id
    })
    globalCleanup.add(() => repository.projects.del(project))

    const deploymentProcess = await repository.deploymentProcesses.get(project.DeploymentProcessId, undefined)
    deploymentProcess.Steps = [
      {
        Condition: RunCondition.Success,
        Links: {},
        PackageRequirement: PackageRequirement.LetOctopusDecide,
        StartTrigger: StartTrigger.StartAfterPrevious,
        Id: '',
        Name: `step1-${runId}`,
        Properties: {},
        Actions: [
          {
            Id: '',
            Name: 'Run a Script',
            ActionType: 'Octopus.Script',
            Notes: null,
            IsDisabled: false,
            CanBeUsedForProjectVersioning: false,
            IsRequired: false,
            WorkerPoolId: null,
            Container: {
              Image: null,
              FeedId: null
            },
            WorkerPoolVariable: '',
            Environments: [],
            ExcludedEnvironments: [],
            Channels: [],
            TenantTags: [],
            Packages: [],
            Condition: RunConditionForAction.Success,
            Properties: {
              'Octopus.Action.RunOnServer': 'true',
              'Octopus.Action.Script.ScriptSource': 'Inline',
              'Octopus.Action.Script.Syntax': 'Bash',
              'Octopus.Action.Script.ScriptBody': "echo 'hello'"
            },
            Links: {}
          }
        ]
      }
    ]

    await repository.deploymentProcesses.saveToProject(project, deploymentProcess)
  })

  afterAll(() => {
    if (process.env.GITHUB_ACTIONS) {
      // Sneaky: if we are running inside github actions, we *do not* cleanup the octopus server project data.
      // rather, we leave it lying around and setOutput the random project name so the GHA self-test can use it
      setOutput('gha_selftest_project_name', localProjectName)
      setOutput('gha_selftest_release_number', localReleaseNumber)
    } else {
      globalCleanup.cleanup()
    }
  })

  test('can deploy a release', async () => {
    const output = new CaptureOutput()

    const logger: Logger = {
      debug: message => output.debug(message),
      info: message => output.info(message),
      warn: message => output.warn(message),
      error: (message, err) => {
        if (err !== undefined) {
          output.error(err.message)
        } else {
          output.error(message)
        }
      }
    }

    const config: ClientConfiguration = {
      userAgentApp: 'Test',
      instanceURL: apiClientConfig.instanceURL,
      apiKey: apiClientConfig.apiKey,
      logging: logger
    }

    const client = await Client.create(config)

    await createReleaseForTest(client)
    standardInputParameters.releaseNumber = localReleaseNumber
    const result = await createDeploymentFromInputs(client, standardInputParameters)

    // The first release in the project, so it should always have 0.0.1
    expect(result.length).toBe(1)

    expect(output.getAllMessages()).toContain(`[INFO] 🎉 1 Deployment queued successfully!`)
  })
})
