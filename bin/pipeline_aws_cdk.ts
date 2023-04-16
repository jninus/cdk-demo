#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { PipelineAwsCdkStack } from '../lib/pipeline_aws_cdk-stack';
import { BillingStack } from '../lib/stacks/billing-stack';
import { ServiceStack } from '../lib/stacks/service-stack';

const app = new cdk.App();
const pipelineStack = new PipelineAwsCdkStack(app, 'PipelineAwsCdkStack', {});
new BillingStack(app, 'BillingStack', {
  budgetAmount: 5,
  emailAddress: 'reda.zejli@gmail.com'
});

const serviceStackProd = new ServiceStack(app, 'ServiceStackProd')

pipelineStack.addServiceStage(serviceStackProd, 'Prod')

