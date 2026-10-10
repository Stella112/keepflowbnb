# Disclaimer

**bnbagent-studio** is open-source software provided under the [Apache-2.0 license](https://github.com/bnb-chain/bnbagent-studio/blob/main/LICENSE) **"AS IS", without warranty of any kind** (see Sections 7-8 of the license). This file spells out what that means for the parts of the project that touch your cloud account and your funds.

## AWS permissions and resources

Deploying the seller agent provisions resources **in your own AWS account**: Bedrock AgentCore and Secrets Manager for the Agent, plus the Cognito user pool and per-agent M2M client that the delegated deploy creates for inbound OAuth2.

The [AgentCore least-privilege IAM guide](https://github.com/bnb-chain/bnbagent-studio/blob/main/docs/guides/agentcore-deploy-iam.md) is a **reference configuration**, provided AS IS. It is a best effort at a least-privilege setup, but **you** apply them, **you** own the credentials, and **you** remain solely responsible for:

- reviewing and scoping every policy before applying it to your account;
- the conduct of any identity that holds these permissions;
- all resulting AWS costs; and
- the security posture and operation of the deployed resources.

Before granting any permission, read the official AWS guidance:

- [AWS IAM best practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [AWS Well-Architected Framework - security pillar](https://docs.aws.amazon.com/wellarchitected/latest/framework/security.html)

## Wallet keys and on-chain funds

The software manages wallet keys and on-chain funds. Private keys live only in environments you control - which also means only **you** can protect them. Start on testnet, fund mainnet wallets only with amounts you can afford to lose, and use the software at your own risk. Nothing in this project is financial advice.

## No liability

To the maximum extent permitted by law, the authors and contributors accept no liability for damages of any kind arising from the use of this software - including, without limitation, lost funds, compromised credentials, unexpected cloud charges, or security incidents in your AWS account. The [Apache-2.0 license](https://github.com/bnb-chain/bnbagent-studio/blob/main/LICENSE) is the authoritative statement of the terms.
