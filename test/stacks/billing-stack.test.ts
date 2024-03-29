import { App } from "aws-cdk-lib";
import { BillingStack } from "../../lib/stacks/billing-stack";
import { Match, Template } from "aws-cdk-lib/assertions";


test('Billing Stack', ()=> {
    const app = new App();
    const stack = new BillingStack(app, 'BillingStack', {
        budgetAmount:1,
        emailAddress: 'test@example.com'
    })

    expect(Template.fromStack(stack).toJSON()).toMatchSnapshot();
})