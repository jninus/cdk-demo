import * as cdk from 'aws-cdk-lib';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class PipelineAwsCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName : 'Pipeline',
      crossAccountKeys: false,
      restartExecutionOnUpdate : true
    })

    const cdkSourceOutput = new Artifact('CDKSourceOutput')
    const serviceSourceOutput = new Artifact('ServiceSourceOutput')

    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new GitHubSourceAction({
          owner: 'jninus',
          repo: 'cdk-demo',
          branch: 'main',
          actionName: 'Pipeline_Source',
          oauthToken: cdk.SecretValue.secretsManager('github-token'),
          output: cdkSourceOutput
        }),
        new GitHubSourceAction({
          owner: 'jninus',
          repo: 'express-example',
          branch: 'main',
          actionName: 'Service_Source',
          oauthToken: cdk.SecretValue.secretsManager('github-token'),
          output: serviceSourceOutput
        })
      ]
    })

    const cdkBuildOutput = new Artifact('CdkBuildOutput')
    const serviceBuildOutput = new Artifact('CdkBuildOutput')

    pipeline.addStage({
      stageName: 'Build',
      actions:[
        new CodeBuildAction({
          actionName: 'CDK_BUILD',
          input: serviceSourceOutput,
          outputs: [cdkBuildOutput],
          project: new PipelineProject(this, 'CdkBuildProject', {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: BuildSpec.fromSourceFilename('build-specs/cdk-build-spec.yaml')
          })
        }),
        new CodeBuildAction({
          actionName: 'SERVICE_BUILD',
          input: serviceSourceOutput,
          outputs: [serviceBuildOutput],
          project: new PipelineProject(this, 'ServiceBuildProject', {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: BuildSpec.fromSourceFilename('build-specs/service-build-specs.yaml')
          })
        })
      ]
    })

    pipeline.addStage({
      stageName: 'Pipeline_Update',
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: 'Pipeline_Update', 
          stackName: 'PipelineAwsCdkStack',
          templatePath: cdkBuildOutput.atPath('PipelineAwsCdkStack.template.json'),
          adminPermissions: true
        })
      ]
    })
  }
}
