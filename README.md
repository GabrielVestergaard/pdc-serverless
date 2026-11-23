# Paradise Donut Co.: serverless prototype

A three-store donut menu (Provo, Honolulu, and Sydney) served from S3 + CloudFront, with the menu loaded live through API Gateway, a Python Lambda, and DynamoDB. Built for the BYU IS AWS Serverless Project.

- Live: https://donuts.lincolnlyons.com/?store=provo
- `template.yaml`: all infrastructure as CloudFormation (the Lambda code is inline)
- `deploy.sh` + `deploy.config`: one-command deploy (CloudShell or GitHub Actions)
- `data/items.json`: store profiles and menu items, loaded into DynamoDB on each deploy
- `site/`: the website (HTML/CSS/JS, no build step)
- `.github/workflows/deploy.yml`: validate, then deploy, then smoke test on every push to main

Team walkthroughs: `GABE.md` (AWS build) and `LINCOLN.md` (site, pipeline, write-up). Assignment PDFs are in `docs/`.
