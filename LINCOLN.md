# LINCOLN.md: PDC Serverless Project, site, pipeline, and write-up

## Instructions for the AI reading this

You're helping **Lincoln** finish his half of a two-person BYU IS team project: the Paradise Donut Company (PDC) serverless site. His teammate is **Gabe**, who deploys all of the AWS infrastructure (see `GABE.md`).

How to help:
- **Lincoln is short on time.** Walk him through the Pieces below in order (L1 can start right away). Don't ask quiz or "predict first" questions. Add a one-line "why" only when it helps.
- Give **bold click paths** and copy-paste-ready code blocks. Cite the page (`P#`/`S#`) for each piece.
- Prefer the fastest reliable route. The website and pipeline code are already written and tested; don't rewrite them unless something is broken. Keep the data contract unchanged.
- When Lincoln sends a screenshot, say plainly whether it's right. If it isn't, give the fix.
- Lincoln's setup:
  - MacBook Air, VS Code with Live Server, Chrome. Run local pages with **Live Server**, not by opening the file, to avoid CORS errors.
  - Copy code from chat or the repo, never from Word.
  - His GitHub username is `linklyns`; his git commit email is `linclyns@byu.edu`.

## Lincoln's job in one paragraph

- Make the 3 store banners in ChatGPT (the 12 donut photos are already done).
- Add the two DNS records that put the site at `donuts.lincolnlyons.com`.
- Test the website with Gabe's API.
- Get the GitHub Actions pipeline to a green run.
- Draw the as-built diagram, write the production changes list, and build the yearly price estimate.
- Assemble and submit the doc.

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

## Piece L1: Store banners in ChatGPT (Feature 9, P3–P4)

**The donuts are done.** Your 12 photos are already in the repo with the white backgrounds removed, at `site/images/donuts/<itemId>.png`. You only need **3 store banners**. The repo has simple placeholder banners at the same paths, so the site works until you replace them.

**Message 1: paste this exactly to set the style:**
```text
I need three wide banner images for a donut shop website, one per message. Every banner must use this exact style so they match as a set:

- Landscape 1536x1024 PNG with a full background.
- Bright, warm, photorealistic, like a professional travel and food photo. Golden morning light, shallow depth of field.
- A small, inviting independent donut shop is the subject, seen from across the street at eye level.
- No people, no cars in front of the shop, and no readable text, logos, or brand names anywhere.
- Keep the lower-left quarter of the image fairly calm and uncluttered, because the website places a small card there.

Reply "Ready" and wait for the first location.
```

**Messages 2–4: one at a time.** Download each image and rename it to the filename in the heading:

**`provo.png`**
```text
Banner 1 of 3: Provo, Utah. The shop has a strawberry-pink awning and big front windows. Behind it, the Wasatch mountains at sunrise with a large white block-letter "Y" on the mountainside (the only lettering allowed). Pastel pink-and-peach sky, a few pine trees.
```
**`honolulu.png`**
```text
Banner 2 of 3: Honolulu, Hawaii. The shop has a teal awning and an open-air counter, with palm trees and plumeria around it. Behind it, the turquoise ocean of Waikiki and the green slopes of Diamond Head under a clear morning sky.
```
**`sydney.png`**
```text
Banner 3 of 3: Sydney, Australia. A beachside shop with a blue-and-white striped awning on the promenade above Bondi Beach. Golden sand, rolling surf, and the curve of the bay behind it in soft early-morning light.
```

**If something's off:**
- If ChatGPT adds text or logos, reply `Regenerate with no text or lettering anywhere` (for Provo, add: `except the Y on the mountain`).
- If a file downloads as `.webp`, convert it with `sips -s format png name.webp --out name.png`.

**Put them in place** (from the repo folder on your Mac, after L3):
```bash
mv ~/Downloads/{provo,honolulu,sydney}.png site/images/stores/
sips -Z 1600 site/images/stores/*.png
```
Why: `sips` shrinks the 1–2 MB ChatGPT files so the page loads fast. You'll push these in L4.

## Piece L2: DNS records for donuts.lincolnlyons.com (Feature 14, P3)

1. Find out who hosts your DNS:
   ```bash
   dig NS lincolnlyons.com +short
   ```
   `awsdns` means Route 53, `cloudflare` means Cloudflare, anything else is your registrar or host.
2. Add **record 1**, the certificate validation, from Gabe *(Hand-off G2)*. Type **CNAME**, with the Name and Value exactly as he sends them.
   - Many DNS panels add `.lincolnlyons.com` to the name automatically. In that case, enter only the part before it (for example `_abc123.donuts`).
