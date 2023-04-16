import { CfnOutput, Stack, StackProps } from "aws-cdk-lib";
import { CfnParametersCode, Code, Function, Runtime } from "aws-cdk-lib/aws-lambda";
import { Construct } from "constructs";
import * as apigateway from "aws-cdk-lib/aws-apigateway"
import { CfnHttpApi } from "aws-cdk-lib/aws-sam";
import { LambdaProxyIntegration } from "@aws-cdk/aws-apigatewayv2-integrations";

export class ServiceStack extends Stack {
    public readonly serviceCode: CfnParametersCode
    constructor(scope : Construct , id: string , props ?: StackProps){
        super(scope, id , props);
        this.serviceCode = Code.fromCfnParameters();

        const lambdaTest = new Function(this, 'Servicelmabda', {
            runtime : Runtime.NODEJS_18_X,
            handler: 'src/lambda.handler',
            code: this.serviceCode,
            functionName: 'ServiceLambda'
        });

        const api = new apigateway.RestApi(this, 'ServiceApi',  {
            restApiName : 'My API',
            description: 'example api gateway',
            // 👇 enable CORS
            defaultCorsPreflightOptions: {
              allowHeaders: [
                'Content-Type',
                'X-Amz-Date',
                'Authorization',
                'X-Api-Key',
              ],
              allowMethods: ['OPTIONS', 'GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
              allowCredentials: true,
              allowOrigins: ['http://localhost:3000'],
            },
          })

          // 👇 create an Output for the API URL
        new CfnOutput(this, 'apiUrl', {value: api.url});
        api.root.addResource('hello')
        api.root.addMethod(
            'GET', 
            new apigateway.LambdaIntegration(lambdaTest, {proxy : true})
        )
    }
}