import * as cdk from 'aws-cdk-lib';
import { BuildSpec, LinuxBuildImage, PipelineProject } from 'aws-cdk-lib/aws-codebuild';
import { Artifact, Pipeline } from 'aws-cdk-lib/aws-codepipeline';
import { CloudFormationCreateUpdateStackAction, CodeBuildAction, GitHubSourceAction } from 'aws-cdk-lib/aws-codepipeline-actions';
import { Construct } from 'constructs';
import { ServiceStack } from './stacks/service-stack';
// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class PipelineAwsCdkStack extends cdk.Stack {
  private readonly pipeline: Pipeline;
  private readonly cdkBuildOutput: Artifact;
  private readonly serviceBuildOutput: Artifact;

  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    this.pipeline = new Pipeline(this, 'Pipeline', {
      pipelineName : 'Pipeline',
      crossAccountKeys: false,
      restartExecutionOnUpdate : true
    })

    const cdkSourceOutput = new Artifact('CDKSourceOutput')
    const serviceSourceOutput = new Artifact('ServiceSourceOutput')

    this.pipeline.addStage({
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

    this.cdkBuildOutput = new Artifact('CdkBuildOutput')
    this.serviceBuildOutput = new Artifact('ServiceBuildOutput')

    this.pipeline.addStage({
      stageName: 'Build',
      actions:[
        new CodeBuildAction({
          actionName: "CDK_Build",
          input: cdkSourceOutput,
          outputs: [this.cdkBuildOutput],
          project: new PipelineProject(this, "CdkBuildProject", {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0,
            },
            buildSpec: BuildSpec.fromSourceFilename(
              "build-specs/cdk-build-spec.yml"
            ),
          }),
        }),
        new CodeBuildAction({
          actionName: 'SERVICE_BUILD',
          input: serviceSourceOutput,
          outputs: [this.serviceBuildOutput],
          project: new PipelineProject(this, 'ServiceBuildProject', {
            environment: {
              buildImage: LinuxBuildImage.STANDARD_5_0
            },
            buildSpec: BuildSpec.fromSourceFilename('build-specs/service-build-specs.yaml')
          })
        })
      ]
    })

    this.pipeline.addStage({
      stageName: 'Pipeline_Update',
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: 'Pipeline_Update', 
          stackName: 'PipelineAwsCdkStack',
          templatePath: this.cdkBuildOutput.atPath('PipelineAwsCdkStack.template.json'),
          adminPermissions: true
        })
      ]
    })
  }


  public addServiceStage(serviceStack : ServiceStack, stageName:  string){
    this.pipeline.addStage({
      stageName: stageName, 
      actions: [
        new CloudFormationCreateUpdateStackAction({
          actionName: 'Service_Update', 
          stackName: serviceStack.stackName,
          templatePath: this.cdkBuildOutput.atPath(`${serviceStack.stackName}.template.json`),
          adminPermissions: true,
          parameterOverrides : {
            ...serviceStack.serviceCode.assign(this.serviceBuildOutput.s3Location)
          },
          extraInputs: [this.serviceBuildOutput]
        })
      ]
    })
  }
}
