import * as cdk from 'aws-cdk-lib';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class PipelineAwsCdkStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'PipelineAwsCdkQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });
    const pipeline = new Pipeline(this, 'PipelineStack', {
      pipelineName : 'Pipeline_Demo',
      crossAccountKeys: false
    })

    const sourceOutput = new Artifact('SourceArtifact')

    pipeline.addStage({
      stageName: 'Source',
      actions: [
        new GitHubSourceAction({
          owner: 'jninus',
          repo: 'aws-pipeline',
          branch: 'master',
          actionName: 'Pipeline_Source',
          oauthToken: cdk.SecretValue.secretsManager('github-token'),
          output: sourceOutput
        })
      ]
    })

    const cdkBuildOutput = new Artifact('CdkBuildOutput')

    pipeline.addStage({
      stageName: 'Build',
      actions:[
        new CodeBuildAction({
          actionName: 'CDK_BUILD',
          input: sourceOutput,
          outputs: [cdkBuildOutput],
          project: new PipelineProject(this, 'CdkBuildProject', {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: BuildSpec.fromSourceFilename('build-specs/cdk-build-spec.yaml')
          })
        })
      ]
    })
  }
}
