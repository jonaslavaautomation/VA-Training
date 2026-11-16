// LAVA portal starter content (seeded once by migration 20261122100100; edit
// it afterwards in Admin → LAVA Applicants — re-running the seed never
// overwrites admin changes). Rebuild the seed with `npm run build:lava-seed`.
//
// Company sections are DRAFTS: no verified company facts were available, so
// they hold review notes and fill-in templates and stay hidden from members
// until an administrator replaces the text and publishes them.

const REVIEW = '> DRAFT FOR ADMINISTRATOR REVIEW. Replace everything in [square brackets] with verified LAVA Automation information, remove this note, then publish. Members cannot see this section while it is a draft.'

export const ARRANGEMENT =
  'LAVA Automation requires newly hired Virtual Assistants to work onsite for their first 45 days for training purposes. After completing the 45-day onsite training period, Virtual Assistants will transition to a work-from-home arrangement.'

export const content = [
  {
    key: 'overview', title: 'What is LAVA Automation?', status: 'draft', sort_order: 1,
    body: `${REVIEW}

LAVA Automation is [one-sentence description of the company, e.g. "a company that provides trained Virtual Assistants and workflow support to ..."].

[Two or three sentences on who the company works with and the value it delivers to clients.]

[One or two sentences on what working at LAVA Automation is like for a Virtual Assistant: team, training, growth.]`,
  },
  {
    key: 'history', title: 'Company Origin and History', status: 'draft', sort_order: 2,
    body: `${REVIEW}

LAVA Automation was founded in [year] by [founder name(s)] in [city/country].

## How it started
[Why the company was started and the problem it set out to solve.]

## Milestones
- [Year]: [milestone]
- [Year]: [milestone]
- [Year]: [milestone]`,
  },
  {
    key: 'mission_vision', title: 'Mission and Vision', status: 'draft', sort_order: 3,
    body: `${REVIEW}

## Mission
[The company's official mission statement.]

## Vision
[The company's official vision statement.]

## Core values
- [Value]: [one-line meaning]
- [Value]: [one-line meaning]
- [Value]: [one-line meaning]`,
  },
  {
    key: 'services', title: 'What Does LAVA Do?', status: 'draft', sort_order: 4,
    body: `${REVIEW}

[Short paragraph describing the services LAVA Automation provides.]

- [Service]: [what it includes]
- [Service]: [what it includes]
- [Service]: [what it includes]`,
  },
  {
    key: 'niches', title: "The Company's Niches", status: 'draft', sort_order: 5,
    body: `${REVIEW}

[Confirm the niches LAVA Automation hires and trains for. The preparation courses in this portal focus on insurance agency support; list only niches the company actually works in.]

- [Niche, e.g. insurance agency support]: [the kind of work involved]
- [Niche]: [the kind of work involved]`,
  },
  {
    key: 'clients', title: 'Clients and Industries We Serve', status: 'draft', sort_order: 6,
    body: `${REVIEW}

[Describe the types of clients and industries LAVA Automation serves, e.g. location (country/region) and business type. Do not name clients without their permission.]

- [Industry / client type]
- [Industry / client type]`,
  },
  {
    key: 'work_arrangement', title: 'Working Arrangement: 45 Days Onsite, Then Work From Home', status: 'published', sort_order: 7,
    body: `${ARRANGEMENT}

- **First 45 days: onsite.** You will report to the training location in person while you learn the systems, processes and quality standards.
- **After the 45-day training period: work from home.** Once training is complete, you continue the role from home.

> These positions are not fully remote from the first day. Please make sure you can commit to the onsite training period before you continue.`,
  },
  {
    key: 'agreement_intro', title: 'Applicant Agreement', status: 'published', sort_order: 8,
    body: `Before you start the LAVA Preparation Center, please confirm that you understand and accept the working arrangement and the preparation requirements.

Your answers are saved to your account with the date and time. This agreement only confirms that you understand these conditions. It is **not** a job offer, and it does not mean you have been accepted or hired.`,
  },
]

// ---------------------------------------------------------------- simulator
// Each task shows a "screen" (context) and asks what the VA should do.
// Every name, number and company below is fictional training data.

