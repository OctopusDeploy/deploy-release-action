# deploy-release-action

<img alt= "" src="https://github.com/OctopusDeploy/deploy-release-action/raw/main/assets/github-actions-octopus.png" />

This is a GitHub Action to deploy a release in [Octopus Deploy](https://octopus.com/).

## Deployments in Octopus Deploy

A release is a snapshot of the deployment process and the associated assets (packages, scripts, variables) as they existed when the release was created. The release is given a version number, and you can deploy that release as many times as you need to, even if parts of the deployment process have changed since the release was created (those changes will be included in future releases but not in this version).

When you deploy the release, you are executing the deployment process with all the associated details, as they existed when the release was created.

More information about releases and deployments in Octopus Deploy:

- [Releases](https://octopus.com/docs/releases)
- [Deployments](https://octopus.com/docs/deployments)

## Examples

Incorporate the following actions in your workflow to deploy a release in Octopus Deploy using an API key, a target instance (i.e. `server`), and a project:

```yml
env:

steps:
  # ...
  - name: Deploy a release in Octopus Deploy 🐙
    uses: OctopusDeploy/deploy-release-action@v3
    env:
      OCTOPUS_API_KEY: ${{ secrets.API_KEY  }}
      OCTOPUS_URL: ${{ secrets.SERVER }}
      OCTOPUS_SPACE: 'Outer Space'
    with:
      project: 'MyProject'
      release_version: '1.0.0'
      environments: |
        Dev
        Test
      variables: |
        Foo: Bar
        Fizz: Buzz
```

## ✍️ Environment Variables

| Name              | Description                                                                                                                                          |
| :---------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OCTOPUS_URL`     | The base URL hosting Octopus Deploy (i.e. `https://octopus.example.com`). It is strongly recommended that this value retrieved from a GitHub secret. |
| `OCTOPUS_API_KEY` | The API key used to access Octopus Deploy. It is strongly recommended that this value retrieved from a GitHub secret.                                |
| `OCTOPUS_SPACE`   | The Name of a space within which this command will be executed.                                                                                      |

## 📥 Inputs

| Name                 | Description                                                                                                                                                                                                  |
| :------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `project`            | **Required.** The name of the project associated with this release.                                                                                                                                          |
| `release_number`     | **Required.** The release number to deploy.                                                                                                                                                                  |
| `environments`       | **Required.** The list of environment names to deploy to.                                                                                                                                                    |
| `use_guided_failure` | Whether to use guided failure mode if errors occur during the deployment.                                                                                                                                    |
| `variables`          | A multi-line list of prompted variable values. Format: name:value.                                                                                                                                           |
| `server`             | The instance URL hosting Octopus Deploy (i.e. "https://octopus.example.com/"). The instance URL is required, but you may also use the OCTOPUS_URL environment variable.                                      |
| `api_key`            | The API key used to access Octopus Deploy. An API key is required, but you may also use the OCTOPUS_API_KEY environment variable. It is strongly recommended that this value retrieved from a GitHub secret. |
| `space`              | The name of a space within which this command will be executed. The space name is required, but you may also use the OCTOPUS_SPACE environment variable.                                                     |

## 📤 Outputs

| Name           | Description                                                                                                                                                                                                                              |
| :------------- | :--------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `server_tasks` | JSON array of objects containing the Octopus Deploy server tasks Ids (`serverTaskId`) and environment name (`environmentName`) for the executions tasks that were queued. Use the `await-task-action`to wait for any/all of these tasks. |

## 🤝 Contributions

Contributions are welcome! :heart: Please read our [Contributing Guide](.github/CONTRIBUTING.md) for information about how to get involved in this project.