3. Add **record 2**, the site, after Gabe's first deploy *(Hand-off G3)*: Type **CNAME**, Name **`donuts`**, Value **`dxxxx.cloudfront.net`** (his CloudFront domain).
   - **Cloudflare:** set both records to **DNS only** (gray cloud). An orange-cloud proxy breaks the certificate and CloudFront.
   - **Route 53:** **Route 53 → Hosted zones → lincolnlyons.com → Create record.**
4. Check both:
   ```bash
   dig CNAME donuts.lincolnlyons.com +short
   ```
   This should return Gabe's `…cloudfront.net` domain. Then tell Gabe *(Hand-off L2)*. He switches the domain on (G4).

## Piece L3: Website: run it locally and know what it does (Feature 9, P3–P4)

The site is finished: `site/index.html`, `site/styles.css`, `site/app.js`.
1. Accept Gabe's GitHub invite, then clone the repo:
   ```bash
   git clone https://github.com/GABES-USERNAME/pdc-serverless.git && cd pdc-serverless
   git config user.email "linclyns@byu.edu"
   ```
2. Put Gabe's API URL in `site/config.js` (the `ApiEndpoint` value, no trailing slash). Open `site/index.html` with **Live Server**.
   - Don't commit this local change: `git checkout site/config.js` before you push. Even if you do commit it, `deploy.sh` overwrites the file on every deploy, so nothing breaks.
