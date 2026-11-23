# GABE.md: PDC Serverless Project, AWS build

## Instructions for the AI reading this

You're helping **Gabe** finish his half of a two-person BYU IS team project: the Paradise Donut Company (PDC) serverless site. His teammate is **Lincoln**, who has a matching file, `LINCOLN.md`.

How to help:
- **Gabe is short on time.** Walk him through the Pieces below in order. Don't ask quiz or "predict first" questions. Add a one-line "why" only when it helps.
- Give **bold click paths** for the console and copy-paste-ready code blocks. Cite the page (`P#`/`S#`, see the page key) for each piece.
- Prefer the fastest reliable route that reaches the same result. All the code is already written. **Don't rewrite `template.yaml` or rename resources.** Lincoln's website, pipeline, and diagram depend on them (see "Shared contract"). If a change is truly needed, make it, then remind Gabe to tell Lincoln. The submission doc includes the template and Lambda code, so the doc has to be regenerated whenever they change.
- When Gabe sends a screenshot, say plainly whether it's right. If it isn't, give the fix.
- Known gotchas:
  - The CloudShell AWS CLI opens a pager (lines of `~`); press **q**. `deploy.sh` already turns the pager off.
  - Copy code from the repo or chat, never from Word, which curls the quotes.
  - Region is **us-east-1**.
  - The first deploy takes 5–15 minutes because of CloudFront.
  - The Lambda runtime is **python3.13**.

## Gabe's job in one paragraph

Deploy the whole AWS side from one CloudFormation template:
- private S3 bucket + CloudFront (+ the custom domain)
- HTTP API → Python Lambda → DynamoDB
- enhancements: API throttling and access logs, DynamoDB point-in-time recovery, a CloudWatch error alarm with SNS, and security headers
- the role GitHub Actions uses to deploy

Then take the console screenshots for Features 1–4, 10, 11, 13, and 15, and send them to Lincoln, who assembles the submission doc.

## Who does what (target: 140/140)

The rubric allows 143 points but caps the score at 140, so there's a 3-point cushion (P3–P4).

| # | Feature | Pts | Owner |
|---|---|---|---|
| 1 | S3 hosts the web assets | 14 | Gabe |
| 2 | Lambda runs the menu function (Python 3.13) | 25 | Gabe |
| 3 | API Gateway sends data to and from Lambda | 25 | Gabe |
| 4 | DynamoDB, organized and queried by store | 28 | Gabe |
| 5 | As-built diagram | 7 | Lincoln |
| 6 | Production changes list | 7 | Lincoln |
| 7 | Yearly price estimate | 14 | Lincoln |
| 8 | AI use and debugging | 6 | Both (each sends their prompts; Gabe sends the debugging story) |
| 9 | Looks professional (website + images) | 5 | Lincoln |
| 10 | CloudFront | 0.5 | Gabe |
| 11 | IaC (CloudFormation) | 3 | Gabe |
| 12 | Code pipeline (GitHub Actions) | 3 | Lincoln |
| 13 | Lambda in a language other than JavaScript (Python) | 3 | Gabe |
| 14 | Real URL: https://donuts.lincolnlyons.com | 1 | Gabe (AWS side) + Lincoln (DNS side) |
| 15 | Other enhancements | 1.5 | Gabe |
| | Submission doc assembly and Canvas upload | | Lincoln |
| | Cleanup after grades are posted | | Gabe (AWS) + Lincoln (DNS) |

Everything is already written in this repo: `template.yaml` (all infrastructure, with the Python Lambda code inline), `deploy.sh`, `data/items.json`, `site/`, and `.github/workflows/deploy.yml`. The work left is deploying, wiring up the domain, creating images, screenshots, and the written sections.

## Shared contract (don't change without telling the other person)

