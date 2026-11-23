#!/usr/bin/env bash
# Deploys the whole PDC app: CloudFormation stack -> DynamoDB menu data -> website to S3 -> CloudFront refresh.
# Run it from AWS CloudShell (first deploy) or let GitHub Actions run it on every push to main.
# Safe to re-run any time.
set -euo pipefail
cd "$(dirname "$0")"
source ./deploy.config
export AWS_PAGER=""
export AWS_DEFAULT_REGION="$REGION"

if [[ "$GITHUB_REPO" == CHANGE-ME/* ]]; then
  echo "Edit deploy.config first: set GITHUB_REPO to your owner/repo." >&2
  exit 1
fi

params=("GitHubRepo=$GITHUB_REPO" "DomainName=$DOMAIN" "CreateGitHubOIDCProvider=$CREATE_OIDC")
[[ -n "$CERT_ARN" ]] && params+=("CertificateArn=$CERT_ARN")
[[ -n "$ALERT_EMAIL" ]] && params+=("AlertEmail=$ALERT_EMAIL")

echo "==> 1/5 Deploying CloudFormation stack '$STACK' (first run takes 5-10 min for CloudFront)..."
aws cloudformation deploy \
  --stack-name "$STACK" \
  --template-file template.yaml \
  --capabilities CAPABILITY_NAMED_IAM \
  --no-fail-on-empty-changeset \
  --parameter-overrides "${params[@]}"

out() {
  aws cloudformation describe-stacks --stack-name "$STACK" \
    --query "Stacks[0].Outputs[?OutputKey=='$1'].OutputValue" --output text
}
SITE_URL=$(out SiteURL)
CF_DOMAIN=$(out CloudFrontDomain)
DIST_ID=$(out DistributionId)
API=$(out ApiEndpoint)
BUCKET=$(out BucketName)
TABLE=$(out TableName)
ROLE=$(out DeployRoleArn)

echo "==> 2/5 Loading the menu into DynamoDB table '$TABLE'..."
rm -rf .build && mkdir -p .build
python3 scripts/build_items.py "$TABLE" "$SITE_URL" .build/ddb | while read -r f; do
  aws dynamodb batch-write-item --request-items "file://$f" --query "length(UnprocessedItems)" --output text >/dev/null
done

echo "==> 3/5 Building the website (pointing it at the API)..."
cp -r site .build/site
printf 'window.PDC_CONFIG = { apiBase: "%s" };\n' "$API" > .build/site/config.js

echo "==> 4/5 Uploading the website to s3://$BUCKET ..."
aws s3 sync .build/site/ "s3://$BUCKET/" --delete --only-show-errors

echo "==> 5/5 Refreshing CloudFront so visitors get the new files..."
aws cloudfront create-invalidation --distribution-id "$DIST_ID" --paths "/*" --query "Invalidation.Id" --output text >/dev/null

if [[ -n "${GITHUB_OUTPUT:-}" ]]; then
  { echo "site_url=$SITE_URL"; echo "api=$API"; } >> "$GITHUB_OUTPUT"
fi

cat <<EOF

Done.
  Site (Provo):   $SITE_URL/?store=provo
  Site (Kyoto):   $SITE_URL/?store=kyoto
  API (Provo):    $API/items?store=provo
  CloudFront:     $CF_DOMAIN   (the CNAME target for $DOMAIN)
  Distribution:   $DIST_ID
  Bucket:         $BUCKET
  Table:          $TABLE
  Deploy role:    $ROLE
EOF