3. What the page does, so you can describe it in the doc:
   - **Store switcher (Provo / Honolulu / Sydney):** updates `?store=`, re-runs the DynamoDB Query, and switches the color theme (stored in each store's `PROFILE` row) and the currency (USD / AUD).
   - **Store hero:** the store name as large type, an open/closed status calculated from the store's own time zone, the address and hours (from the `PROFILE` row), the banner, and "Today's pick" (the featured item).
   - **Menu:** search, category chips, sorting (our order, price, calories), loading placeholders, and a clear empty-search state with a reset button.
   - **Donut details:** a dialog with calories, pairing, allergens, and a quantity stepper.
   - **The box:** a kraft-paper 12-slot tray at the bottom that fills with donut images. A full dozen gets 10% off. The box is saved per store in the browser. The review drawer has a quantity stepper, and "Check out" shows a "not live yet" message.
   - **Footer:** shows how many milliseconds the menu took to come back from the API.
   - Responsive down to phone width, keyboard accessible, and it respects reduced motion.
4. To change copy (taglines, descriptions, prices), edit `data/items.json`. Store-level copy is in `stores[]`. Push, and the pipeline reloads DynamoDB.

## Piece L4: Pipeline: get a green run (Feature 12, P3)

The workflow is `.github/workflows/deploy.yml`. It has three jobs:
1. **Validate**: CloudFormation lint, a data check, and a JS syntax check.
2. **Deploy to AWS**: signs in with GitHub OIDC (no stored keys) and runs `deploy.sh`.
3. **Smoke test**: checks that all three stores' APIs return 6 items each and that the site loads.

Steps:
1. Wait until Gabe's first CloudShell deploy is done (G3); it creates the role the pipeline uses.
2. Push your banners (L1):
   ```bash
   git add site/images/stores && git commit -m "Store banners" && git push
   ```
3. On GitHub, open **Actions → Deploy PDC** and watch the run. To re-run without a commit: **Run workflow**.
4. 📸 **`fig11.png`**: the run summary with all three jobs green (F12).

If it fails:
- `Not authorized to perform sts:AssumeRoleWithWebIdentity`: `GITHUB_REPO` in `deploy.config` doesn't exactly match the repo (case matters), the push wasn't to `main`, or `AWS_ACCOUNT_ID` is wrong.
- `Could not assume role` with "provider not found": Gabe's account needed `CREATE_OIDC=true`.
- A smoke test fails right after a deploy: re-run the job once. CloudFront may still have been refreshing.

## Piece L5: As-built diagram (Feature 5, P5) → `fig08.png`

Use **draw.io** (app.diagrams.net) with the AWS icon set (**+ More shapes → AWS 2025** or the latest AWS set). Show only what's deployed (P5).

- **Request path**, as numbered arrows (it's a real sequence):
  1. Browser → **CloudFront** (`donuts.lincolnlyons.com`, ACM certificate) → **S3** (private bucket, OAC): HTML, CSS, JS, images
  2. Browser → **API Gateway HTTP API** `GET /items?store=honolulu`
  3. API Gateway → **Lambda** `pdc-get-store-items` (Python 3.13, IAM role allows only Query)
  4. Lambda → **DynamoDB** `pdc-store-items`: Query on `storeId = honolulu`
  5. JSON back to the browser
- **Supporting pieces** (smaller, off to the side):
  - **CloudWatch Logs** (Lambda + API access logs), the **CloudWatch alarm → SNS** `pdc-alerts`, and DynamoDB **PITR**
  - The DNS CNAME at lincolnlyons.com's DNS provider
- **Deploy path** (dashed line): **GitHub repo → GitHub Actions** (OIDC role) → **CloudFormation** stack → the resources, plus the `s3 sync` and the DynamoDB load
- Export as PNG (**File → Export as → PNG**, 2x).

## Piece L6: Production changes list (Feature 6, P5)

Use these five changes. Each one must also appear in the price estimate (L7).
1. **AWS WAF on CloudFront:** blocks bots and abusive traffic and rate-limits clients before they reach the site or API, for 31,000 stores' worth of customers.
2. **DynamoDB global tables in 3 Regions:** keeps each store's menu close to its customers and keeps menus readable if one Region goes down.
3. **API Gateway + Lambda in 3 Regions behind Route 53 latency-based routing and health checks:** sends each customer to the nearest healthy Region and fails over automatically.
4. **CloudFront caching for the menu API (60-second TTL on `/items?store=`):** serves repeat menu requests from the edge, cutting Lambda and DynamoDB calls by roughly 90% at peak.
5. **Amazon Cognito user pools:** customer sign-in for the full e-commerce launch (accounts, saved boxes, order history).

## Piece L7: Yearly price estimate (Feature 7, P6)

Follow P6's method: estimate one Region, then multiply by the number of Regions. Starting assumptions (adjust if you like, but show the math):

| Assumption | Value |
|---|---|
| Stores | 31,000 |
| Customers per store per day | 400 → 12.4 M/day → about 4.5 B/year |
| Share who use the website | 5% → about 226 M visits/year → about 18.9 M/month |
| Regions | 3 (us-east-1, eu-west-1, ap-northeast-1) → about 6.3 M visits/month per Region |
| Data per visit | About 1.2 MB (page + 12 images, compressed) → about 7.6 TB/month per Region out of CloudFront |
| API calls per visit | 2 (open + one store switch) → about 12.6 M/month per Region; with 90% CloudFront API caching, about 1.3 M reach Lambda |
| Lambda | 1.3 M invocations/month, 256 MB, 100 ms |
| DynamoDB | On-demand, about 1.3 M reads/month, about 1 GB stored, PITR on, global-table replicated writes (menus change rarely, so small) |
| WAF | 1 web ACL, 5 rules, about 12.6 M requests/month per Region |
| Route 53 | 1 hosted zone, 3 health checks, latency queries ≈ visits |
| Cognito | Assume 10% of web users sign in: about 600 K MAU per Region |
| CloudWatch | Logs ≈ 5 GB/month, 3 alarms |
| S3 | About 50 MB stored; GETs are mostly CloudFront cache hits |

In **calculator.aws → Create estimate → Add service**, add each service for **US East (N. Virginia)** using the per-Region numbers. Then **Save and share → copy the link**. Put in the doc:
- the link
- the assumptions table and math above, as short lines
- the number of Regions (3)
- **Yearly total = (calculator monthly total × 12) × 3**

Note that CloudFront and Cognito are usually the biggest lines.

## Piece L8: Assemble and submit (S1–S4, P4)

Open `PDC_Serverless_Submission.docx`.
- The Live URL is already at the top, the rubric target is 140, and all the code and WHAT text are pre-filled.
- Paste each screenshot on the blank line **just above** its gray "Figure N." caption:
  - Gabe: 1, 2, 3, 4, 5, 6, 7, 9, 10, 12, 14, 15, 16
  - Lincoln: 8, 11, 13
  - `fig13.png` is the live site at https://donuts.lincolnlyons.com with the padlock showing.
- Fill in:
  - Gabe's full name (highlighted)
  - the API URL (highlighted, from G3)
  - Feature 6 (copy from L6)
  - Feature 7 (L7)
  - Feature 8: add Gabe's prompts and the debugging story from G6
- Remove any leftover highlight.
- Export to PDF if Canvas prefers it, and submit.
- Leave the site running until grades are posted (P3, P6). After grades, delete your two DNS records once Gabe's cleanup (G7) is done.