- **AWS account:** Gabe's, region **us-east-1**. **Repo:** Gabe's GitHub, `pdc-serverless`, with Lincoln (`linklyns`) as a collaborator. The deploy role only trusts pushes to **main** of the repo named in `deploy.config`.
- **Resource names** (the diagram must match): stack `pdc-serverless`, bucket `pdc-serverless-site-<accountId>`, CloudFront distribution in front of the bucket, table `pdc-store-items`, Lambda `pdc-get-store-items` (role `pdc-get-store-items-role`), HTTP API `pdc-items-api` with route `GET /items`, alarm `pdc-get-store-items-errors`, SNS topic `pdc-alerts`, pipeline role `pdc-github-deploy-role`.
- **DynamoDB keys (single-table design):** partition key `storeId` (`provo`, `honolulu`, `sydney`) and sort key `sk`. Each store has one `PROFILE` row (name, address, hours, time zone, currency, theme colors, banner) and 6 `ITEM#<itemId>` rows, for 21 rows total. Paradise Glazed is stored once for each of the 3 stores, and four other donuts are sold at 2 stores each (P3 requirement).
- **API response** (`GET /items?store=honolulu`): `{ store, profile, count, items[] }`. Item fields: `itemId, name, price, category, calories, description, tags[], allergens[], pairsWith, featured, sortOrder, accent, imageUrl`. The website depends on these names.
- **Images:** `site/images/donuts/<itemId>.png` (12 final photos with transparent backgrounds) and `site/images/stores/<storeId>.png` (3 banners; placeholders until Lincoln replaces them). Filenames must match `data/items.json`.
- **Live URL:** `https://donuts.lincolnlyons.com/?store=provo`. Until the domain is live, use the CloudFront URL that `deploy.sh` prints.
- **Menu changes:** edit `data/items.json`. Every deploy loads it into DynamoDB and deletes rows that are no longer in the file, so removed stores or donuts disappear cleanly.
- **Deploying:** the first deploy runs from CloudShell (`bash deploy.sh`). After the pipeline works, deploy by pushing to `main`. Don't run CloudShell deploys and pipeline deploys at the same time.
- **Production changes = priced items.** Everything on the Feature 6 list must also appear in the Feature 7 estimate (P5).

## Hand-offs