export const simulators = [
  {
    slug: 'simulator-coi-request-desk', title: 'Certificate Request Desk', sort_order: 101, pass_percent: 70,
    description: 'Work through a certificate of insurance request from a commercial client, from the first email to the hand-off for approval.',
    questions: [
      {
        context: { kind: 'email', title: 'Inbox', fields: [['From', 'Dana Ruiz <dana@brightpathlandscaping.example>'], ['Subject', 'Need a COI for the Oakridge project'], ['Received', 'Mon 9:12 AM']],
          body: 'Hi team,\n\nThe general contractor on our Oakridge Mall job needs proof of our liability insurance before we can start next Monday. They want to be listed as additional insured.\n\nCertificate holder: Summit Builders LLC, 400 Commerce Way, Austin, TX 78701.\n\nThanks!\nDana' },
        prompt: 'Which form is normally used to provide this proof of liability coverage?',
        options: ['ACORD 25 – Certificate of Liability Insurance', 'ACORD 27 – Evidence of Property Insurance', 'ACORD 28 – Evidence of Commercial Property Insurance', 'An auto ID card'],
        answer: 0,
        explanation: 'The request is for proof of liability coverage for a certificate holder, which is what the ACORD 25 is designed for.',
      },
      {
        context: { kind: 'record', title: 'Agency system · Client: Brightpath Landscaping LLC', fields: [['Client code', 'BRIGLAN-01'], ['General Liability', 'Policy GL-448120 · 03/01/2026 – 03/01/2027 · Active'], ['Commercial Auto', 'Policy CA-77215 · 01/15/2026 – 01/15/2027 · Active'], ['Workers Comp', 'Policy WC-30981 · 11/01/2025 – 11/01/2026 · Active'], ['Endorsements on GL', 'CG 20 10 – Additional Insured (blanket, written contract)']] },
        prompt: 'Before preparing the certificate, what is the most important thing to confirm about the additional insured request?',
        options: ['That the client has paid this month’s invoice', 'That the policy actually includes an additional insured endorsement that applies to this holder', 'That the holder’s address is in the same state as the client', 'That the certificate is printed on letterhead'],
        answer: 1,
        explanation: 'A certificate cannot add coverage. Additional insured status must come from an endorsement on the policy, so you check the endorsement first.',
      },
      {
        context: { kind: 'form', title: 'ACORD 25 draft · Coverages section', fields: [['INSR LTR A', 'Commercial General Liability · GL-448120 · 03/01/2026 – 03/01/2027'], ['INSR LTR B', 'Automobile Liability · CA-77215 · 01/15/2025 – 01/15/2026'], ['INSR LTR C', 'Workers Compensation · WC-30981 · 11/01/2025 – 11/01/2026']] },
        prompt: 'Compare the draft with the agency system record from the previous screen. What needs to be corrected?',
        options: ['The GL policy number is wrong', 'The auto policy dates show last year’s term instead of the current 01/15/2026 – 01/15/2027 term', 'Workers compensation should never appear on an ACORD 25', 'Nothing, the draft matches the record'],
        answer: 1,
        explanation: 'The commercial auto line shows the expired 2025–2026 term. Certificates must show the current policy term from the system record.',
      },
      {
        context: { kind: 'email', title: 'Follow-up email', fields: [['From', 'Dana Ruiz'], ['Subject', 'RE: Need a COI for the Oakridge project']],
          body: 'One more thing: Summit says their contract requires "primary and non-contributory" wording and a 30-day notice of cancellation. Can you just type that into the description box?' },
        prompt: 'What is the correct way to handle this request?',
        options: ['Type the wording exactly as requested so the client can start on Monday', 'Refuse the request and tell the client it is impossible', 'Check whether the policy has endorsements that support the wording, and route the request to the licensed account manager to decide', 'Remove the additional insured box so the wording is not needed'],
        answer: 2,
        explanation: 'Wording on a certificate must be supported by the policy. A VA checks the endorsements and escalates to licensed staff instead of adding unsupported wording.',
      },
      {
        context: { kind: 'form', title: 'ACORD 25 draft · Certificate holder', fields: [['Certificate holder', 'Summit Builders, 400 Commerce Way, Austin, TX 78701'], ['Description of operations', 'Landscaping services at Oakridge Mall project']] },
        prompt: 'Compare the holder box with Dana’s first email. What is wrong?',
        options: ['The legal name is incomplete: it should be “Summit Builders LLC”', 'The ZIP code should be removed', 'The description of operations must be blank', 'The holder should be Brightpath Landscaping LLC'],
        answer: 0,
        explanation: 'The certificate holder’s legal name must match the request exactly, including “LLC”.',
      },
      {
        context: { kind: 'note', title: 'Agency procedure', body: 'Certificates with additional insured or special wording requests must be reviewed and released by a licensed account manager. Save the draft and request to the client file and create an activity for review.' },
        prompt: 'The draft is corrected. What is the right next step for the VA?',
        options: ['Email the certificate to the holder immediately', 'Save the draft and the client’s emails to the client file, then create a review activity for the licensed account manager', 'Delete the draft and start over', 'Ask the client to sign the certificate'],
        answer: 1,
        explanation: 'Following agency procedure, the VA documents the request and routes it to licensed staff for review and release.',
      },
    ],
  },
  {
    slug: 'simulator-agency-system-navigation', title: 'Agency System Navigation', sort_order: 102, pass_percent: 70,
    description: 'Practice finding the right customer record, avoiding duplicates, filing documents and leaving clear notes in a simulated agency management system.',
    questions: [
      {
        context: { kind: 'note', title: 'Phone message', body: 'Caller: Maria Gomez. Says she received a renewal notice for her home policy and wants to know the new premium. Callback: (512) 555-0148.' },
        prompt: 'What is the most reliable first search to find her record?',
        options: ['Search only by first name “Maria”', 'Search by her phone number or full name, then confirm with a second detail such as address or policy number', 'Create a new client record to save time', 'Search the carrier’s website instead'],
        answer: 1,
        explanation: 'Searching by a unique detail and confirming with a second one avoids opening the wrong customer’s record.',
      },
      {
        context: { kind: 'record', title: 'Search results for “Gomez”', fields: [['1', 'Maria Gomez · 18 Pine St, Austin TX · (512) 555-0148 · HO3 policy HO-221907'], ['2', 'Maria L. Gomez · 2201 Oak Ave, Dallas TX · (214) 555-0190 · Auto policy PA-55102'], ['3', 'Mario Gomez · 18 Pine St, Austin TX · (512) 555-0148 · Auto policy PA-60411']] },
        prompt: 'Which record belongs to the caller?',
        options: ['Result 1', 'Result 2', 'Result 3', 'None of them; create a new record'],
        answer: 0,
        explanation: 'Result 1 matches her name, phone number and the home (HO3) policy she called about.',
      },
      {
        context: { kind: 'record', title: 'Policy HO-221907 · Maria Gomez', fields: [['Carrier', 'Lone Star Mutual (fictional)'], ['Line of business', 'Homeowners (HO3)'], ['Term', '12/05/2025 – 12/05/2026'], ['Status', 'Renewal offered'], ['Renewal premium', '$2,184 (current term: $1,962)'], ['Note', 'Renewal questions about coverage changes go to licensed agent']] },
        prompt: 'Maria asks why her premium went up and whether she should raise her deductible. What should the VA do?',
        options: ['Tell her the renewal premium shown in the system, and route her coverage and deductible questions to a licensed agent', 'Recommend a higher deductible to lower her premium', 'Tell her premiums never change at renewal', 'Cancel the renewal so she can shop around'],
        answer: 0,
        explanation: 'A VA can share factual information from the record, but advice about coverage or deductibles must come from a licensed agent.',
      },
      {
        context: { kind: 'email', title: 'Inbox', fields: [['From', 'Maria Gomez'], ['Subject', 'Photos of new roof'], ['Attachment', 'IMG_4471.jpg, IMG_4472.jpg']], body: 'Hi, here are the photos of our new roof that the insurance company asked for.' },
        prompt: 'How should these attachments be filed?',
        options: ['Save them to your own computer’s Downloads folder', 'Attach them to Maria’s HO3 policy in the system with a clear description such as “Roof photos – new roof – received from insured”', 'Attach them to Mario Gomez’s auto policy because the address matches', 'Forward them to all agency staff'],
        answer: 1,
        explanation: 'Documents belong in the correct client and policy, with a clear description so anyone can find them later.',
      },
      {
        context: { kind: 'form', title: 'New activity note', fields: [['Client', 'Maria Gomez'], ['Policy', 'HO-221907'], ['Draft note', 'called']] },
        prompt: 'Which activity note best follows good documentation practice?',
        options: ['“called”', '“Spoke with insured, all good”', '“Insured called 11/03 re renewal premium. Gave renewal premium $2,184. Deductible question routed to licensed agent J. Park; follow-up due 11/05. Roof photos received and attached to policy.”', '“Customer was upset, see me”'],
        answer: 2,
        explanation: 'A good note says who, when, what was discussed, what was done and what happens next.',
      },
      {
        context: { kind: 'note', title: 'Task list', body: 'The licensed agent asked you to make sure Maria gets a call back in two days if she has not heard from the agency.' },
        prompt: 'What is the best way to make sure this follow-up is not forgotten?',
        options: ['Try to remember it', 'Write it on a sticky note', 'Create a follow-up task (diary/activity) on her record, due in two days and assigned to the right person', 'Ask Maria to call back if nobody calls her'],
        answer: 2,
        explanation: 'Follow-ups belong in the system as dated, assigned tasks so they are tracked even if you are away.',
      },
    ],
  },
  {
    slug: 'simulator-policy-service-workflow', title: 'Policy Service Workflow', sort_order: 103, pass_percent: 70,
    description: 'Handle everyday service requests (adding a vehicle, an ID card, a cancellation and a loss run) and decide what a VA can do and what needs a licensed professional.',
    questions: [
      {
        context: { kind: 'email', title: 'Inbox', fields: [['From', 'Kevin Tran'], ['Subject', 'Add my new car']], body: 'Hi! I just bought a 2024 Honda CR-V and want to add it to my auto policy today. Thanks!' },
        prompt: 'Which detail do you most need from Kevin before a policy change request can be prepared?',
        options: ['His favorite color', 'The vehicle identification number (VIN), purchase date, and any lienholder or lender information', 'His employer’s phone number', 'A photo of his driver’s license only'],
        answer: 1,
        explanation: 'The VIN identifies the exact vehicle, and the purchase date and lienholder details are needed for the change and for the ID card or lender proof.',
      },
      {
        context: { kind: 'record', title: 'Endorsement request draft', fields: [['Policy', 'PA-60411'], ['Change', 'Add vehicle'], ['Vehicle', '2024 Honda CR-V'], ['VIN', '7FARW2H8XRE01234'], ['Coverages', 'Copy from current vehicle?']] },
        prompt: 'A VIN is 17 characters. The VIN in the draft has 16. What should you do?',
        options: ['Submit it anyway; the carrier will fix it', 'Guess the missing character', 'Contact the customer (or check the purchase documents) to confirm the full 17-character VIN before submitting', 'Delete the request'],
        answer: 2,
        explanation: 'Accurate data entry matters: an incorrect VIN can cause the wrong vehicle to be rated or insured. Confirm it with the source.',
      },
      {
        context: { kind: 'note', title: 'Phone message', body: 'Kevin asks which coverages he should choose for the new car and whether he needs collision.' },
        prompt: 'How should the VA respond?',
        options: ['Recommend full coverage because the car is new', 'Tell him collision is never worth it', 'Explain that a licensed agent will review coverage options with him, and route the question with a note', 'Copy the coverages of his oldest car without asking'],
        answer: 2,
        explanation: 'Recommending coverages is advice that must come from a licensed agent. The VA routes the question with clear notes.',
      },
      {
        context: { kind: 'email', title: 'Inbox', fields: [['From', 'Priya Shah'], ['Subject', 'Cancel my renters policy']], body: 'Please cancel my renters insurance effective today. I moved in with my sister.' },
        prompt: 'What is the correct VA action for a cancellation request?',
        options: ['Cancel it immediately in the system', 'Ignore the email', 'Acknowledge the request, record it in her file, and route it to licensed staff following agency procedure (a signed cancellation request may be required)', 'Tell her renters policies cannot be cancelled'],
        answer: 2,
        explanation: 'Cancellations have rules (signatures, effective dates, refunds) and are handled per agency procedure by authorized staff. The VA acknowledges, documents and routes the request.',
      },
      {
        context: { kind: 'email', title: 'Inbox', fields: [['From', 'Lisa Park, Northside Bakery LLC'], ['Subject', 'Loss runs']], body: 'We are shopping our insurance and a new agent asked for our loss runs for the last 5 years.' },
        prompt: 'What is a loss run?',
        options: ['A list of payments the client missed', 'A report from the carrier showing the claims history of a policy over a period of time', 'A form to cancel a policy', 'A certificate of insurance'],
        answer: 1,
        explanation: 'Loss runs are carrier reports of claims history. They are commonly requested when a business is quoting with other insurers.',
      },
      {
        context: { kind: 'record', title: 'Client file · Kevin Tran', fields: [['Requests today', 'Add vehicle (pending VIN) · Coverage question (routed to licensed agent) · ID card for new vehicle (after change is processed)']] },
        prompt: 'Kevin emails asking for a new ID card right away, but the vehicle change has not been processed yet. What should the VA say?',
        options: ['Send the old ID card with the new car’s details typed in', 'Let him know the ID card will be sent as soon as the change is processed, and give him a realistic follow-up time', 'Tell him he does not need an ID card', 'Make up a temporary policy number'],
        answer: 1,
        explanation: 'Never alter or invent insurance documents. Set clear expectations and follow up when the change is processed.',
      },
    ],
  },
]