| When | From → To | What |
|---|---|---|
| G1 | Gabe → Lincoln | GitHub collaborator invite and the repo URL |
| Now | Lincoln → Gabe | Pull request `honolulu-sydney-menu` (3 stores + final donut photos) to merge |
| G2 | Gabe → Lincoln | The certificate validation CNAME (name + value) |
| G3 | Gabe → Lincoln | The `Done.` block from `deploy.sh` (CloudFront domain, API URL, site URL) |
| L2 | Lincoln → Gabe | "Both DNS records are in" |
| G4 | Gabe → Lincoln | "https://donuts.lincolnlyons.com is live" |
| G5/G6 | Gabe → Lincoln | Screenshots `fig01.png`… (Gabe's list), the debugging story, and Gabe's AI prompts |

## Errors and gaps in the assignment docs

1. **Template sample URL (S1)** uses `https://` with an `s3-website` address. S3 website endpoints are HTTP-only. Our site uses CloudFront, which serves HTTPS, so this doesn't affect us.
2. **URL placement:** the project says to put the live URL at the top (P4), but the template puts "Who" first (S1). Our doc puts the Live URL first.
3. **The docs don't mention S3 defaults:** new buckets block public access and have ACLs turned off. We keep the bucket **private** and let only CloudFront read it, using Origin Access Control. There's no public bucket policy, so account-level Block Public Access doesn't matter.
4. **CORS tip (P5)** says to enable CORS in API Gateway *and* return headers from Lambda. With an HTTP API, the API's CORS setting is what handles it. Our Lambda also returns the header, which does no harm.
5. Typo on P1: "is a considered a prototype." The points add up to 143 but are capped at 140 (P3–P4).

## Page key

`P#` = page in `docs/Group_Project_Serverless.pdf`. `S#` = page in `docs/Submission_Template.pdf`.
P1 intro · P2–3 requirements · P3 optional features · P4 rubric + deliverables · P4–5 tips · P5 FAQ (diagram, production changes, DynamoDB keys) · P6 FAQ (price estimate, keep site live) · S1–2 Who/URL/rubric · S3 Features 1–6 · S4 Features 7–9 + optional.

---

## Update, Nov 23: three stores (merge Lincoln's pull request)

The menu changed from Provo + Kyoto to **Provo, Honolulu, and Sydney**, using 12 final donut photos. Lincoln pushes the changes on a branch called `honolulu-sydney-menu` and opens a pull request. Merge it when you're **not** in the middle of a CloudShell deploy:
- **GitHub → Pull requests → (the PR) → Merge pull request.** Merging pushes to `main`, which starts the pipeline.
- If the pipeline isn't working yet, deploy by hand: `cd ~/pdc-serverless && git pull && bash deploy.sh`.
- The next deploy loads the 3 stores and **deletes the old Kyoto rows** from DynamoDB automatically. The only template change is the Lambda's "missing store" error message.
- Your `deploy.config` (account ID, repo) isn't touched.

## Piece G1: Put the starter code in your GitHub repo (P3, IaC + pipeline)

1. **GitHub → New repository** → name `pdc-serverless` → **Public** (simplest, so CloudShell can clone it without a token; nothing in it is secret) → don't add a README → **Create repository**.
2. On your computer, unzip `pdc-serverless-starter.zip` and push it:
   ```bash
   cd pdc-serverless
   git init -b main
   git add .
   git commit -m "PDC serverless starter"
   git remote add origin https://github.com/YOUR-GITHUB-USERNAME/pdc-serverless.git
   git push -u origin main
   ```
   Use the terminal, not drag-and-drop: Finder hides the `.github` folder, so dragging would leave the pipeline out.
3. Edit `deploy.config` (on GitHub, click the file → pencil icon, or edit locally and push):
   ```bash
   GITHUB_REPO=YOUR-GITHUB-USERNAME/pdc-serverless   # exact spelling and case
   AWS_ACCOUNT_ID=123456789012                       # your 12-digit account ID (top-right menu in the AWS console)
   ```
   **Commit to main.**
4. Go to **Settings → Collaborators → Add people → `linklyns`**. Send Lincoln the repo URL. *(Hand-off G1)*

The first runs on the **Actions** tab will fail at "2. Deploy to AWS" because the AWS role doesn't exist yet. That's expected; G3 creates it.

## Piece G2: Request the HTTPS certificate for the domain (P3, real URL)

Open **CloudShell** (the **>_** icon in the console's top bar; make sure the region is **N. Virginia**). Run:
```bash
CERT_ARN=$(aws acm request-certificate --domain-name donuts.lincolnlyons.com \
  --validation-method DNS --region us-east-1 --query CertificateArn --output text)
echo "$CERT_ARN"
sleep 15
aws acm describe-certificate --certificate-arn "$CERT_ARN" --region us-east-1 \
  --query "Certificate.DomainValidationOptions[0].ResourceRecord" --output table
```
- **Save the certificate ARN** (paste it somewhere; you'll need it in G4).
- Send Lincoln the **Name** and **Value** of the CNAME record *(Hand-off G2)*. He adds it in lincolnlyons.com's DNS. If the table is empty, wait 15 seconds and rerun the last command.
- Why: CloudFront can serve `donuts.lincolnlyons.com` over HTTPS only with a certificate issued in us-east-1, and AWS issues it only after that CNAME exists.

Don't wait for it to be issued. Go on to G3.

## Piece G3: First deploy from CloudShell (P2–3, Features 1–4, 10, 11, 13, 15)

1. Check whether your account already has a GitHub OIDC provider (it might, from another class):
   ```bash
   aws iam list-open-id-connect-providers --output text
   ```
   If the output includes `token.actions.githubusercontent.com`, set `CREATE_OIDC=false` in `deploy.config` and commit it to main first.
2. Clone and deploy:
   ```bash
   cd ~ && git clone https://github.com/YOUR-GITHUB-USERNAME/pdc-serverless.git
   cd pdc-serverless && bash deploy.sh
   ```
   `CERT_ARN` is still blank, which is fine: this first deploy uses the `https://dxxxx.cloudfront.net` address.
3. When it prints **Done.**, open the two site links and the API link:
   - The site should show the Provo store; the store switcher should show Honolulu and Sydney.
   - The API should return JSON with `"count": 6`.
4. Send Lincoln the whole `Done.` block *(Hand-off G3)*. He needs the **CloudFront** domain for DNS and the **API** URL for local testing.

If it fails, run this and send the output to your AI:
```bash
aws cloudformation describe-stack-events --stack-name pdc-serverless \
  --query "StackEvents[?contains(ResourceStatus,'FAILED')].[LogicalResourceId,ResourceStatusReason]" --output table
```
If the stack ends in `ROLLBACK_COMPLETE`, delete it before redeploying:
`aws cloudformation delete-stack --stack-name pdc-serverless && aws cloudformation wait stack-delete-complete --stack-name pdc-serverless`

Common causes:
- An OIDC provider "already exists": set `CREATE_OIDC=false`.
- A bucket name is taken: someone else's account. Unlikely, since the name includes your account ID.

## Piece G4: Switch on the custom domain (P3, real URL)

Start this after Lincoln says both DNS records are in *(Hand-off L2)*.
```bash
aws acm describe-certificate --certificate-arn "PASTE-CERT-ARN" --region us-east-1 --query Certificate.Status --output text
```
- Wait until it says **ISSUED**. Usually this takes minutes after the CNAME exists; recheck every few minutes.
- Then set `CERT_ARN=PASTE-CERT-ARN` in `deploy.config` and **commit to main**.
  - If Lincoln's pipeline is working, the push deploys it.
  - If not, deploy from CloudShell: `cd ~/pdc-serverless && git pull && bash deploy.sh`.
- Open **https://donuts.lincolnlyons.com/?store=provo**. You should see a padlock and the site. Tell Lincoln *(Hand-off G4)*.
- If you get a CloudFront 403 error or a "certificate doesn't match" warning, give it 10 minutes and check that Lincoln's `donuts` CNAME points to your CloudFront domain.

## Piece G5: Console screenshots (S3–S4)

Save them as PNGs with these exact names and send them all to Lincoln *(Hand-off G5)*. He pastes them above the matching captions in the doc.

| File | Feature | Click path / what to show |
|---|---|---|
| `fig01.png` | F1 | **S3 → Buckets → pdc-serverless-site-… → Objects.** Show `index.html`, `app.js`, `styles.css`, and the `images/` folder. Also open `images/donuts/` and take a second shot, `fig01b.png`. |
| `fig02.png` | F2 | **Lambda → Functions → pdc-get-store-items → Code** tab, showing `index.py` |
| `fig03.png` | F2 | **Test** tab → **Create new event**, name `honolulu`, event JSON below → **Test** → expand **Details** so the 200 response and log output show |
| `fig04.png` | F3 | **API Gateway → APIs → pdc-items-api → Routes → GET** (shows the Lambda integration) |
| `fig05.png` | F3 | The API URL `…/items?store=provo` opened in Chrome with **Pretty-print** checked |
| `fig06.png` | F4 | **DynamoDB → Explore items → pdc-store-items.** All 21 rows: 3 PROFILE + 18 ITEM#. Widen the window so `storeId`, `sk`, `name`, `price` show. |
| `fig07.png` | F4 | Lambda **Code** tab, cropped to the `TABLE.query(KeyConditionExpression=Key("storeId").eq(store))` lines |
| `fig09.png` | F10 | **CloudFront → Distributions → (yours) → General** (alternate domain + certificate) and the **Origins** tab (S3 bucket with OAC). Two shots side by side is fine. |
| `fig10.png` | F11 | **CloudFormation → Stacks → pdc-serverless → Resources** tab, all `CREATE_COMPLETE` or `UPDATE_COMPLETE` |
| `fig12.png` | F13 | **Lambda → pdc-get-store-items → Code → Runtime settings** showing **Python 3.13** |
| `fig14.png` | F15 | **API Gateway → pdc-items-api → Stages → $default.** Throttling (burst 100, rate 50) and access logging |
| `fig15.png` | F15 | **DynamoDB → Tables → pdc-store-items → Backups.** Point-in-time recovery **On** |
| `fig16.png` | F15 | **CloudWatch → Alarms → pdc-get-store-items-errors** |

Test event for `fig03.png`:
```json
{ "queryStringParameters": { "store": "honolulu" } }
```
(Figures 8, 11, and 13 are Lincoln's.)

## Piece G6: AI use and debugging notes (Feature 8, P3, S4)

Send Lincoln *(Hand-off G6)*:
1. The main prompt(s) you gave your AI, pasted as-is.
2. **One thing that actually broke**, how you figured out the cause, and how you fixed it, in 3–4 sentences. Keep a note while you work; anything real counts, such as an OIDC provider that already existed, a stack rollback, a certificate stuck pending, or a 403 from CloudFront.

## Piece G7: Cleanup (only after grades are posted; the site must stay up until then, P3/P6)

```bash
cd ~/pdc-serverless
BUCKET=pdc-serverless-site-$(aws sts get-caller-identity --query Account --output text)
aws s3 rm "s3://$BUCKET" --recursive
aws cloudformation delete-stack --stack-name pdc-serverless
aws cloudformation wait stack-delete-complete --stack-name pdc-serverless && echo "stack deleted"
aws acm delete-certificate --region us-east-1 --certificate-arn "PASTE-CERT-ARN"
aws logs describe-log-groups --log-group-name-prefix /aws/lambda/pdc --query "logGroups[].logGroupName"
aws logs describe-log-groups --log-group-name-prefix /aws/apigateway/pdc --query "logGroups[].logGroupName"
```
- Deleting the stack removes:
  - the S3 bucket and its policy, the OAC, and the CloudFront distribution (deleting it takes 5–15 minutes; CloudFormation disables it first)
  - the DynamoDB table `pdc-store-items` and its backups
  - the Lambda `pdc-get-store-items`, its role `pdc-get-store-items-role`, and its log group
  - the HTTP API `pdc-items-api` (route, integration, stage) and its access-log group
  - the SNS topic `pdc-alerts` and the alarm
  - the role `pdc-github-deploy-role`, and the GitHub OIDC provider if the stack created it
- The last two commands should print `[]`. If a log group is left over, delete it: **CloudWatch → Log groups → select → Delete**.
- Delete the certificate only after the stack is gone; CloudFront holds it until then.
- In GitHub, disable the workflow (**Actions → Deploy PDC → ⋯ → Disable workflow**) or archive the repo, so later pushes don't try to deploy.
- Tell Lincoln to delete his two DNS records.
