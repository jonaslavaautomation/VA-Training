-- =====================================================================
-- VA Training Academy — Phase 7A
-- 012 · LAVA portal starter content (generated — do not edit by hand)
-- =====================================================================
-- Source: supabase/content/lava/ (npm run build:lava-seed).
-- * Company sections are DRAFTS for administrator review (hidden from
--   members until published). Only the 45-day working arrangement and the
--   agreement introduction are published.
-- * 6 preparation courses with lessons and a quiz each, plus
--   3 simulator activities (fictional practice data).
-- * No job positions or salaries are created.
-- Inserts only what is missing: safe to run again; never overwrites edits.

insert into public.lava_content (key, title, body, status, sort_order) values
  ('overview', 'What is LAVA Automation?', '> DRAFT FOR ADMINISTRATOR REVIEW. Replace everything in [square brackets] with verified LAVA Automation information, remove this note, then publish. Members cannot see this section while it is a draft.

LAVA Automation is [one-sentence description of the company, e.g. "a company that provides trained Virtual Assistants and workflow support to ..."].

[Two or three sentences on who the company works with and the value it delivers to clients.]

[One or two sentences on what working at LAVA Automation is like for a Virtual Assistant: team, training, growth.]', 'draft', 1),
  ('history', 'Company Origin and History', '> DRAFT FOR ADMINISTRATOR REVIEW. Replace everything in [square brackets] with verified LAVA Automation information, remove this note, then publish. Members cannot see this section while it is a draft.

LAVA Automation was founded in [year] by [founder name(s)] in [city/country].

## How it started
[Why the company was started and the problem it set out to solve.]

## Milestones
- [Year]: [milestone]
- [Year]: [milestone]
- [Year]: [milestone]', 'draft', 2),
  ('mission_vision', 'Mission and Vision', '> DRAFT FOR ADMINISTRATOR REVIEW. Replace everything in [square brackets] with verified LAVA Automation information, remove this note, then publish. Members cannot see this section while it is a draft.

## Mission
[The company''s official mission statement.]

## Vision
[The company''s official vision statement.]

## Core values
- [Value]: [one-line meaning]
- [Value]: [one-line meaning]
- [Value]: [one-line meaning]', 'draft', 3),
  ('services', 'What Does LAVA Do?', '> DRAFT FOR ADMINISTRATOR REVIEW. Replace everything in [square brackets] with verified LAVA Automation information, remove this note, then publish. Members cannot see this section while it is a draft.

[Short paragraph describing the services LAVA Automation provides.]

- [Service]: [what it includes]
- [Service]: [what it includes]
- [Service]: [what it includes]', 'draft', 4),
  ('niches', 'The Company''s Niches', '> DRAFT FOR ADMINISTRATOR REVIEW. Replace everything in [square brackets] with verified LAVA Automation information, remove this note, then publish. Members cannot see this section while it is a draft.

[Confirm the niches LAVA Automation hires and trains for. The preparation courses in this portal focus on insurance agency support; list only niches the company actually works in.]

- [Niche, e.g. insurance agency support]: [the kind of work involved]
- [Niche]: [the kind of work involved]', 'draft', 5),
  ('clients', 'Clients and Industries We Serve', '> DRAFT FOR ADMINISTRATOR REVIEW. Replace everything in [square brackets] with verified LAVA Automation information, remove this note, then publish. Members cannot see this section while it is a draft.

[Describe the types of clients and industries LAVA Automation serves, e.g. location (country/region) and business type. Do not name clients without their permission.]

- [Industry / client type]
- [Industry / client type]', 'draft', 6),
  ('work_arrangement', 'Working Arrangement: 45 Days Onsite, Then Work From Home', 'LAVA Automation requires newly hired Virtual Assistants to work onsite for their first 45 days for training purposes. After completing the 45-day onsite training period, Virtual Assistants will transition to a work-from-home arrangement.

- **First 45 days: onsite.** You will report to the training location in person while you learn the systems, processes and quality standards.
- **After the 45-day training period: work from home.** Once training is complete, you continue the role from home.

> These positions are not fully remote from the first day. Please make sure you can commit to the onsite training period before you continue.', 'published', 7),
  ('agreement_intro', 'Applicant Agreement', 'Before you start the LAVA Preparation Center, please confirm that you understand and accept the working arrangement and the preparation requirements.

Your answers are saved to your account with the date and time. This agreement only confirms that you understand these conditions. It is **not** a job offer, and it does not mean you have been accepted or hired.', 'published', 8)
on conflict (key) do nothing;

do $seed$
declare c uuid; a uuid;
begin
  if not exists (select 1 from public.lava_courses where slug = 'foundation-virtual-assistant') then
    insert into public.lava_courses (slug, title, summary, status, sort_order)
      values ('foundation-virtual-assistant', 'Foundation: How to Become a Virtual Assistant', 'A beginner-friendly introduction to the Virtual Assistant role, what clients expect, and the professional habits you need to succeed. Finish with a clear plan to prepare for your VA career.', 'published', 1) returning id into c;
    insert into public.lava_lessons (course_id, title, body, minutes, sort_order) values
      (c, 'What Is a Virtual Assistant?', 'Welcome to your first step toward a career as a Virtual Assistant. Before you learn tools and techniques, it helps to understand clearly what this job is, why it exists, and why so many businesses around the world depend on it today.

## A simple definition

A **Virtual Assistant (VA)** is a professional who supports a business or an individual with tasks, usually from a location outside the client''s office. Instead of sitting at a desk next to the business owner, a VA uses a computer, an internet connection, and online tools to get work done.

Think of a VA as a reliable team member who happens to work from a different place. The work is real, the deadlines are real, and the results matter just as much as the work of someone in the office.

## Why businesses hire VAs

Business owners and managers often have more work than time. Many important tasks, like answering emails, updating records, or scheduling meetings, take hours every week. Hiring a VA allows them to focus on the work only they can do, such as making decisions, serving key customers, or growing the business.

Common reasons a business hires a VA include:

- They need help with daily administrative tasks.
- They want support across different time zones.
- They need someone organized to manage calendars, inboxes, and files.
- They want flexible support that can grow with the business.

## What makes a good VA

A good VA is not just someone who can use a computer. The best VAs combine skills with the right attitude. They are:

- **Reliable**: they do what they say they will do, on time.
- **Clear communicators**: they ask questions and give updates without being reminded.
- **Organized**: they keep track of tasks, files, and deadlines.
- **Willing to learn**: they pick up new tools and processes quickly.
- **Trustworthy**: they handle private information with care.

> Skills can be taught. A positive attitude, honesty, and a willingness to learn are what make clients want to keep working with you.

## Is this career right for you?

You do not need a special degree to begin. Many successful VAs started with basic computer skills, good English, and a strong desire to improve. If you enjoy helping others, like keeping things organized, and can work independently, this path may be a great fit.

## Practice exercise

Write three to five sentences that explain what a Virtual Assistant is, as if you were explaining it to a family member who has never heard the term. Then list two personal qualities you already have that would help you as a VA.

### Suggested answer

A strong answer might say: "A Virtual Assistant is a professional who helps businesses with tasks like emails, scheduling, and data entry. They work using a computer and the internet, often from a different location than the business. Businesses hire VAs so they can save time and focus on bigger goals." For qualities, choose ones you can support with an example, such as "I am organized because I manage my family''s monthly budget" or "I am reliable because I have never missed a deadline at school."

## Key takeaways

- A VA supports a business with tasks using a computer and online tools.
- Businesses hire VAs to save time and focus on their most important work.
- Reliability, communication, organization, and trust matter as much as technical skills.
- You can start this career with basic skills and a strong willingness to learn.', 4, 1),
      (c, 'What a VA Does Day to Day', 'Now that you know what a Virtual Assistant is, let us look at what the work actually looks like. Understanding a typical day helps you picture yourself in the role and prepare for it with realistic expectations.

## A sample day

Every client and role is different, but many VAs follow a similar rhythm. Here is an example of what a day might look like:

1. Log in on time and check messages from the client and team.
2. Review the task list or project board for the day''s priorities.
3. Clear the inbox: reply to routine emails and flag important ones.
4. Work on scheduled tasks, such as updating a spreadsheet or preparing a report.
5. Join a short check-in call or send a written update.
6. Handle new requests that come in during the day.
7. Send an end-of-day summary of what was done and what is next.

## Common daily tasks

Most VAs spend their time on a mix of the following:

- **Email management**: sorting, replying, and organizing messages.
- **Calendar management**: booking meetings, sending invites, and avoiding double bookings.
- **Data entry**: entering information into spreadsheets, databases, or customer systems.
- **Research**: finding information online and summarizing it clearly.
- **Document preparation**: creating and formatting documents, forms, and presentations.
- **Customer communication**: answering inquiries by email, chat, or phone.
- **File organization**: naming, saving, and sharing files so others can find them.

## The tools you will use

VAs rely on online tools to work and collaborate. You do not need to master all of them before starting, but you should be familiar with the main types:

- Email and calendar tools
- Word processors and spreadsheets
- Cloud storage for sharing files
- Chat and video call platforms
- Task or project management boards

> When you meet a new tool, spend fifteen minutes exploring its main features. Small, regular practice builds confidence faster than waiting until you are asked to use it.

## Routine work and new requests

A large part of the job is routine: tasks that repeat every day or week. Doing these well and consistently builds trust. At the same time, clients will often send new or urgent requests. A good VA balances both. They finish routine work reliably while staying flexible enough to handle something unexpected.

When a new request arrives and you are unsure how it fits with your current work, it is perfectly professional to ask, "Should I prioritize this over my current task, or finish this first?"

## Working with a team

Many VAs are part of a larger team. You might receive tasks from a manager, share work with other assistants, or coordinate with people in different departments. This means you should keep shared documents updated, respond to messages in a reasonable time, and let others know when something is done.

## Key takeaways

- A VA''s day usually includes checking messages, working through priorities, and reporting progress.
- Common tasks include email, calendar, data entry, research, documents, and customer communication.
- Familiarity with basic online tools is important, and you can build it through regular practice.
- Balance routine work with new requests, and ask about priorities when unsure.', 4, 2),
      (c, 'Different VA Responsibilities and Specializations', 'The term "Virtual Assistant" covers many kinds of work. Some VAs handle a little of everything, while others focus on one area. Knowing the main types helps you understand where your current strengths fit and where you might grow in the future.

## General administrative support

This is where many VAs begin. Administrative VAs keep the business running smoothly behind the scenes. Typical responsibilities include:

- Managing inboxes and calendars
- Data entry and record keeping
- Preparing documents and simple reports
- Organizing files and folders

## Customer support

Customer support VAs are the friendly voice of the business. They answer questions, solve problems, and make customers feel cared for. Responsibilities include:

- Responding to emails, chats, and calls
- Tracking customer issues until they are solved
- Updating customer records
- Escalating complex problems to the right person

## Sales and lead support

Some VAs help sales teams by finding potential customers, updating contact lists, booking appointments, and following up with leads. This work needs strong communication and careful attention to detail.

## Social media and content support

These VAs help businesses stay active online. They might schedule posts, respond to comments, create simple graphics, or research content ideas. Creativity and good writing skills are valuable here.

## Bookkeeping and finance support

With training, some VAs handle basic finance tasks such as recording expenses, preparing invoices, and organizing receipts. Accuracy and confidentiality are essential.

## Specialized operations support

Some industries need VAs who understand specific processes, such as property management, healthcare administration, online stores, or logistics. These roles often require extra training on the client''s systems and rules.

> You do not need to choose a specialization right away. Starting with general skills gives you a strong base, and your interests will become clearer as you gain experience.

## Skills that apply to every type

No matter which direction you take, some skills are needed everywhere:

- Clear written and spoken English
- Attention to detail
- Time management
- Following instructions and processes
- Protecting confidential information

## Practice exercise

Read the three short task lists below and decide which type of VA role each one describes.

1. Reply to customer emails about late deliveries, update order notes, and pass refund requests to a supervisor.
2. Schedule three posts for the week, reply to comments, and collect ideas for next month''s posts.
3. Organize the manager''s calendar, prepare a meeting agenda, and file signed documents in the correct folder.

Then write one sentence about which role interests you most and why.

### Suggested answer

The first list describes customer support, the second describes social media support, and the third describes general administrative support. For your personal sentence, connect the role to something real, for example: "Customer support interests me because I am patient and enjoy solving problems for people."

## Key takeaways

- VA work includes administrative, customer support, sales, social media, finance, and specialized roles.
- Many VAs start with general administrative skills and specialize later.
- Communication, attention to detail, and confidentiality matter in every type of role.
- Your interests and strengths can guide which area you grow into.', 5, 3),
      (c, 'What Clients Expect from a VA', 'Understanding what clients expect is one of the fastest ways to succeed. When you know what matters to the people you support, you can meet those needs before they even ask. This lesson explains the most common expectations and how to meet them.

## Reliability

Clients need to trust that work will be done correctly and on time. If you say a task will be finished by 3 PM, it should be finished by 3 PM. If something prevents you from meeting a deadline, tell the client early, not after the deadline has passed.

## Clear and timely communication

Because you are not in the same room, the client cannot see what you are doing. Your updates are their window into your work. Clients expect you to:

- Confirm when you receive a task
- Ask questions when instructions are unclear
- Share progress on longer tasks
- Report problems as soon as you notice them

> A short message such as "Received, I will have this ready by 2 PM" removes worry and shows you are in control.

## Accuracy and attention to detail

Small mistakes can create big problems. A wrong date on a calendar invite or a typo in a customer''s name can cost the client time and trust. Clients expect you to check your work before you send it.

## Confidentiality

You may handle private information such as customer details, financial records, and passwords. Clients expect you to keep all of this private. Never share client information with others, never save it in personal accounts, and follow any security rules the client provides.

## Initiative

Clients value VAs who think ahead. Initiative means noticing what needs to be done and offering to help, without overstepping your role. For example:

- Noticing that a meeting has no agenda and offering to prepare one
- Seeing that a file folder is messy and suggesting a clear naming system
- Spotting a repeated question from customers and proposing a ready-made reply

Always suggest first rather than changing important things without permission.

## Professional attitude

Clients expect politeness, patience, and a calm approach, even when things are busy or stressful. They also appreciate VAs who accept feedback well and use it to improve.

## Following processes

Many businesses have specific ways of doing things. Clients expect you to learn and follow these processes, even if you have done similar work differently before. If you see a way to improve a process, share your idea respectfully.

## When expectations are not clear

Sometimes clients do not explain what they want in detail. In these cases, ask simple, focused questions:

- "What is the deadline for this?"
- "Is there an example I can follow?"
- "Who should I contact if I have questions while you are away?"

Asking at the start saves time and prevents rework later.

## Key takeaways

- Clients expect reliability, clear communication, accuracy, and confidentiality.
- Confirm tasks, share progress, and report problems early.
- Show initiative by suggesting improvements, but ask before making big changes.
- When expectations are unclear, ask focused questions at the start.', 5, 4),
      (c, 'Professionalism and Work Ethics', 'Professionalism is how you behave at work, and work ethics are the values that guide your choices. Together, they decide whether clients trust you, recommend you, and want to keep working with you. This lesson covers the habits that make a VA truly professional.

## What professionalism looks like

Professionalism is shown in everyday actions, not just in big moments. A professional VA:

- Starts work on time and is available during agreed hours
- Communicates politely, even under pressure
- Dresses neatly and uses a tidy background for video calls
- Keeps promises and meets deadlines
- Admits mistakes and works to fix them

## Core work ethics for VAs

### Honesty

Always be truthful about your work, your hours, and your skills. If you do not know how to do something, say so and offer to learn. Never claim work you did not do or log hours you did not work.

### Integrity

Integrity means doing the right thing even when no one is watching. Remote work gives you freedom, and clients trust you to use that freedom responsibly.

### Confidentiality

Treat every piece of client information as private. Do not discuss client business with friends, post about it online, or store it on personal devices unless you are allowed to.

### Respect

Respect the client''s time, decisions, and culture. You may work with people from many countries. Be open-minded, avoid assumptions, and stay courteous.

## Professional boundaries

Being professional also means knowing your limits. It is acceptable to politely clarify your working hours or ask for priorities when you receive too many tasks. Being clear about boundaries helps you stay reliable instead of overwhelmed.

> Professionalism is not about being perfect. It is about being dependable, honest, and respectful every day.

## Common mistakes to avoid

- Going silent when a task becomes difficult
- Making excuses instead of offering solutions
- Using overly casual language with clients
- Sharing screenshots of client work on social media
- Doing personal tasks during paid working hours

## Practice exercise

Read the situation below and decide what a professional VA should do.

You accidentally sent a meeting invite with the wrong time to five people. The client has not noticed yet. Write the steps you would take and a short message to the client.

### Suggested answer

A professional response would be:

1. Correct the invite immediately and send an update to all attendees.
2. Inform the client honestly, even though they have not noticed.
3. Explain what you will do to prevent it in the future.

A sample message to the client:

> Hi Maria, I want to let you know that I sent the Thursday meeting invite with the wrong time earlier. I have already corrected it and sent an update to all five attendees. Going forward, I will double-check the time zone before sending invites. Sorry for the inconvenience.

This shows honesty, ownership, and a plan to improve, which builds more trust than hiding the mistake.

## Key takeaways

- Professionalism shows in punctuality, polite communication, and keeping promises.
- Honesty, integrity, confidentiality, and respect are the core work ethics of a VA.
- Clear boundaries help you stay reliable and avoid burnout.
- When you make a mistake, fix it, report it, and explain how you will prevent it.', 5, 5),
      (c, 'Time Management for Virtual Assistants', 'Time management is one of the most important skills a VA can have. You may support several tasks, people, or even clients at once, and you will often work without a manager nearby. Managing your time well helps you deliver quality work, meet deadlines, and avoid stress.

## Start with a clear task list

Never rely on memory alone. Keep one trusted list of all your tasks, whether in a notebook, a spreadsheet, or a task management tool. For each task, write:

- What needs to be done
- Who it is for
- When it is due

## Prioritize your work

Not all tasks are equally important. A simple way to prioritize is to ask two questions: Is it urgent? Is it important?

1. **Urgent and important**: do it first. Example: a client meeting starts in one hour and the slides are not ready.
2. **Important but not urgent**: schedule it. Example: updating the monthly report due next week.
3. **Urgent but less important**: handle quickly or ask if it can wait. Example: a routine request marked "ASAP" by a team member.
4. **Neither urgent nor important**: do it last or not at all.

When you are unsure about priorities, ask your client. It is better to ask than to guess wrong.

## Time blocking

Time blocking means setting specific periods for specific types of work. For example:

- 8:00 to 9:00: inbox and messages
- 9:00 to 11:00: focused work on reports
- 11:00 to 11:30: calendar and scheduling
- After lunch: customer replies and follow-ups

This reduces the stress of jumping between tasks and helps you finish important work.

## Reduce distractions

Working remotely brings distractions: social media, household noise, and personal phone notifications. Try these habits:

- Silence personal notifications during work hours
- Keep only work-related tabs open
- Let family members know your working schedule
- Take short planned breaks instead of random ones

> Batch similar tasks together. Answering ten emails in one session is faster than answering them one at a time throughout the day.

## Estimate and track your time

Learn how long your tasks really take. Track your time for a week and compare it with your estimates. This helps you give clients realistic deadlines and plan your day better.

## Practice exercise

It is 9:00 AM. You have these tasks:

- A: Prepare slides for the client''s 11:00 AM meeting today.
- B: Organize last month''s receipts, due Friday.
- C: Reply to a team member asking where a shared file is saved.
- D: Read an optional industry newsletter.

Put them in order and explain your reasoning in one sentence each.

### Suggested answer

A good order is C, A, B, D. Task C takes one minute and unblocks a teammate, so handle it quickly. Task A is urgent and important, so it gets your focused time before 11:00 AM. Task B is important but due later, so schedule it for the afternoon or the next day. Task D is optional, so it comes last. Some people would start with A first, which is also acceptable as long as C is answered soon.

## Key takeaways

- Keep one trusted task list with deadlines.
- Prioritize by urgency and importance, and ask when unsure.
- Use time blocking and batching to stay focused.
- Track your time to give realistic deadlines.', 5, 6),
      (c, 'Accountability: Owning Your Work', 'Accountability means taking responsibility for your tasks, your results, and your mistakes. In remote work, where the client cannot see you working, accountability is what builds trust. A VA who owns their work becomes someone the client can depend on completely.

## What accountability looks like

An accountable VA:

- Completes tasks without needing reminders
- Gives honest updates, including bad news
- Takes responsibility for mistakes instead of blaming others
- Follows through until the task is fully finished
- Keeps track of commitments and deadlines

## Ownership versus excuses

Compare these two responses to a missed deadline.

An excuse sounds like: "The internet was slow and the instructions were confusing, so I could not finish."

Ownership sounds like: "I did not finish the report on time. I should have asked about the unclear instructions earlier. It will be ready by 2 PM today, and next time I will raise questions on the first day."

Both may be true, but the second response shows responsibility and a plan. Clients remember how you handle problems.

> Bad news does not get better with time. Share problems early, along with what you are doing to solve them.

## Communicating proactively

Being proactive means you speak up before the client has to ask. Examples include:

- Telling the client in the morning that a task may be delayed, instead of at the deadline
- Confirming that a task is done, even if the client did not ask
- Asking for missing information as soon as you notice it is missing

## Tracking your commitments

Accountability is easier when you have a system. Write down every request you accept. Mark tasks as done only when they are truly complete. At the end of each day, review what you finished and what is still open.

Many VAs send a short end-of-day report. A simple format is:

- **Completed**: tasks finished today
- **In progress**: tasks still being worked on, with expected completion
- **Blockers**: anything preventing progress
- **Tomorrow**: planned priorities

## Accepting feedback

Feedback is part of accountability. When a client corrects your work, listen, thank them, and apply the change. Avoid defending yourself or taking it personally. Each correction is a chance to get better and show that you learn quickly.

## Being accountable to yourself

Accountability is also personal. Set goals for your own growth, such as improving your typing speed or learning a new tool, and track your progress. The habits you build for yourself will show in your work for clients.

## Key takeaways

- Accountability means owning your tasks, results, and mistakes.
- Replace excuses with ownership and a clear plan.
- Share problems early and confirm completed tasks without being asked.
- Use a simple system, such as an end-of-day report, to track your commitments.
- Accept feedback calmly and use it to improve.', 4, 7),
      (c, 'Working Remotely and Starting with Onsite Training', 'Remote work gives you flexibility, but it also asks for discipline, good habits, and the right setup. In addition, many VA roles begin with a period of onsite training before the assistant moves to remote or hybrid work. This lesson helps you prepare for both.

## Why many roles begin onsite

It is common for VA roles to start with onsite training at an office or training center. This period helps new team members:

- Learn the company''s tools, systems, and processes directly
- Get quick help from trainers and supervisors
- Build relationships with the team
- Show their reliability and work habits

Treat onsite training as an important opportunity. Arrive on time, take notes, ask questions, and practice what you learn. The habits you show during training often decide how smoothly you move into remote work later.

## Setting up your remote workspace

When you begin working remotely, your home becomes your office. A good setup includes:

- A reliable computer that meets the role''s requirements
- A stable internet connection, ideally with a backup option such as mobile data
- A headset with a microphone for calls
- A quiet, well-lit space with a neat background for video calls
- A backup power plan if outages are common in your area

## Building a remote routine

Without an office, structure has to come from you. Helpful habits include:

- Starting and ending work at the same times each day
- Getting dressed for work, even at home
- Taking planned breaks and a proper lunch
- Separating your work area from your rest area when possible

## Staying visible and connected

In remote work, people only know what you share. Stay visible by:

- Saying good morning when you log in and letting the team know when you log off
- Responding to messages within the expected time
- Keeping your status updated in chat tools
- Joining calls with your camera on when requested

> If your internet or power goes down, inform your client or supervisor as soon as possible using another device, and share when you expect to be back.

## Security when working remotely

Protect client information at home:

- Use strong passwords and never share them
- Lock your computer when you step away
- Avoid public Wi-Fi for client work
- Do not let family members use your work accounts

## Practice exercise

Imagine you are moving from onsite training to working from home next week. Write a short checklist of at least six things you will prepare, and one message you would send to your supervisor on your first remote morning.

### Suggested answer

A good checklist could include: test internet speed, set up a backup connection, prepare a headset, clean the work area, check that all work tools and logins work, set a daily schedule, and inform family members of working hours. A sample first-morning message:

> Good morning! I am online and ready for my first remote day. All my tools are working. I will start with the inbox and then the weekly report. Please let me know if you need anything.

## Key takeaways

- Many VA roles start with onsite training, which is a key chance to learn and build trust.
- A reliable computer, internet, headset, and quiet space are the basics of a remote setup.
- A consistent routine and clear visibility help you succeed remotely.
- Always protect client information when working from home.', 5, 8),
      (c, 'How to Prepare for a VA Career', 'You have learned what a VA is, what the work involves, and the habits that help you succeed. Now it is time to turn that knowledge into action. This lesson gives you a practical plan to prepare for your first VA role.

## Step 1: Assess your current skills

Start by being honest about where you are. Rate yourself from one to five in these areas:

- Written English
- Spoken English
- Typing speed and accuracy
- Email and calendar tools
- Spreadsheets and documents
- Organization and time management

Your lowest scores show where to focus first.

## Step 2: Build core skills

Focus on skills that every VA needs:

1. Practice typing daily to improve speed and accuracy.
2. Learn the basics of spreadsheets, such as sorting, filtering, and simple formulas.
3. Practice writing short, clear professional emails.
4. Use a calendar tool to schedule your own week.
5. Read and listen to English content daily to build vocabulary and confidence.

Many free online resources and tutorials can help you learn these skills at your own pace.

## Step 3: Prepare your equipment and workspace

Check that your computer, internet, and headset are ready. Set up a quiet space where you can work and take calls. Being prepared shows that you take the opportunity seriously.

## Step 4: Create a simple resume

Your resume should be clear and honest. Include:

- Your contact details
- A short summary of your skills and goals
- Relevant experience, including school projects, volunteer work, or part-time jobs
- Tools you can use
- Any training or certificates you have completed

> Experience in customer service, school organizations, or family businesses counts. Describe what you did and what you achieved.

## Step 5: Prepare for interviews and assessments

Many VA applications include an interview and a skills test. Prepare by:

- Practicing answers to common questions, such as "Tell me about yourself" and "How do you manage your time?"
- Testing your internet and headset before any online interview
- Preparing examples that show reliability, problem-solving, and communication
- Reading instructions on any test carefully before starting

## Step 6: Keep learning

The best VAs never stop learning. Complete the courses in this training program, practice what you learn, and ask for feedback whenever you can.

## Practice exercise

Write a short answer to the interview question "Why do you want to become a Virtual Assistant?" Keep it to four or five sentences.

### Suggested answer

A strong answer is honest, specific, and connected to the job. For example: "I want to become a Virtual Assistant because I enjoy organizing tasks and helping people work more efficiently. In school, I managed schedules and documents for our student organization, and I liked making things run smoothly. I am comfortable learning new tools, and I communicate clearly in English. I am excited to grow in a role where I can support a team and continue improving my skills." Avoid answers that focus only on working from home or on pay.

## Key takeaways

- Assess your skills honestly and focus on the weakest areas first.
- Build core skills: typing, spreadsheets, email writing, calendars, and English.
- Prepare your equipment, an honest resume, and examples for interviews.
- Keep learning and asking for feedback throughout your career.', 5, 9);
  else
    select id into c from public.lava_courses where slug = 'foundation-virtual-assistant';
  end if;
  if not exists (select 1 from public.lava_assessments where slug = 'foundation-virtual-assistant-quiz') then
    insert into public.lava_assessments (slug, course_id, kind, title, description, pass_percent, status, sort_order)
      values ('foundation-virtual-assistant-quiz', c, 'quiz', 'Foundation Course Quiz', 'Check your understanding of the VA role, client expectations, and professional work habits.', 70, 'published', 1) returning id into a;
    insert into public.lava_questions (assessment_id, prompt, scenario, context, options, answer, explanation, sort_order) values
      (a, 'Which statement best describes a Virtual Assistant?', null, null, '["A software program that automatically replies to emails","A freelancer who only creates social media graphics","A professional who supports a business with tasks using a computer and online tools, often from a different location","A person who only answers phone calls for one company"]'::jsonb, 2, 'A VA is a professional who supports businesses with a range of tasks using online tools, usually working remotely.', 1),
      (a, 'Why do many businesses hire Virtual Assistants?', null, null, '["To save time and focus on the work only they can do","To replace all of their managers","To make sure every task is done in the office","To avoid giving any instructions"]'::jsonb, 0, 'Hiring a VA frees business owners and managers to focus on decisions, key customers, and growth.', 2),
      (a, 'What is the best first step?', 'Your client sends you a task with no deadline and only a one-line description. You are not sure what the final result should look like.', null, '["Guess what they want and submit it quickly","Ignore it until you finish all other tasks","Ask focused questions about the deadline and whether there is an example to follow","Wait until the client sends more details"]'::jsonb, 2, 'Asking short, focused questions at the start prevents rework and shows professionalism.', 3),
      (a, 'What should you do?', 'You realize you sent a client report with an incorrect total. The client has not replied yet.', null, '["Correct the report, tell the client honestly, and explain how you will prevent it next time","Send a corrected version without mentioning the error","Say nothing and hope the client does not notice","Blame the spreadsheet formula in your message"]'::jsonb, 0, 'Fixing the mistake, reporting it honestly, and sharing a prevention plan builds trust.', 4),
      (a, 'Using the urgent and important method, which task should usually be done first?', null, null, '["Reorganizing your personal desktop icons","Slides needed for a client meeting in one hour","A report due next week","An optional newsletter you want to read"]'::jsonb, 1, 'A task that is both urgent and important, like slides for a meeting soon, should be handled first.', 5),
      (a, 'What is the most accountable action?', 'It is 3 PM. A report is due at 5 PM, but you are waiting for data from a teammate who has not replied, and you will likely miss the deadline.', null, '["Inform the client now about the delay, the reason, and your plan to finish","Ask a friend outside the company to fill in the data","Submit an incomplete report without saying anything","Wait until 5 PM and then explain why it is late"]'::jsonb, 0, 'Accountable VAs share problems early with a clear plan instead of waiting until the deadline passes.', 6),
      (a, 'Which of these is an example of showing initiative in a professional way?', null, null, '["Deleting old emails you think are not important","Doing only exactly what is written and nothing more","Changing the client''s filing system without asking","Noticing a meeting has no agenda and offering to prepare one"]'::jsonb, 3, 'Initiative means spotting needs and offering help, while asking before making important changes.', 7),
      (a, 'Why do many VA roles begin with onsite training?', null, null, '["So that new team members can skip learning company processes","So new team members can learn systems directly, get quick help, and build team relationships","Because remote work is never allowed later","Because VAs do not need to learn any tools"]'::jsonb, 1, 'Onsite training lets new VAs learn tools and processes directly and build trust before working remotely.', 8),
      (a, 'What should you do?', 'You are working from home and your power goes out. Your phone still has battery and mobile data.', null, '["Wait quietly until the power returns","Log off for the day without telling anyone","Use your phone to inform your supervisor right away and share when you expect to be back","Post about the outage on social media and wait for your client to see it"]'::jsonb, 2, 'Informing your supervisor quickly through another device keeps you reliable and visible during problems.', 9),
      (a, 'Which practice best protects client information when working remotely?', null, null, '["Locking your computer when you step away and avoiding public Wi-Fi for client work","Using the same simple password for all accounts so you do not forget it","Sharing your work login with a family member in case you need help","Saving client files to your personal cloud account for easy access"]'::jsonb, 0, 'Locking your device, using strong private passwords, and avoiding public Wi-Fi help keep client data safe.', 10);
  end if;
end $seed$;

do $seed$
declare c uuid; a uuid;
begin
  if not exists (select 1 from public.lava_courses where slug = 'communication-skills') then
    insert into public.lava_courses (slug, title, summary, status, sort_order)
      values ('communication-skills', 'Communication Skills', 'Learn to communicate clearly and professionally as a Virtual Assistant by email, phone, and chat. Practice with sample emails, call scripts, and before-and-after rewrites.', 'published', 2) returning id into c;
    insert into public.lava_lessons (course_id, title, body, minutes, sort_order) values
      (c, 'Foundations of Professional Communication', 'Communication is the heart of a Virtual Assistant''s job. Because you often work away from your client, almost everything you do is shared through words: emails, messages, calls, and reports. This lesson introduces the basic principles that make communication professional and effective.

## What makes communication professional

Professional communication is clear, polite, and purposeful. It helps the other person understand quickly and act easily. It has four main qualities:

- **Clear**: the message is easy to understand on the first read.
- **Concise**: it includes what is needed and nothing extra.
- **Courteous**: it is polite and respectful, even when the topic is difficult.
- **Complete**: it answers the main questions, such as what, when, and who.

## Know your purpose

Before you write or speak, ask yourself: "What do I want the other person to know or do?" A message with a clear purpose is easier to write and easier to read. If you cannot explain your purpose in one sentence, take a moment to organize your thoughts first.

## Know your audience

Adjust your message to the person receiving it. A client who is busy may prefer short bullet points. A new customer may need more explanation. A teammate may be fine with a quick chat message. The words change, but professionalism stays the same.

## Choose the right channel

Different situations need different tools:

- **Email**: formal requests, detailed information, and anything that needs a record.
- **Chat**: quick questions, short updates, and team coordination.
- **Phone or video call**: urgent issues, complex discussions, or sensitive topics.

> If a chat conversation goes back and forth more than five or six times without being solved, suggest a quick call.

## Tone matters

Tone is the feeling behind your words. In written messages, people cannot hear your voice or see your face, so they may misread your tone. Short replies like "Fine." or "Noted." can sound cold or annoyed. Adding a few friendly words makes a big difference.

Compare these two replies:

Before: "Ok."

After: "Got it, thank you! I will send the update by 3 PM."

The second version confirms understanding, shows warmth, and sets an expectation.

## Confirm understanding

Misunderstandings waste time. After receiving instructions, briefly repeat the key points back to confirm. For example: "Just to confirm, you would like the report in PDF by Friday, with last month''s numbers included. Is that correct?"

## Key takeaways

- Professional communication is clear, concise, courteous, and complete.
- Know your purpose and your audience before you communicate.
- Choose the right channel: email, chat, or call.
- Watch your tone in writing and confirm understanding of instructions.', 4, 1),
      (c, 'Clear English for the Workplace', 'You do not need perfect English to be an excellent Virtual Assistant. What clients value most is English that is clear, polite, and easy to understand. This lesson gives you practical techniques to make your workplace English simpler and more professional.

## Keep it simple

Short sentences and common words are easier to understand, especially for clients who are busy or whose first language is not English. Aim for one idea per sentence.

Before: "I would like to inform you that with regards to the matter of the documents that you have requested, they have already been completed and are now available for your perusal."

After: "The documents you requested are ready. You can find them in the shared folder."

## Avoid common workplace errors

Some expressions are common in everyday conversation but can confuse international clients. Here are better alternatives:

- Instead of "Kindly do the needful," write "Could you please review and approve this?"
- Instead of "I will revert to you," write "I will get back to you" or "I will reply."
- Instead of "Please be informed that," simply state the information.
- Instead of "Noted with thanks," write "Thank you, I have noted this."
- Instead of "Same with yesterday," write "Same as yesterday."

## Use polite, confident language

Being polite does not mean being unsure. Use phrases that are both respectful and confident:

- "Could you please send me the file?"
- "I recommend we schedule the call for Tuesday."
- "I will have this ready by 4 PM."
- "Would it be possible to extend the deadline to Friday?"

Avoid weak phrases that make you sound unsure, such as "Sorry to bother you, but maybe if it is okay..."

> Read your message once before sending it. Ask yourself: "If I knew nothing about this topic, would I understand this?"

## Speaking clearly

On calls, clarity is more important than speed or accent. Tips:

- Speak a little slower than usual
- Pronounce the ends of words clearly
- Pause between ideas
- Spell names and numbers when needed, for example "That is M as in Mike, A as in Alpha"

## Building your English daily

Improve steadily with small daily habits: read short business articles, listen to podcasts in English, write a short daily summary of your work in English, and note new phrases you can reuse.

## Practice exercise

Rewrite these three sentences so they are clearer and more professional.

1. "Kindly do the needful regarding the attached file asap."
2. "Sorry, I was not able to do it because I have so many things to do and also the internet is slow, I will try to do it later maybe."
3. "Please be informed that the meeting is moved."

### Suggested answer

1. "Could you please review the attached file and send your approval by end of day today?"
2. "I was not able to finish this today. I will complete it by 10 AM tomorrow. Please let me know if you need it sooner."
3. "The meeting has been moved to Thursday at 2 PM. The calendar invite has been updated."

Notice that each rewrite is specific, shorter, and tells the reader exactly what to expect.

## Key takeaways

- Clear and polite English matters more than perfect grammar.
- Use short sentences, common words, and one idea per sentence.
- Replace confusing expressions with simple, international phrases.
- Speak slowly and clearly, and build your English through daily practice.', 5, 2),
      (c, 'Email Etiquette', 'Email is one of the most important tools for a Virtual Assistant. A well-written email saves time, prevents confusion, and makes you look professional. This lesson covers the structure, tone, and habits of excellent business emails.

## The structure of a professional email

1. **Subject line**: short and specific, so the reader knows the topic before opening.
2. **Greeting**: friendly and appropriate, such as "Hi Daniel," or "Good morning, Ms. Santos,".
3. **Opening line**: state the purpose quickly.
4. **Body**: give the details, using short paragraphs or bullet points.
5. **Call to action**: say clearly what you need and by when.
6. **Closing and signature**: polite closing, your name, and role.

## Writing good subject lines

Before: "Hello" or "Question"

After: "Request: Approval for March invoice by Friday" or "Update: Website content ready for review"

## Sample email

> Subject: Request: Approval for supplier invoice by Thursday

> Hi Daniel,

> I hope your week is going well. I am writing to request your approval for the attached supplier invoice for office supplies.

> Here are the details:

> Amount: 450 dollars. Due date: Friday, March 15. Purchase order: matches the attached order form.

> Could you please reply with your approval by Thursday so I can process the payment on time?

> Thank you,

> Ana Reyes, Virtual Assistant

## Tone and politeness

- Use "please" and "thank you" naturally.
- Avoid writing in all capital letters, which looks like shouting.
- Avoid too many exclamation marks.
- Keep humor light or avoid it with new clients.

## Reply and forward etiquette

- Reply within the expected time, usually within the same business day.
- If you need more time, send a short reply: "Thank you, I received this and will reply by tomorrow noon."
- Use "Reply all" only when everyone needs the information.
- Check attachments before sending. If you mention an attachment, make sure it is attached.

> Before you click send, check four things: the recipient, the subject, the attachment, and the spelling of names.

## Practice exercise

Rewrite this weak email into a professional one.

> Subject: hi

> hello sir the report is not finish yet because i need the sales data from john, can u send it. thanks

### Suggested answer

> Subject: Request: Sales data needed to complete weekly report

> Hi Mark,

> I am working on the weekly report and need the latest sales data to complete it. I have asked John but have not received it yet.

> Could you please share the sales data, or let me know who else I can contact? Once I receive it, I can finish the report within two hours.

> Thank you,

> Ana

The improved version has a clear subject, a proper greeting, the reason, a specific request, and a timeline.

## Key takeaways

- Follow a clear structure: subject, greeting, purpose, details, call to action, closing.
- Write specific subject lines so readers know the topic immediately.
- Keep a polite, calm tone and avoid all capitals and extra exclamation marks.
- Check recipients, attachments, and names before sending.', 6, 3),
      (c, 'Phone Communication', 'Many VA roles include phone calls with clients, customers, or suppliers. On the phone, people cannot see your face, so your voice, words, and preparation carry the entire message. This lesson covers how to handle calls with confidence and professionalism.

## Before the call

Preparation reduces nervousness and mistakes. Before making or taking calls:

- Test your headset and microphone
- Choose a quiet place and close noisy windows or doors
- Have a notepad or document open for notes
- Review the purpose of the call and any customer information
- Keep a glass of water nearby

## Answering a call

A professional greeting includes a welcome, the business name or your role, your name, and an offer to help.

> Good morning, thank you for calling. This is Carla. How may I help you today?

Smile while you speak. People can hear a smile in your voice, and it makes you sound warm and friendly.

## Sample outbound call script

Here is a simple script for calling a client''s customer to confirm an appointment.

> Hi, may I speak with Mr. Lopez, please?

> Good afternoon, Mr. Lopez. This is Carla, calling on behalf of your service provider. Is this a good time to talk for two minutes?

> I am calling to confirm your appointment on Tuesday, June 4, at 10 AM. Will that time still work for you?

> Thank you. You will receive a confirmation email shortly. Is there anything else I can help you with today?

> Thank you for your time, Mr. Lopez. Have a great day.

## Active phone skills

- **Speak clearly and at a steady pace**, slightly slower than normal.
- **Use the caller''s name** a few times to make the conversation personal.
- **Confirm important details** by repeating them: "Just to confirm, that is 0917, 555, 1234?"
- **Ask before placing someone on hold**: "May I place you on hold for about one minute while I check?"
- **Thank them for waiting** when you return.

> Never leave a caller on hold for a long time without checking back. If it will take longer, offer to call them back at a specific time.

## Leaving a voicemail

Keep voicemails short: your name, reason for calling, a callback number spoken slowly, and the best time to reach you. Repeat the number twice.

## Ending the call

Summarize the next steps, ask if there is anything else, and thank the caller. Let the caller hang up first when possible. After the call, write your notes immediately while the details are fresh.

## Practice exercise

Write a short voicemail message for this situation: you are calling a supplier named Ms. Tan to ask about a delayed delivery. Your callback number is 02 8123 4567.

### Suggested answer

> Hi Ms. Tan, this is Carla, a Virtual Assistant calling on behalf of my client. I am calling about the delivery scheduled for Monday, which we have not received yet. Could you please call me back at 02 8123 4567? Again, that is 02 8123 4567. I am available until 5 PM today. Thank you, and have a good day.

It is short, polite, states the reason, and repeats the number clearly.

## Key takeaways

- Prepare your equipment, space, and information before calls.
- Greet callers warmly with your name and an offer to help.
- Confirm details by repeating them, and always ask before placing someone on hold.
- Summarize next steps, thank the caller, and write notes right away.', 5, 4),
      (c, 'Active Listening', 'Active listening means fully focusing on the speaker, understanding their message, and responding thoughtfully. It is one of the most valuable communication skills a VA can develop, because clients and customers feel respected when they are truly heard. It also helps you avoid mistakes caused by misunderstanding.

## Hearing versus listening

Hearing is simply noticing sounds. Listening is paying attention to meaning, feeling, and intent. Many communication problems happen because we hear the words but miss the point, often because we are already thinking about our reply.

## The habits of an active listener

- **Give full attention**: close other tabs, silence notifications, and look at the speaker on video calls.
- **Do not interrupt**: let the person finish their thought before responding.
- **Show you are listening**: use short phrases like "I see," "Okay," or "That makes sense."
- **Ask clarifying questions**: "When you say urgent, do you mean today or this week?"
- **Paraphrase**: repeat the main idea in your own words to confirm understanding.
- **Notice emotions**: pay attention to tone, not just facts.

## Paraphrasing in practice

Paraphrasing shows that you understood and gives the speaker a chance to correct you.

Client says: "I need the client list cleaned up before the campaign. A lot of the emails bounce, and some contacts are duplicated."

You reply: "So you would like me to remove duplicate contacts and fix or remove invalid email addresses before the campaign starts. When does the campaign launch?"

This confirms the task and asks for the missing detail, the deadline.

> A good rule: listen to understand, not to reply. Your best response comes after you fully understand the message.

## Listening for emotions

Sometimes the most important part of a message is the feeling behind it. A customer who says "This is the third time I have called about this" is not just sharing a fact. They are frustrated. Acknowledging that feeling helps calm the situation:

"I understand how frustrating it must be to call several times. Let me make sure we solve this for you today."

## Taking notes

Notes help you remember details and show the client you take their instructions seriously. Write down:

- Key tasks and deadlines
- Names, numbers, and dates
- Questions you need to ask later
- Decisions made during the conversation

After a call or meeting, send a short summary to confirm what was agreed.

## Barriers to listening

Watch out for common barriers: distractions, assuming you already know what the person will say, preparing your reply too early, and personal feelings about the topic. Noticing these barriers is the first step to overcoming them.

## Key takeaways

- Active listening means focusing on meaning, not just words.
- Give full attention, avoid interrupting, and ask clarifying questions.
- Paraphrase to confirm understanding and acknowledge emotions.
- Take notes and send a summary after important conversations.', 4, 5),
      (c, 'Customer Service Essentials', 'Many VAs interact directly with their client''s customers. In those moments, you represent the business. Excellent customer service builds loyalty, while poor service can quickly damage a business''s reputation. This lesson covers the essentials of serving customers well.

## The goal of customer service

The goal is simple: help the customer solve their problem while making them feel respected and valued. Customers usually remember how you made them feel, even more than the details of the solution.

## The qualities of great customer service

- **Empathy**: understand the customer''s feelings and situation.
- **Patience**: stay calm, even if the customer repeats themselves or is upset.
- **Product knowledge**: know the products, services, and policies well.
- **Problem-solving**: look for solutions, not just reasons something cannot be done.
- **Follow-through**: do what you promise and confirm when it is done.

## A simple framework for customer inquiries

1. **Greet** the customer warmly.
2. **Listen** to understand the issue fully.
3. **Acknowledge** their concern and feelings.
4. **Solve** the problem or explain the next steps.
5. **Confirm** that the customer is satisfied.
6. **Close** politely and thank them.

## Positive language

The words you choose change how customers feel. Focus on what you can do, not what you cannot.

Before: "I can''t process your refund until you send the receipt."

After: "I will be happy to process your refund as soon as I receive your receipt."

Before: "That''s not my department."

After: "Let me connect you with the team who can help with this right away."

> Never promise something you are not sure you can deliver. It is better to say "Let me check and get back to you by 3 PM" than to make a promise you cannot keep.

## Knowing when to escalate

Some issues are beyond your role, such as large refunds, legal concerns, or policy exceptions. Learn your client''s escalation rules. When you escalate, give the next person a clear summary so the customer does not have to repeat everything.

## Practice exercise

A customer sends this chat message: "I ordered a blue jacket but received a black one. I need it for an event on Saturday." Write a reply using the customer service framework.

### Suggested answer

> Hi Jamie, thank you for reaching out, and I am sorry you received the wrong color. I understand you need the jacket for your event on Saturday. I have checked, and the blue jacket in your size is in stock. I can arrange an express replacement so it arrives by Friday, and we will send a prepaid label to return the black one. Would that work for you?

This reply greets the customer, acknowledges the problem and the deadline, offers a clear solution, and checks that the customer agrees. Only offer options that your client''s policies allow.

## Key takeaways

- Great customer service combines empathy, patience, knowledge, and follow-through.
- Use the greet, listen, acknowledge, solve, confirm, close framework.
- Use positive language that focuses on what you can do.
- Never overpromise, and escalate with a clear summary when needed.', 5, 6),
      (c, 'Handling Difficult Conversations', 'Sooner or later, every VA faces a difficult conversation: an angry customer, an unhappy client, or a request you cannot fulfill. These moments can feel stressful, but with the right approach you can stay calm, protect the relationship, and often turn a bad situation into a positive one.

## Stay calm first

When someone is upset, your first job is to stay calm. Take a slow breath before you respond. Remember that the person is usually frustrated with the situation, not with you personally. Your calm tone helps calm them too.

## The LEAP approach

A simple method for difficult conversations is LEAP:

1. **Listen**: let the person explain fully without interrupting.
2. **Empathize**: show you understand how they feel.
3. **Apologize**: apologize for the experience, even if it was not your fault.
4. **Propose**: offer a solution or clear next steps.

## Sample phrases

To empathize:

- "I understand why you are upset."
- "I can see how this has caused you trouble."

To apologize:

- "I am sorry for the inconvenience this has caused."
- "I apologize that this was not handled as you expected."

To propose:

- "Here is what I can do for you right now."
- "I will look into this and update you by 2 PM today."

## Saying no politely

Sometimes you must decline a request. A good "no" is respectful and, where possible, offers an alternative.

Before: "No, we don''t do that."

After: "I am not able to change the order after it has shipped, but I can help you set up a return as soon as it arrives."

## Receiving criticism from a client

If a client is unhappy with your work, avoid getting defensive. Listen, ask questions to understand exactly what went wrong, thank them for the feedback, and explain how you will fix it.

> Hi Sarah, thank you for pointing this out. I understand the report did not use the correct template. I will update it with the right format and send it back by 11 AM. I have also saved the template so I use it every time from now on.

## When to step back

If a person becomes abusive or uses offensive language, you do not have to accept it. Calmly state that you want to help, and follow your client''s policy, which may include escalating to a supervisor.

## Practice exercise

A customer writes: "This is ridiculous! I have emailed three times and nobody has answered me. Your service is terrible." Write a calm, professional reply using LEAP. The customer''s issue is a missing invoice copy.

### Suggested answer

> Hi Mr. Cruz, thank you for your patience, and I am truly sorry that your previous emails were not answered. I understand how frustrating that must be. I have attached a copy of your invoice to this email. I have also noted your account so any future requests are handled quickly. If there is anything else you need, please reply here and I will personally make sure it is resolved.

The reply listens to the complaint, shows empathy, apologizes sincerely, and solves the problem immediately.

## Key takeaways

- Stay calm and remember that frustration is usually about the situation, not you.
- Use LEAP: listen, empathize, apologize, propose.
- When saying no, be respectful and offer an alternative if possible.
- Accept criticism without defensiveness and explain how you will fix the issue.', 5, 7),
      (c, 'Proper Client Communication', 'Your relationship with your client depends heavily on how you communicate. Good client communication builds trust, reduces stress for both sides, and makes you the kind of assistant clients rely on. This lesson focuses on updates, questions, and expectations in your daily work with a client.

## Learn your client''s preferences

Every client is different. Early on, find out:

- Which channel they prefer for questions: email, chat, or calls
- How often they want updates
- Their working hours and time zone
- What counts as urgent and how to reach them for urgent matters

Write these preferences down and follow them consistently.

## Giving clear updates

Clients should never have to wonder what you are working on. A good update is short and organized.

> End-of-day update, Tuesday:

> Completed: 40 new leads added to the spreadsheet. Meeting with the design team booked for Thursday at 10 AM.

> In progress: Monthly expense report, about 70 percent done, ready by tomorrow noon.

> Need from you: Approval on the two draft emails in the shared folder.

## Asking good questions

Clients appreciate questions that are easy to answer. Group your questions together instead of sending many separate messages, and offer options when possible.

Before: "What should I do with the old files?"

After: "For the old files from 2022, should I move them to the Archive folder or delete them? I suggest archiving so nothing is lost."

## Managing expectations

Be realistic when you commit to deadlines. If a task will take two days, do not say "today" just to please the client. If priorities conflict, ask the client to choose.

> Hi Leo, I received your new request for the presentation. I am currently finishing the invoice report due at 3 PM. Should I pause the report and start the presentation, or finish the report first?

## Sharing bad news

When problems happen, tell the client early, explain the impact, and offer a solution. Clients handle bad news much better when it comes with a plan.

## Respecting time zones and boundaries

If your client is in a different time zone, schedule messages to arrive during their working hours when possible, unless the matter is urgent. Avoid sending many messages late at night their time.

## Practice exercise

Your client asked you to book a hotel for a business trip, but the hotel they wanted is fully booked. Write a short message to the client explaining the situation and offering options.

### Suggested answer

> Hi Leo, the hotel you requested is fully booked for May 10 to 12. I found two similar options nearby:

> 1. A hotel two blocks from the conference venue, similar price, with breakfast included.

> 2. A hotel ten minutes away by car, slightly lower price, with free airport shuttle.

> I recommend the first option because it is walking distance to your meetings. Would you like me to book it? Rooms are limited, so a reply by end of day would be best.

This message explains the problem, provides options with key details, gives a recommendation, and sets a clear timeline.

## Key takeaways

- Learn and follow each client''s communication preferences.
- Send short, organized updates: completed, in progress, and what you need.
- Ask easy-to-answer questions and offer options with a recommendation.
- Manage expectations honestly and share bad news early with a plan.', 5, 8),
      (c, 'Professional Messaging: Chat, Slack, and Teams', 'Chat tools such as Slack, Microsoft Teams, and similar platforms are now central to remote work. They are fast and convenient, but that speed can lead to unclear or overly casual messages. This lesson shows you how to use workplace chat professionally.

## Chat is quick, but still professional

Chat is less formal than email, but it is still work communication. Use proper spelling, clear sentences, and a friendly but respectful tone. Avoid heavy slang, long strings of abbreviations, and messages in all capital letters.

## Avoid the "hello" message

One common habit slows everyone down: sending only "Hi" and waiting for a reply before asking your question.

Before:

"Hi"

(waits ten minutes)

"Are you there?"

After:

"Hi Mia, quick question: should the client invoices be saved as PDF or Excel? I am sending them at 2 PM."

The second version lets the other person reply right away with everything they need.

## Write complete, scannable messages

- Put the main point or question first.
- Use short lines or bullets for multiple items.
- Mention deadlines clearly.
- Tag people with an at-mention only when you need their attention.

## Use channels and threads correctly

- Post in the right channel for the topic, not in a random one.
- Reply in threads to keep conversations organized.
- Use direct messages for private or one-person topics.
- Avoid sharing sensitive information, such as passwords, in open channels.

## Status and availability

Keep your status updated so the team knows when you are available, in a meeting, on a break, or offline. Set a clear status when you step away, for example "On lunch break, back at 1 PM."

> Reply within a reasonable time during work hours. If you cannot answer fully right now, send a quick acknowledgment such as "Seen, I will check and reply within the hour."

## Emojis and reactions

Many teams use reactions, such as a thumbs up, to confirm they saw a message. Follow your team''s style. With new clients, keep it simple and professional until you understand their culture.

## When to move from chat to a call or email

Move to a call when a discussion becomes long or confusing. Move to email when you need a formal record, when sharing with people outside the team, or when the information is detailed.

## Practice exercise

Rewrite these chat messages to make them professional and complete.

1. "hey r u done w/ the report??"
2. "Hi" (no follow-up)
3. "URGENT!!! CALL ME"

### Suggested answer

1. "Hi Paolo, just checking on the sales report. Will it be ready by 3 PM? I need to send it to the client at 4 PM."
2. "Hi Jen, could you share the link to the updated price list? I need it for a customer reply this morning."
3. "Hi Mark, the client''s website checkout is showing an error and customers cannot pay. Are you available for a quick call in the next 10 minutes?"

Each rewrite explains the context, the request, and the timeline, so the reader can act immediately.

## Key takeaways

- Chat is informal but still professional: write clearly and respectfully.
- Avoid sending a lone "Hi". Include your full question in one message.
- Use channels, threads, and status updates correctly.
- Move to a call or email when chat is not the right tool.', 5, 9);
  else
    select id into c from public.lava_courses where slug = 'communication-skills';
  end if;
  if not exists (select 1 from public.lava_assessments where slug = 'communication-skills-quiz') then
    insert into public.lava_assessments (slug, course_id, kind, title, description, pass_percent, status, sort_order)
      values ('communication-skills-quiz', c, 'quiz', 'Communication Skills Quiz', 'Test your ability to communicate clearly and professionally by email, phone, and chat.', 70, 'published', 2) returning id into a;
    insert into public.lava_questions (assessment_id, prompt, scenario, context, options, answer, explanation, sort_order) values
      (a, 'Which set of qualities best describes professional communication?', null, null, '["Long, formal, detailed, and complex","Fast, casual, short, and funny","Indirect, cautious, apologetic, and vague","Clear, concise, courteous, and complete"]'::jsonb, 3, 'Professional messages are clear, concise, courteous, and complete so the reader can understand and act easily.', 1),
      (a, 'Which subject line is the most effective for a business email?', null, null, '["URGENT PLEASE READ","Hello","Question","Request: Approval for March invoice by Friday"]'::jsonb, 3, 'A specific subject line tells the reader the topic and deadline before they open the email.', 2),
      (a, 'What is the best message to send?', 'You need a teammate to tell you whether invoices should be saved as PDF or Excel. You open the team chat.', null, '["\"URGENT!!! reply asap\"","\"Are you there?\"","\"Hi\" and wait for a reply before asking","\"Hi Mia, quick question: should the invoices be saved as PDF or Excel? I am sending them at 2 PM.\""]'::jsonb, 3, 'Including the full question and deadline in one message lets the other person reply immediately.', 3),
      (a, 'Which is a clearer alternative to "Kindly do the needful"?', null, null, '["\"Do the needful kindly.\"","\"Could you please review and approve this?\"","\"Please be informed.\"","\"Please revert asap.\""]'::jsonb, 1, 'Simple, specific requests are easier for international clients to understand than unclear expressions.', 4),
      (a, 'What should you do?', 'During a call, a customer gives you their phone number and you need to check it in the system, which will take about a minute.', null, '["Tell them to call back later","Place them on hold immediately without saying anything","Repeat the number to confirm it, then ask if you may place them on hold for about one minute","Stay silent while you search so they do not get bored"]'::jsonb, 2, 'Confirming details and asking permission before placing someone on hold is respectful and prevents errors.', 5),
      (a, 'What is paraphrasing in active listening?', null, null, '["Changing the topic to something easier","Interrupting to share your own opinion","Writing down every word the speaker says","Repeating the main idea in your own words to confirm understanding"]'::jsonb, 3, 'Paraphrasing confirms you understood correctly and gives the speaker a chance to correct you.', 6),
      (a, 'Which response best follows the LEAP approach?', 'A customer writes: "I have emailed three times and nobody has answered. Your service is terrible."', null, '["\"I am sorry your emails were not answered, and I understand how frustrating that is. I have attached your invoice and noted your account for faster help.\"","\"Our team is very busy. Please wait for your turn.\"","\"That is not true, we always reply within a week.\"","\"Please calm down and stop using that tone.\""]'::jsonb, 0, 'This reply listens, empathizes, apologizes, and proposes a solution right away.', 7),
      (a, 'Which sentence uses positive customer service language?', null, null, '["\"That''s not my department.\"","\"You should have read the policy.\"","\"I can''t do anything without your receipt.\"","\"I will be happy to process your refund as soon as I receive your receipt.\""]'::jsonb, 3, 'Positive language focuses on what you can do for the customer rather than what you cannot.', 8),
      (a, 'What is the most professional response?', 'Your client sends a new urgent request while you are finishing a report due at 3 PM. You cannot do both on time.', null, '["Promise both will be done on time and hope for the best","Quietly stop the report and start the new task","Ignore the new request until tomorrow","Ask the client which task should come first, explaining the 3 PM report deadline"]'::jsonb, 3, 'Asking the client to choose between conflicting priorities manages expectations honestly.', 9),
      (a, 'When should you move a conversation from chat to email?', null, null, '["When you need a formal record or are sharing detailed information with people outside the team","When you need a quick yes or no answer from a teammate","Whenever you want to say good morning","Never, because chat is always better"]'::jsonb, 0, 'Email is best for formal records, detailed information, and communication outside the immediate team.', 10);
  end if;
end $seed$;

do $seed$
declare c uuid; a uuid;
begin
  if not exists (select 1 from public.lava_courses where slug = 'insurance-101') then
    insert into public.lava_courses (slug, title, summary, status, sort_order)
      values ('insurance-101', 'Insurance 101', 'A beginner-friendly introduction to US property and casualty insurance: how insurance works, the parts of a policy, home, auto, and commercial coverages, the policy life cycle, and common documents.', 'published', 3) returning id into c;
    insert into public.lava_lessons (course_id, title, body, minutes, sort_order) values
      (c, 'What Is Insurance?', 'Insurance is something almost everyone uses, but few people stop to think about how it works. In this lesson you will learn the basic idea behind insurance and the key words you will hear every day when you support an insurance agency.

## The basic idea

Insurance is a promise. A person or business pays a small, known amount of money to an insurance company. In return, the insurance company promises to pay for certain large, unexpected losses if they happen. The small amount the customer pays is called the **premium**. The person or business that buys the insurance is called the **insured** or the **policyholder**.

Think of it this way: no one knows if their house will catch fire this year. Most houses will not. But if one does, the cost can be huge. Insurance lets many people share that risk. Each person pays a premium, and the money from the whole group is used to pay the few people who actually have a loss.

## Key words to know

- **Risk**: the chance that something bad will happen and cause a financial loss.
- **Loss**: damage or harm that costs money, such as a car accident or a stolen laptop.
- **Premium**: the price the customer pays for insurance, usually monthly, every six months, or yearly.
- **Claim**: a request from the insured to the insurance company to pay for a covered loss.
- **Deductible**: the amount the insured pays out of their own pocket before the insurance company pays the rest. For example, with a $500 deductible and a $3,000 covered loss, the insurance company pays $2,500.
- **Limit**: the most the insurance company will pay for a covered loss.
- **Coverage**: the protection the policy gives for specific types of losses.

## Pooling and transferring risk

Insurance works through two simple ideas. The first is **pooling**: many people put money into one shared pool. The second is **risk transfer**: the customer moves the financial burden of a big loss from themselves to the insurance company. The customer accepts a small, certain cost (the premium) to avoid a large, uncertain cost (the loss).

> Tip: When a customer asks "Why do I pay every month if nothing happened?", the answer is that they are paying for protection and peace of mind, not only for claims.

## What insurance does not do

Insurance does not prevent bad things from happening. It also does not pay for everything. Each policy covers only certain events, called **covered perils** (a peril is a cause of loss, such as fire, theft, or wind). Normal wear and tear, like an old roof slowly getting weaker, is usually not covered. Insurance is meant for sudden, accidental losses, not for regular maintenance.

## Practice exercise

A customer has a car insurance policy with a $1,000 deductible and a collision limit up to the car''s value. They have an accident that causes $4,200 of covered damage. Using the key words from this lesson, explain how much the customer pays and how much the insurance company pays.

### Suggested answer

The customer pays the $1,000 deductible. The insurance company pays the remaining $3,200, because the loss is covered and is within the limit. The customer starts this process by filing a claim.

## Key takeaways

- Insurance is a promise to pay for certain losses in exchange for a premium.
- Many people share risk through pooling, and each customer transfers risk to the insurance company.
- The deductible is paid by the insured first; the limit is the most the insurer will pay.
- Insurance covers sudden, accidental losses from covered perils, not normal wear and tear.', 8, 1),
      (c, 'Why People Need Insurance', 'Now that you know what insurance is, let us look at why people and businesses buy it. Understanding the "why" will help you speak with customers in a helpful and patient way.

## Protecting against large financial losses

Most families cannot easily pay for a house that burns down or a serious car accident. A single event could wipe out years of savings. Insurance protects people from these large, sudden costs. Instead of facing a loss of tens of thousands of dollars, the customer pays a predictable premium and a deductible.

## Protecting against lawsuits

In the United States, people can be sued if they cause injury or damage to someone else. For example, if a visitor slips on an icy sidewalk at a home, the visitor might ask the homeowner to pay for medical bills. This is called **liability**, which means legal responsibility for harm caused to others. Liability coverage helps pay for the injured person''s costs and for legal defense. Lawsuits can be very expensive, so liability coverage is one of the most important reasons people buy insurance.

## Required by law or by contract

Sometimes insurance is not optional:

- **Required by law**: Most US states require drivers to carry a minimum amount of auto liability insurance. Many states also require businesses with employees to carry workers'' compensation insurance. The exact rules vary by state.
- **Required by a lender**: When someone has a mortgage (a loan to buy a home), the lender usually requires home insurance to protect the house, because the house is security for the loan.
- **Required by a contract**: A business may need to show proof of insurance before it can sign a lease or work for a client.

## Peace of mind and stability

Insurance helps people sleep better. A business owner can focus on growing the business instead of worrying about a fire or a lawsuit. A family knows they will have a place to stay if their home is damaged. Insurance also helps the wider economy, because businesses can recover after a loss and keep paying employees.

> Tip: Customers often feel stressed when they call about insurance, especially after a loss. Stay calm, listen carefully, and show empathy. You are often the first friendly voice they hear.

## Practice exercise

Read the three situations below. For each one, write the main reason the person needs insurance: large financial loss, liability, or a legal or contract requirement.

1. Maria just bought a home with a bank loan.
2. A bakery owner worries a customer might get sick from her food.
3. Daniel''s house is fully paid off, but he worries about a storm destroying it.

### Suggested answer

1. Maria needs insurance mainly because her lender requires it (contract requirement), and also to protect against large losses.
2. The bakery owner needs liability protection in case a customer is harmed.
3. Daniel needs insurance to protect against a large financial loss to his home.

## Key takeaways

- Insurance protects people and businesses from large, unexpected costs.
- Liability coverage protects against the cost of harm caused to others, including lawsuits.
- Insurance may be required by state law, by a lender, or by a contract; rules vary by state.
- Insurance gives peace of mind and helps people recover after a loss.', 7, 2),
      (c, 'What Is an Insurance Policy?', 'An insurance policy is the written contract between the insurance company and the insured. It explains exactly what is covered, what is not covered, and what each side must do. As a VA, you will see policies every day, so it helps to know their main parts.

## The main parts of a policy

Most property and casualty policies are organized into the same basic sections. Once you learn them, any policy becomes much easier to read.

### Declarations

The **declarations page**, often called the "dec page," is usually the first page. It is a summary of the policy. It shows the insured''s name and address, the policy number, the policy period (effective and expiration dates), the insurance company, the coverages and limits, the deductibles, and the premium. This is the page you will look at most often.

### Insuring agreement

The **insuring agreement** is the main promise of the policy. It says what the insurance company agrees to pay for, such as "direct physical loss to the property described." It sets the overall scope of coverage.

### Definitions

Many policies include a **definitions** section. Words like "you," "insured," "bodily injury," or "occupying" have specific meanings in the policy. These definitions matter because they decide who and what is covered.

### Conditions

The **conditions** are the rules both sides must follow. For example, the insured must report a loss promptly, cooperate with the claim investigation, and protect property from further damage. Conditions also explain how the policy can be cancelled.

### Exclusions

The **exclusions** list what the policy does not cover. Common examples in home policies are flood, earthquake, and normal wear and tear. Exclusions are very important because customers are often surprised to learn something is not covered.

### Endorsements

An **endorsement** is a written change to the policy. It can add coverage, remove coverage, or change details like an address, a vehicle, or a driver. Endorsements are attached to the policy and become part of the contract. In some places you will also hear the word "rider," which means something similar.

> Tip: When someone asks "Am I covered for this?", the full answer depends on the insuring agreement, definitions, exclusions, conditions, and endorsements together. That is why only licensed staff should answer coverage questions.

## Policy period

Most personal policies last six months or one year. The **effective date** is when coverage starts. The **expiration date** is when it ends. Before the expiration date, the policy may be renewed for a new period.

## Practice exercise

Match each item to the policy section where you would most likely find it:

1. The yearly premium and the insured''s address
2. "We do not cover loss caused by flood"
3. A change that adds a newly purchased car
4. "You must notify us promptly of any loss"

### Suggested answer

1. Declarations page
2. Exclusions
3. Endorsement
4. Conditions

## Key takeaways

- A policy is a contract between the insurance company and the insured.
- The declarations page summarizes who, what, when, how much, and the premium.
- The insuring agreement is the main promise; exclusions limit it; conditions set the rules.
- Endorsements change a policy after it is written and become part of the contract.', 10, 3),
      (c, 'Insurance Companies and Agencies', 'Customers often say "my insurance company" when they really mean their agency. In the insurance world these are two different things. This lesson explains the difference between carriers and agencies, and the two main types of agencies.

## Insurance companies (carriers)

An **insurance company** is the business that actually provides the coverage and pays the claims. In the industry it is commonly called a **carrier** or an **insurer**, because it "carries" the risk. The carrier:

- Writes the policy contract
- Decides whether to accept a risk, a process called **underwriting**
- Sets the price (premium) based on its rating rules
- Handles and pays claims
- Must be licensed and regulated in each state where it does business

## Insurance agencies

An **insurance agency** is a business that sells and services insurance policies on behalf of carriers. The agency is the customer''s main point of contact. Agencies help customers get quotes, choose coverage, make changes, and understand their policies. Agencies are usually paid a **commission**, which is a percentage of the premium, by the carrier.

Many VAs support agencies. You may help with quotes, customer service requests, document handling, and data entry, always under the direction of licensed staff.

## Independent vs captive agencies

### Independent agencies

An **independent agency** has contracts with many different carriers. It can shop a customer''s insurance with several companies and compare prices and coverage. If one carrier raises its price, the agency may be able to move the customer to another carrier. Independent agencies often handle many different systems and carrier websites.

### Captive agencies

A **captive agency** (also called an exclusive agency) sells insurance for only one carrier, or one carrier group. The agent may offer many products, but all from that one company. Captive agents usually use the carrier''s own systems.

> Tip: Always know which carrier wrote a policy before helping with a request. Each carrier has its own rules, forms, and processes.

## Other names you may hear

- **MGA (managing general agent)**: a specialized business that has authority from carriers to handle certain tasks, often for hard-to-place risks.
- **Wholesaler**: a business that helps retail agencies place unusual risks with specialty carriers.
- **Excess and surplus (E&S) lines**: specialty carriers for risks that standard carriers will not accept.

## Practice exercise

A customer calls and says: "My agent got me three quotes from three different companies and I picked the cheapest one." Is this agency most likely independent or captive? Who is the carrier in this situation?

### Suggested answer

The agency is most likely independent, because it compared quotes from several companies. The carrier is the insurance company the customer chose, which provides the coverage and pays claims. The agency services the policy.

## Key takeaways

- The carrier (insurer) provides coverage, underwrites, and pays claims.
- The agency sells and services policies and is the customer''s main contact.
- Independent agencies work with many carriers; captive agencies work with one.
- Each carrier has its own rules, so always confirm the carrier on a policy.', 8, 4),
      (c, 'Insurance Agents and Brokers', 'Inside an agency, different people have different roles. Some are licensed to sell and give advice; others, including VAs, support them. This lesson explains agents, brokers, and where you fit in.

## What is an insurance agent?

An **insurance agent** is a licensed person who sells insurance on behalf of one or more carriers. Legally, the agent represents the carrier. In the US, agents must hold a state license for each line of insurance they sell, such as a property and casualty license. Licensing rules are set by each state, so requirements vary.

Agents may have authority to **bind** coverage. To bind means to make coverage active, often before the formal policy is printed. Binding authority is given by the carrier and has limits.

## What is a broker?

A **broker** is also licensed, but legally represents the customer rather than the carrier. A broker shops the market to find the right coverage for the client. In everyday speech, many people use "agent" and "broker" as if they mean the same thing. The legal difference depends on state law and the contracts involved.

## Other agency roles

- **Producer**: a general term for a licensed person who sells new business and brings in customers.
- **Account manager (AM)**: handles existing customers, policy changes, and renewals. Many AMs are licensed.
- **Customer service representative (CSR)**: answers calls and service requests. In many states, a CSR who discusses coverage must also be licensed.
- **Virtual assistant (VA)**: supports the team remotely with administrative and data tasks.

## The VA''s role and its limits

This is one of the most important points in this whole course.

> Only licensed professionals may give coverage advice or bind coverage. As a VA, you support licensed staff. You do not decide coverage, recommend limits, or promise that a loss is covered.

What a VA typically can do (as directed by the agency):

- Enter data into the agency system
- Prepare quote information for a licensed person to review
- Request documents such as ID cards or certificates using agency procedures
- Attach and file documents
- Schedule follow-ups and update notes
- Take messages and pass coverage questions to licensed staff

If a customer asks "Should I add more coverage?" or "Will this be covered?", a good answer is: "That is a great question. Let me have one of our licensed agents contact you so they can explain your options."

## Practice exercise

Decide whether each task is appropriate for a VA or should go to licensed staff:

1. Updating a customer''s mailing address in the system as directed
2. Telling a customer their water damage will be covered
3. Attaching a signed application to the correct policy
4. Advising a customer to lower their liability limits to save money

### Suggested answer

1. VA task (following agency procedure)
2. Licensed staff only; this is coverage advice
3. VA task
4. Licensed staff only; this is coverage advice

## Key takeaways

- Agents are licensed and usually represent the carrier; brokers usually represent the customer.
- Licensing rules vary by state.
- Binding coverage and giving coverage advice are for licensed staff only.
- VAs support licensed staff with data, documents, and follow-ups, and pass coverage questions along.', 7, 5),
      (c, 'Personal Lines Overview', 'Insurance agencies usually organize their work into two big groups: personal lines and commercial lines. This lesson introduces personal lines, which is where many new VAs begin.

## What are personal lines?

**Personal lines** are insurance products bought by individuals and families to protect their personal property and personal liability. A **line of business** (often shortened to LOB) is a category of insurance, such as auto or home.

The most common personal lines are:

- **Personal auto**: covers cars, trucks, and vans owned by individuals.
- **Homeowners**: covers a house the insured owns and lives in, plus belongings and liability.
- **Renters (tenant)**: covers the belongings and liability of someone who rents.
- **Condo**: covers a condominium unit owner''s interior, belongings, and liability.
- **Dwelling fire**: often used for homes that are rented out to others (landlord policies).
- **Umbrella**: extra liability protection above the limits of auto and home policies.
- **Recreational vehicles**: motorcycles, boats, RVs, and similar.
- **Flood**: flood is usually excluded from home policies, so it is often bought as a separate policy.

## How personal lines work day to day

Personal lines usually involve many customers with smaller, similar policies. Carriers often use standard forms and online rating systems. Common service tasks include:

- Adding or removing vehicles and drivers
- Updating addresses and mortgage company information
- Sending ID cards and proof of insurance
- Processing renewals and answering billing questions
- Reviewing policies when the premium increases

## Bundling

Many customers keep their home and auto with the same carrier. This is called **bundling** or a **multi-policy** account. Carriers often give a discount for bundling. When a customer has several policies, always check that a change to one policy (like a new address) is also made to the others when appropriate and when the agency''s process says so.

> Tip: Personal lines customers are everyday people, not insurance experts. Use simple words, avoid jargon, and confirm you understood their request before acting.

## Practice exercise

A customer named Grace Lim rents an apartment, owns one car, and recently bought a small fishing boat. Which personal lines products might she have? Which product would NOT fit her situation: homeowners or renters?

### Suggested answer

Grace might have a renters policy, a personal auto policy, and a boat (watercraft) policy. She might also consider an umbrella policy, but only a licensed agent should advise her on that. Homeowners would not fit, because she rents and does not own the home.

## Key takeaways

- Personal lines protect individuals and families.
- Common personal lines include auto, homeowners, renters, condo, dwelling fire, umbrella, and flood.
- Service work often involves vehicle changes, ID cards, mortgagee updates, and renewals.
- Bundled accounts may need matching updates across several policies.', 7, 6),
      (c, 'Home Insurance Basics', 'Home insurance is one of the most common products in a personal lines agency. In this lesson you will learn the standard coverage parts of a homeowners policy and the most common policy forms.

## The coverage parts

Most US homeowners policies use a structure with lettered coverages. Many carriers follow forms similar to those created by an industry organization called ISO (Insurance Services Office), though each carrier''s wording can differ.

### Section I: Property coverages

- **Coverage A, Dwelling**: the house itself and structures attached to it, such as an attached garage.
- **Coverage B, Other Structures**: structures not attached to the house, such as a detached garage, a fence, or a shed. This limit is often a percentage of Coverage A.
- **Coverage C, Personal Property**: the insured''s belongings, such as furniture, clothes, and electronics. Some valuable items, like jewelry, may have lower limits unless extra coverage is added by endorsement.
- **Coverage D, Loss of Use**: extra living costs, such as hotel and meals, if the home cannot be lived in after a covered loss.

### Section II: Liability coverages

- **Coverage E, Personal Liability**: pays if the insured is legally responsible for injury to others or damage to their property, including legal defense.
- **Coverage F, Medical Payments to Others**: pays small medical bills for guests injured on the property, regardless of fault.

## Common HO forms

Homeowners policies come in different "forms." The form decides which perils are covered and who the policy is designed for.

- **HO-3 (Special Form)**: the most common policy for owner-occupied homes. The dwelling is usually covered on an "open perils" basis (everything is covered unless excluded), while personal property is covered for named perils.
- **HO-5 (Comprehensive Form)**: broader than HO-3; personal property is also usually covered on an open perils basis.
- **HO-4 (Contents Broad Form)**: for renters. Covers personal property and liability, not the building.
- **HO-6 (Unit-Owners Form)**: for condo owners. Covers the interior of the unit, personal property, and liability.
- **HO-2 (Broad Form)** and **HO-8 (Modified Coverage Form)**: less common forms with more limited coverage.

Forms and names can vary by carrier and state. Always check the actual policy.

## Common exclusions

Flood and earthquake are commonly excluded and are often covered by separate policies or endorsements. Wear and tear, maintenance problems, and intentional damage are usually excluded too.

## The mortgagee

If the home has a loan, the lender is listed on the policy as the **mortgagee**. The mortgagee is often paid together with the insured on property claims. Many homeowners pay their premium through an **escrow** account managed by the lender.

> Tip: Mortgagee and loan number updates are common requests. A small typo can delay a home sale or cause billing problems, so double-check every detail.

## Practice exercise

Which coverage part would most likely respond in each case?

1. A storm knocks down the customer''s backyard fence.
2. The family stays in a hotel for two weeks after a kitchen fire.
3. A delivery driver trips on the front steps and needs minor first aid.

### Suggested answer

1. Coverage B, Other Structures
2. Coverage D, Loss of Use
3. Coverage F, Medical Payments to Others (or Coverage E if the person makes a larger liability claim)

Remember, a licensed staff member or the carrier makes the final coverage decision.

## Key takeaways

- Section I covers property: dwelling, other structures, personal property, loss of use.
- Section II covers liability and medical payments to others.
- HO-3 is the most common homeowners form; HO-4 is for renters; HO-6 is for condo owners.
- Flood and earthquake are commonly excluded; forms vary by carrier and state.', 10, 7),
      (c, 'Auto Insurance Basics', 'Personal auto insurance is the most common policy in many agencies, and auto requests come in every day. This lesson explains the main coverages on a personal auto policy in simple terms.

## Liability coverage

**Liability** pays for injury or damage the insured driver causes to other people. It does not pay for the insured''s own car. It has two parts:

- **Bodily injury liability (BI)**: pays for other people''s injuries, such as medical bills and lost wages.
- **Property damage liability (PD)**: pays for damage to other people''s property, like their car or a fence.

Limits are often written as three numbers, such as **50/100/25**. This means up to $50,000 for injuries to one person, up to $100,000 for all injuries in one accident, and up to $25,000 for property damage. Most states have a minimum required liability limit, and the minimums vary by state.

## Physical damage coverage

These coverages pay for damage to the insured''s own vehicle. Lenders usually require them if the car has a loan or lease.

- **Collision**: pays for damage when the car hits another vehicle or object, or rolls over, no matter who is at fault.
- **Comprehensive** (also called "other than collision"): pays for damage from things like theft, fire, hail, flood, vandalism, falling objects, and hitting an animal such as a deer.

Both collision and comprehensive usually have a deductible.

## Protection for you and your passengers

- **Uninsured motorist (UM)**: pays for the insured''s injuries (and in some states, property damage) when the at-fault driver has no insurance.
- **Underinsured motorist (UIM)**: pays when the at-fault driver has insurance, but not enough to cover the insured''s costs.
- **Medical payments (Med Pay)**: pays medical bills for the driver and passengers after an accident, regardless of fault, up to a small limit.
- **Personal injury protection (PIP)**: a broader coverage required in some states (often called "no-fault" states). It may pay medical bills, lost wages, and other costs regardless of fault.

Whether UM/UIM, Med Pay, or PIP is required or available depends on the state.

## Optional coverages

Common add-ons include **rental reimbursement** (pays for a rental car while the insured car is being repaired) and **towing and roadside assistance**.

## Drivers and vehicles

An auto policy lists **rated drivers** (people in the household who drive) and **scheduled vehicles** (each car with its VIN, the 17-character vehicle identification number). Adding a new car or a new teen driver is a common endorsement. Some carriers allow a short grace period for newly purchased cars, but the rules vary, so new vehicles should be reported quickly.

> Tip: A VIN has 17 characters and never uses the letters I, O, or Q. Checking this helps you catch typing mistakes.

## Practice exercise

Match the situation to the coverage most likely to apply:

1. Hail damages the customer''s car in a parking lot.
2. The customer backs into a pole.
3. The customer is hit by a driver who has no insurance and is injured.
4. The customer causes an accident and damages another person''s car.

### Suggested answer

1. Comprehensive
2. Collision
3. Uninsured motorist (UM)
4. Property damage liability

## Key takeaways

- Liability (BI and PD) pays for harm the insured causes to others.
- Collision and comprehensive pay for damage to the insured''s own car.
- UM/UIM, Med Pay, and PIP protect the insured and passengers; availability varies by state.
- Policies list drivers and vehicles; always enter VINs carefully.', 10, 8),
      (c, 'Introduction to Commercial Insurance', '**Commercial lines** are insurance products for businesses. They protect a company''s property, its employees, and its legal responsibilities. Commercial policies are usually more complex than personal policies. This lesson gives you a beginner''s overview of the most common types.

## General liability (GL)

**Commercial general liability**, often called GL or CGL, protects a business if it causes bodily injury or property damage to others, for example a customer slipping in a store. It can also cover certain advertising injury claims. Many clients and landlords require a business to carry GL before they will work with it.

## Commercial property

**Commercial property** insurance covers the business''s buildings and business personal property, such as equipment, furniture, inventory, and supplies. It may also include **business income** coverage, which helps replace lost income if the business must close temporarily after a covered loss.

## Business owners policy (BOP)

A **BOP** combines general liability and commercial property into one package, usually for small to medium-sized businesses with lower risk, such as offices, small shops, or restaurants. BOPs are often simpler and less expensive than buying the coverages separately. Eligibility rules depend on the carrier.

## Workers'' compensation

**Workers'' compensation** (often called "work comp" or WC) pays medical bills and part of lost wages for employees who are injured or become sick because of their job. Most states require employers to carry it, but the rules (for example, the number of employees that triggers the requirement) vary by state. Workers'' comp premium is usually based on payroll and the type of work employees do, using **class codes**.

## Commercial auto

**Commercial auto** insures vehicles used for business, such as delivery vans, service trucks, and company cars. It includes liability and can include physical damage. Personal auto policies often exclude business use, so a business usually needs commercial auto.

## Professional liability

**Professional liability**, also called **errors and omissions (E&O)**, protects businesses that give advice or professional services, like accountants, consultants, or real estate agents. It covers claims that the professional made a mistake or failed to do something that caused a client a financial loss. Insurance agencies themselves usually carry E&O coverage.

## Other commercial coverages you may hear about

- **Commercial umbrella or excess liability**: extra limits above GL, auto, and employer''s liability.
- **Cyber liability**: covers data breaches and cyber attacks.
- **Inland marine**: covers property that moves, such as contractor tools and equipment.

> Tip: Commercial accounts often have many requests for certificates of insurance (COIs). Accuracy matters, because the certificate holder relies on it as proof of coverage.

## Practice exercise

A small landscaping company has five employees, two pickup trucks, and expensive lawn equipment that travels to job sites. List at least three types of commercial insurance this business might have.

### Suggested answer

Workers'' compensation for the employees, commercial auto for the trucks, general liability for damage or injuries at job sites, and inland marine (contractor''s equipment) for the mobile equipment. A licensed agent would decide the final recommendations.

## Key takeaways

- Commercial lines protect businesses, their property, employees, and liability.
- GL covers injury and damage to others; commercial property covers buildings and contents.
- A BOP packages GL and property for smaller businesses.
- Workers'' comp, commercial auto, and professional liability (E&O) are other core commercial coverages; requirements vary by state.', 9, 9),
      (c, 'The Basic Insurance Workflow', 'Every policy goes through a life cycle, from the first quote to renewal year after year. Knowing this workflow helps you understand where each task you do fits in the bigger picture.

## The policy life cycle

1. **Quote**: The agency gathers information about the customer and the risk (drivers, vehicles, home details, business details) and gets a price from one or more carriers.
2. **Bind**: The customer accepts the quote and a licensed person with authority binds the coverage, making it active. A down payment and signed application are often required.
3. **Issue**: The carrier processes the policy and issues the official policy documents, such as the declarations page and policy forms.
4. **Service and endorse**: During the policy period, the customer may need changes, such as adding a vehicle or updating an address. These are processed as endorsements, and the agency handles other service tasks like billing questions and proof of insurance.
5. **Renew**: Before the expiration date, the carrier offers a renewal for a new policy period. The agency may review the renewal, especially if the premium increased, and may remarket (shop) the policy with other carriers.

## Where the VA helps

- **Quote stage**: entering customer data, collecting missing information, preparing comparison sheets for a licensed agent.
- **Bind stage**: preparing applications for signature, sending forms, tracking down payments as directed.
- **Issue stage**: checking that issued documents match what was quoted, attaching documents to the system.
- **Service stage**: logging requests, submitting change requests per agency procedures, sending ID cards.
- **Renewal stage**: running renewal lists, flagging large premium increases, preparing remarketing information.

## Claims overview

A **claim** happens when a customer has a loss and asks the carrier to pay. The basic steps are:

1. The customer reports the loss (this is called the **first notice of loss**, or FNOL) to the carrier or the agency.
2. The carrier assigns a **claims adjuster**, a person who investigates the loss.
3. The adjuster reviews the policy, inspects the damage, and decides what is covered.
4. The carrier pays the covered amount, minus the deductible, or explains why it is not covered.

The carrier, not the agency, makes the final claim decision. The agency often helps the customer report the claim and follows up on its status.

> Tip: When a customer reports a loss, never say "Don''t worry, you''re covered." Collect the details, follow agency procedures, and let the carrier and licensed staff handle coverage questions.

## Cancellations and non-renewals

Sometimes a policy ends early. A **cancellation** ends the policy before the expiration date, for example because of non-payment or at the customer''s request. A **non-renewal** means the carrier or customer chooses not to continue the policy at the end of its term. Notice rules vary by state.

## Practice exercise

Put these events in the correct order for one customer: the customer adds a new car; the customer accepts the quote and coverage starts; the agency gets prices from three carriers; the carrier sends the renewal offer; the carrier sends the official policy documents.

### Suggested answer

1. The agency gets prices from three carriers (quote).
2. The customer accepts and coverage starts (bind).
3. The carrier sends the official documents (issue).
4. The customer adds a new car (service/endorse).
5. The carrier sends the renewal offer (renew).

## Key takeaways

- The policy life cycle is quote, bind, issue, service/endorse, and renew.
- VAs support every stage with data entry, documents, and follow-ups.
- Claims start with first notice of loss; the carrier''s adjuster decides coverage.
- Cancellations end a policy early; non-renewals end it at expiration.', 10, 10),
      (c, 'Common Insurance Documents', 'Insurance runs on documents. As a VA, you will request, check, name, and file them all day. This lesson introduces the documents you will see most often and what each one is for.

## Documents at the start of a policy

- **Application**: the form with the customer''s information and answers to underwriting questions. The customer usually signs it. The carrier relies on these answers, so accuracy is important.
- **Binder**: a temporary proof that coverage is in effect, used until the policy is issued. A binder has an effective date and usually an end date.
- **Declarations page**: the summary of the policy showing the insured, policy number, policy period, coverages, limits, deductibles, and premium.
- **Policy jacket and forms**: the full policy contract. The **policy jacket** is the cover or outer section that holds the policy forms together, often with general conditions. Together with the dec page and endorsements, it makes up the complete policy.

## Proof of insurance documents

- **ID cards**: auto insurance identification cards showing the insured, policy number, policy dates, and vehicles. Drivers keep them in the car or on their phone as proof of insurance.
- **Certificate of insurance (COI)**: a document, common in commercial lines, that shows a third party (the **certificate holder**) what coverage a business has. A COI is for information only; it does not change the policy. If a certificate holder needs to be an **additional insured**, that usually requires an endorsement on the policy itself.
- **Evidence of property insurance**: similar proof for lenders on property, often requested during home or building purchases.

## Documents during the policy

- **Endorsements**: documents showing a change to the policy, with the effective date of the change and any premium change.
- **Billing statements and invoices**: show amounts due and payment dates.
- **Cancellation notice**: tells the insured that the policy will end on a certain date, for example for non-payment. These are time-sensitive.
- **Non-renewal notice**: tells the insured that the carrier will not renew the policy at expiration. Required notice periods vary by state.
- **Renewal offer**: the new terms and premium for the next policy period.

## Claims and history documents

- **Loss runs**: a report from a carrier listing the claims history on a policy over a period of time (often three to five years). Agencies request loss runs when shopping a policy with a new carrier, especially for commercial accounts.
- **Claim forms and adjuster letters**: documents related to a specific claim.

> Tip: Cancellation and non-renewal notices are urgent. If you see one, follow your agency''s procedure right away so a licensed person can act before the deadline.

## Practice exercise

For each request, name the document the customer most likely needs:

1. "The police officer asked me for proof of insurance for my car."
2. "My client won''t let me start the job until they see my liability coverage."
3. "The new carrier wants to see my claims for the last five years."
4. "I just bought the policy today, and my lender needs proof before the policy is printed."

### Suggested answer

1. Auto ID card
2. Certificate of insurance (COI)
3. Loss runs
4. Binder (or evidence of insurance, depending on the lender''s request)

## Key takeaways

- The application, binder, declarations page, and policy jacket and forms are core policy documents.
- ID cards and COIs prove coverage; a COI does not change the policy.
- Cancellation and non-renewal notices are time-sensitive.
- Loss runs show claims history and are used when shopping coverage.', 10, 11);
  else
    select id into c from public.lava_courses where slug = 'insurance-101';
  end if;
  if not exists (select 1 from public.lava_assessments where slug = 'insurance-101-quiz') then
    insert into public.lava_assessments (slug, course_id, kind, title, description, pass_percent, status, sort_order)
      values ('insurance-101-quiz', c, 'quiz', 'Insurance 101 Quiz', 'Check your understanding of basic insurance concepts, coverages, workflow, and documents.', 70, 'published', 3) returning id into a;
    insert into public.lava_questions (assessment_id, prompt, scenario, context, options, answer, explanation, sort_order) values
      (a, 'What is a premium?', null, null, '["The most the insurer will pay for a covered loss","A request for payment after a loss","The price the customer pays for insurance coverage","The amount the insured pays before the insurer pays a claim"]'::jsonb, 2, 'The premium is the price of the insurance. The deductible is paid before the insurer pays, and the limit is the maximum payment.', 1),
      (a, 'How much would the insurance company normally pay?', 'A customer has a homeowners policy with a $1,000 deductible. A covered windstorm causes $6,000 of damage to the roof.', null, '["$7,000","$6,000","$5,000","$1,000"]'::jsonb, 2, 'The insured pays the $1,000 deductible first, so the insurer pays the remaining $5,000 of the covered loss.', 2),
      (a, 'Which part of a policy lists what the policy does NOT cover?', null, null, '["Conditions","Insuring agreement","Declarations","Exclusions"]'::jsonb, 3, 'Exclusions list losses or situations the policy does not cover, such as flood on most home policies.', 3),
      (a, 'What type of agency is this most likely?', 'An agency gets quotes for a customer from four different insurance companies and helps the customer choose one.', null, '["An insurance carrier","A captive agency","A claims adjusting firm","An independent agency"]'::jsonb, 3, 'Independent agencies have contracts with many carriers and can compare quotes. Captive agencies represent only one carrier.', 4),
      (a, 'What is the best response for a VA?', 'While you are taking a message, a customer asks you: "If my basement floods, will my policy pay for it?"', null, '["Explain that a licensed agent will contact them to answer the coverage question, and pass the message along","Tell the customer it is covered so they feel better","Tell the customer flood is never covered","Read the exclusions page and give your opinion"]'::jsonb, 0, 'Only licensed professionals may give coverage advice. VAs support licensed staff by passing coverage questions to them.', 5),
      (a, 'On a homeowners policy, which coverage pays for a detached garage or a fence?', null, null, '["Coverage B, Other Structures","Coverage D, Loss of Use","Coverage C, Personal Property","Coverage A, Dwelling"]'::jsonb, 0, 'Coverage B covers structures not attached to the house, such as fences, sheds, and detached garages.', 6),
      (a, 'Which auto coverage usually applies to hitting an animal?', 'A customer calls to report that a deer ran into the road and hit their car, damaging the front bumper.', null, '["Uninsured motorist","Comprehensive","Property damage liability","Collision"]'::jsonb, 1, 'Hitting an animal is usually covered under comprehensive (other than collision), not collision.', 7),
      (a, 'Which commercial policy commonly combines general liability and commercial property for smaller businesses?', null, null, '["Workers’ compensation","Business owners policy (BOP)","Professional liability (E&O)","Commercial auto"]'::jsonb, 1, 'A BOP packages general liability and property coverage for eligible small to medium-sized businesses.', 8),
      (a, 'What is the correct order of the basic policy life cycle?', null, null, '["Quote, bind, issue, service/endorse, renew","Bind, quote, issue, renew, service","Issue, quote, bind, renew, service","Quote, issue, bind, service, renew"]'::jsonb, 0, 'A policy is quoted, then bound, then issued by the carrier, then serviced and endorsed during the term, and finally renewed.', 9),
      (a, 'Which document is typically used for this?', 'A contractor needs to show a building owner proof of his liability coverage before starting a job.', null, '["Auto ID card","Certificate of insurance (COI)","Loss runs","Non-renewal notice"]'::jsonb, 1, 'A certificate of insurance shows a third party what coverage a business has. It is for information and does not change the policy.', 10);
  end if;
end $seed$;

do $seed$
declare c uuid; a uuid;
begin
  if not exists (select 1 from public.lava_courses where slug = 'insurance-navigation-tools') then
    insert into public.lava_courses (slug, title, summary, status, sort_order)
      values ('insurance-navigation-tools', 'Insurance Navigation Tools', 'Learn how insurance agencies use management systems and CRMs, and build safe habits for searching records, reading policy information, managing documents, entering data, and tracking follow-ups.', 'published', 4) returning id into c;
    insert into public.lava_lessons (course_id, title, body, minutes, sort_order) values
      (c, 'What Is an Agency Management System (AMS)?', 'Every insurance agency needs a central place to keep track of its customers, policies, and documents. That place is usually an Agency Management System. In this lesson you will learn what an AMS is, what it is used for, and some well-known examples in the industry.

> Important: This course explains these tools in general terms only. You will not receive access to any third-party software through this course unless your administrator provides it. All exercises use made-up sample records.

## What an AMS does

An **Agency Management System (AMS)** is software that acts as the agency''s main record-keeping system. It is often called the "system of record," meaning it is the official, trusted source of information about the agency''s customers and policies. Most AMS platforms help an agency:

- Store customer records (names, addresses, phone numbers, emails)
- Store policy information (policy numbers, carriers, dates, coverages, premiums)
- Store documents such as applications, declarations pages, and endorsements
- Track activities, tasks, notes, and follow-ups
- Handle accounting tasks such as invoices, payments, and commissions
- Produce reports, such as renewal lists or lists of policies by carrier

Many AMS platforms can also receive policy information directly from carriers through electronic data feeds, often called **download**. This reduces typing, but staff still need to review the data and fix errors.

## Why the AMS matters to a VA

As a VA, much of your daily work may happen inside an AMS. You may search for customers, read policy details, attach documents, write notes, and create follow-up tasks. If information in the AMS is wrong or missing, the whole team can make mistakes, such as sending an ID card to the wrong address. Careful work in the AMS protects customers and the agency.

## Industry examples

Several AMS products are widely known in the US insurance agency market. Below is a neutral, general description of some of them. Each agency sets up its system differently, and products change over time, so always follow the training and procedures of the agency you support.

- **Applied Epic**: an agency management system from Applied Systems, used by many independent agencies for both personal and commercial lines.
- **AMS360**: an agency management system from Vertafore, also used by many independent agencies.
- **EZLynx**: a platform known in the independent agency space, especially for personal lines, which combines agency management with comparative quoting (getting prices from several carriers at once).

Some agencies, especially captive agencies, use systems provided by their carrier instead.

## The AMS and other tools

An AMS often works together with other tools, such as carrier websites (where policies are quoted and changed), comparative raters, email, phone systems, and a CRM (covered in the next lesson). The AMS is usually the place where the final, official record is kept.

## Key takeaways

- An AMS is the agency''s main system of record for customers, policies, documents, and activities.
- AMS platforms may receive policy data from carriers, but staff must still check it.
- Applied Epic, AMS360 (Vertafore), and EZLynx are well-known industry examples.
- Access to any third-party software is provided only by your administrator, not by this course.', 9, 1),
      (c, 'What Is a CRM?', 'Besides an AMS, many agencies use a CRM to manage relationships and communication with customers and prospects. This lesson explains what a CRM is and how it differs from an AMS.

## What CRM means

**CRM** stands for **Customer Relationship Management**. A CRM is software that helps a business track its interactions with people: calls, emails, texts, meetings, and marketing messages. It helps the team remember who they talked to, what was said, and what should happen next.

A CRM is often used for:

- **Leads and prospects**: a **lead** is a person who may be interested in buying; a **prospect** is a lead the agency is actively working with.
- **Sales pipelines**: a visual list of stages, such as "New lead," "Quoting," "Quote sent," and "Won" or "Lost."
- **Communication history**: a log of emails, calls, and messages with each contact.
- **Automation**: sending scheduled emails or text reminders, such as birthday messages or renewal reminders.
- **Reporting**: seeing how many leads came in and how many became customers.

## CRM vs AMS

The two tools can overlap, but they have different main purposes:

- The **AMS** focuses on the official policy and accounting record: policy numbers, coverages, premiums, documents, and commissions.
- The **CRM** focuses on relationships, sales, and communication: leads, follow-ups, marketing, and customer engagement.

Some agencies connect the two so that information flows between them. Others use only an AMS, which may have some CRM-style features built in. Always learn which system your agency treats as the main record for each type of information.

## Industry examples

- **HubSpot**: a general-purpose CRM used by many types of businesses, not only insurance. It is known for contact management, sales pipelines, and marketing tools.
- **InsuredMine**: a CRM and automation platform designed for insurance agencies. It is described as helping agencies with customer engagement and sales automation, and it can work alongside an agency''s AMS.

These are general descriptions only. Features and setups vary by agency, and you will not receive access to these tools through this course unless your administrator provides it.

> Tip: When you log a call or email in a CRM, write it so that a coworker who has never met the customer can understand it quickly.

## Practice exercise

Read each task below and decide whether it most likely belongs in the AMS or the CRM (in an agency that uses both):

1. Updating the premium amount on an issued auto policy
2. Moving a new lead named "Sample Prospect A" from "New lead" to "Quote sent"
3. Attaching a signed endorsement form to a homeowners policy
4. Setting up an automatic birthday email to customers

### Suggested answer

1. AMS (official policy record)
2. CRM (sales pipeline)
3. AMS (policy documents)
4. CRM (automation and engagement)

Note that the exact split depends on how each agency sets up its systems.

## Key takeaways

- A CRM tracks relationships, leads, sales stages, communication, and automation.
- An AMS tracks the official policy, document, and accounting record.
- HubSpot is a general CRM; InsuredMine is a CRM and automation platform built for insurance agencies.
- Each agency decides which system holds which information.', 8, 2),
      (c, 'Understanding Agency Management Workflows', 'A **workflow** is a set of steps that a team follows to complete a task the same way every time. Agencies use workflows so that work is consistent, nothing is forgotten, and anyone on the team can pick up a task. This lesson shows common agency workflows and how they appear in an agency system.

## Why workflows matter

Insurance work has many small steps and deadlines. If one step is missed, a customer might lose coverage or a document might be lost. Clear workflows help:

- Make sure every request is handled completely
- Keep a record of who did what and when (an **audit trail**)
- Allow coworkers to take over a task without confusion
- Help the agency meet carrier and state requirements

## Common agency workflows

### New business

A lead becomes a customer. The steps often include collecting information, quoting, presenting options (done by a licensed person), binding, receiving signed documents and payment, and setting up the customer and policy in the AMS.

### Policy change (endorsement)

The customer asks for a change, such as adding a vehicle. Steps often include logging the request, confirming details, submitting the change to the carrier, checking the endorsement when it arrives, attaching it, and confirming with the customer.

### Renewal

Before a policy expires, the agency reviews the renewal. Steps often include running a renewal report, checking for premium increases, remarketing when needed, contacting the customer, and recording the result.

### Certificate request

A commercial customer needs a certificate of insurance for a third party. Steps include confirming the certificate holder details, checking that the policy information is current, producing the certificate according to agency rules, sending it, and filing a copy.

### Cancellation or non-payment

When a cancellation notice arrives, the agency must act quickly. Steps include alerting the responsible staff member, contacting the customer, and recording the outcome.

## How workflows appear in a system

In most agency systems, a workflow is tracked with **activities** or **tasks**. An activity records something that happened or needs to happen, such as "Endorsement requested" or "Follow up on missing signature." Activities are often assigned to a person and given a due date. When the work is done, the activity is closed with a note.

> Tip: If your agency gives you a written procedure or checklist, follow it step by step. Do not skip steps just because a task looks simple.

## Practice exercise

A sample customer, "Alex Rivera" (a made-up record), emails asking to change his mailing address on his auto and home policies. Write the main steps you would expect in a policy change workflow.

### Suggested answer

1. Log the request as an activity in the system with the date received.
2. Confirm the new address and which policies it applies to.
3. Submit the change to the carrier for each policy, following agency procedure.
4. Update the customer record in the AMS.
5. When the carrier issues the endorsements, check them and attach them to the correct policies.
6. Confirm the change with the customer and close the activity with a clear note.

## Key takeaways

- A workflow is a repeatable set of steps for a common task.
- Common workflows include new business, policy changes, renewals, certificates, and cancellations.
- Systems track workflows with activities or tasks that have owners and due dates.
- Always follow the agency''s written procedures.', 9, 3),
      (c, 'Navigating Insurance Agency Systems', 'The first time you open an agency system, it can feel overwhelming. There are menus, tabs, buttons, and many records. The good news is that most systems are organized in similar ways. This lesson gives you a general map so you can find your way around any system you are trained on.

> Reminder: This lesson describes common patterns, not the exact screens of any specific product. Your agency will train you on its own system, and you will not receive access to third-party software through this course unless your administrator provides it.

## The common structure

Most agency systems are organized around the **customer** (also called the client, insured, or account). Under each customer you usually find:

- **Contact information**: names, addresses, phone numbers, emails
- **Policies**: each policy the customer has, often listed by line of business
- **Documents**: attachments such as applications, dec pages, and endorsements
- **Activities, tasks, and notes**: the history of work and communication
- **Billing or accounting**: invoices, payments, and balances (access may be limited)

Think of the customer record as a folder, with smaller folders inside for each policy.

## Common navigation elements

- **Home or dashboard**: the first screen after logging in. It may show your open tasks and reminders.
- **Search bar**: used to find a customer or policy quickly.
- **Menus or tabs**: used to switch between sections such as policies, documents, and activities.
- **Lists and filters**: used to narrow down long lists, such as showing only active policies.
- **Save and close buttons**: many systems require you to save before leaving a screen, or your changes may be lost.

## Good habits when navigating

- **Confirm you are in the right record.** Before making any change, check the customer''s name and at least one more detail, such as the address or policy number.
- **Open only what you need.** Avoid editing fields you were not asked to change.
- **Save your work.** Check that changes were saved before moving on.
- **Log out when finished.** Customer information is private. Never share your login with anyone.
- **Ask when unsure.** It is better to ask a question than to guess and create an error.

## Security and privacy

Agency systems contain private information such as dates of birth, driver''s license numbers, and financial details. Follow your agency''s security rules, such as using approved devices, secure passwords, and multi-factor authentication (a second login step, like a code sent to your phone). Never copy customer data into personal files or unapproved apps.

> Tip: Many errors happen because someone had two similar customer records open at the same time. Work on one record at a time.

## Key takeaways

- Most agency systems are organized around the customer, with policies, documents, and activities under each customer.
- Learn the main navigation tools: dashboard, search, tabs, filters, and save buttons.
- Always confirm you are in the correct record before making changes.
- Protect customer privacy and never share your login.', 8, 4),
      (c, 'Searching Customer Records', 'Finding the right customer record quickly and correctly is one of the most important VA skills. A wrong match can lead to sending private information to the wrong person. A missed match can lead to duplicate records. This lesson teaches safe search habits.

## Common ways to search

Most agency systems let you search by several fields:

- **Name**: the customer''s last name, first name, or business name
- **Policy number**: the unique number the carrier assigned to the policy
- **Phone number**: home, mobile, or business phone
- **Email address**
- **Address**: street or ZIP code
- **Customer or account number**: an internal number the agency system assigns

## Tips for searching by name

- Start with the **last name** only, then narrow the results.
- Try different spellings. For example, "Reyes" might be typed as "Reyez," or "Catherine" as "Katherine."
- For businesses, try the main word only, like "Sunrise" instead of "Sunrise Bakery LLC."
- Watch for nicknames, such as "Bob" for "Robert" or "Liz" for "Elizabeth."

## Tips for searching by policy number or phone

- A **policy number** is usually the most exact search, because it is unique. Type it carefully and check for extra spaces or dashes.
- Search phone numbers in the format your system uses. Some systems need digits only, without dashes or parentheses.

## Confirming the match

Never rely on the name alone. Many people share the same name. Before working on a record, confirm at least two pieces of information, such as:

- Name and date of birth
- Name and address
- Name and policy number

## Avoiding duplicate records

A **duplicate record** is a second customer record for a person or business that already exists in the system. Duplicates cause problems: documents get split between two records, and staff may miss important history.

To avoid duplicates:

1. Always search several ways (name, phone, email) before creating a new record.
2. Check for former names, such as a maiden name, and for spouses who may be listed on the same account.
3. Check for inactive or prospect records that may already exist for this person.
4. If you think you found a duplicate, do not delete or merge it yourself unless you are authorized. Report it according to agency procedure.

> Tip: When in doubt, search one more way before you create anything new.

## Practice exercise

You need to attach a document for a made-up customer named "Jordan Lee" at "45 Sample Street." Your name search returns three records: Jordan Lee at 45 Sample Street (active auto policy), Jordan Lee at 912 Example Avenue (no policies), and Jordan Leigh at 45 Sample Street (prospect). What should you do?

### Suggested answer

Choose the Jordan Lee record at 45 Sample Street only after confirming another detail, such as the policy number on the document. The Jordan Leigh record at the same address may be a duplicate with a misspelled name. Do not merge or delete it yourself; report it to your supervisor following agency procedure.

## Key takeaways

- Search by name, policy number, phone, email, or address; policy number is usually the most exact.
- Try spelling variations and nicknames when searching by name.
- Confirm at least two details before working on a record.
- Search several ways before creating a new record, and report possible duplicates instead of fixing them alone.', 9, 5),
      (c, 'Understanding Policy Information', 'Once you find the right customer, you will often need to read the details of a policy. Most agency systems show the same core policy fields. This lesson explains each one and what to watch for.

## Core policy fields

### Policy number

The **policy number** is the unique number the carrier gives the policy. It appears on the dec page, ID cards, and bills. Some carriers change the policy number at renewal, and some add a suffix such as "-01" or "-02" for each new term.

### Effective and expiration dates

The **effective date** is the date coverage starts. The **expiration date** is the date the policy period ends. Together they make up the **policy term**, which is commonly six months for personal auto and one year for homeowners and many commercial policies, but this varies by carrier.

### Carrier

The **carrier** (insurance company) that wrote the policy. Knowing the carrier tells you which website, forms, and procedures to use.

### Line of business

The **line of business (LOB)** is the type of policy, such as personal auto, homeowners, renters, umbrella, general liability, or workers'' compensation. Systems often use short codes for these, and the codes vary by system.

### Premium

The **premium** is the cost of the policy for the term. Systems may show the **written premium** (total for the full term) and sometimes changes caused by endorsements. Be careful not to confuse the full-term premium with a monthly installment amount.

### Status

The **status** shows the current state of the policy. Common statuses include:

- **Active or in force**: coverage is currently in effect
- **Pending**: not yet in effect, for example a future-dated renewal or new policy
- **Cancelled**: ended before the expiration date
- **Expired**: the term ended and it was not renewed
- **Non-renewed**: the carrier or customer chose not to continue
- **Quote or prospect**: priced but not purchased

Status names vary by system.

## Other details you may see

- **Named insured** and additional named insureds
- **Agent or producer** and **account manager** assigned to the policy
- **Billing method**, such as direct bill (the carrier bills the customer) or agency bill (the agency bills the customer)
- **Mortgagee, lienholder, or additional interests**

> Tip: When the system information does not match the latest dec page from the carrier, do not guess which is correct. Report the difference to licensed staff.

## Practice exercise

A sample policy record shows: Policy number SAMPLE-AU-1001; Carrier: Example Mutual (a made-up company); LOB: Personal Auto; Effective 03/01/2026; Expiration 09/01/2026; Premium $780; Status: Active. Answer these questions:

1. How long is the policy term?
2. On 10/15/2026, if no renewal was recorded, what status might you expect?
3. What should you check before sending an ID card for this policy?

### Suggested answer

1. Six months.
2. Expired (or the record may need review, because the renewal may not have been entered yet).
3. Check that the policy is active, the vehicles and named insured are correct, and the dates on the ID card match the current term.

## Key takeaways

- Core policy fields are policy number, effective and expiration dates, carrier, line of business, premium, and status.
- Policy terms are often six months or one year, but this varies.
- Do not confuse full-term premium with installment amounts.
- Report differences between the system and carrier documents instead of guessing.', 9, 6),
      (c, 'Document Management', 'Documents are the proof behind every policy and every customer request. If a document is lost or filed in the wrong place, the agency may not be able to show what was agreed. This lesson covers how to attach, name, and file documents correctly.

## Why document management matters

- It proves what coverage was requested, quoted, and bound.
- It helps coworkers find information quickly.
- It protects the agency if there is ever a dispute about what the customer asked for.
- It helps meet carrier and state record-keeping requirements.

## Attaching documents

Most agency systems let you attach files to a customer record and link them to a specific policy, activity, or both. When attaching a document:

1. Confirm the correct customer and the correct policy.
2. Check the document itself: does the name, policy number, and date match?
3. Choose the right document type or category, if your system has one (for example, "Application," "Declarations," "Endorsement," "Correspondence").
4. Add a clear description following the agency''s naming convention.
5. Link it to the related activity if there is one.

## Naming conventions

A **naming convention** is a standard way of naming files so that everyone can understand them. Each agency sets its own rules. A common pattern includes the date, the document type, the line of business, and a short detail. For example:

- 2026-03-01 Auto Dec Page Renewal
- 2026-04-12 Home Endorsement Mortgagee Change
- 2026-05-03 GL COI Sample Holder Inc

Using the year-month-day date format (YYYY-MM-DD) helps files sort in date order. Always use your agency''s exact convention if it has one.

## Filing to the right policy

A customer may have many policies, and each has many terms. File each document to:

- The correct **policy** (for example, the auto policy, not the home policy)
- The correct **term** (for example, the current term, not last year''s)

If a document applies to more than one policy, follow agency procedure. Some agencies attach it to each policy; others attach it once at the customer level.

## Common mistakes to avoid

- Attaching a document to the wrong customer with a similar name
- Leaving a vague description such as "scan" or "document1"
- Filing a renewal document to the expiring term
- Uploading the same document many times
- Saving customer documents to your personal computer or email

> Tip: Before you click save, read the description out loud in your head. Would a coworker understand what the file is without opening it?

## Practice exercise

You receive an endorsement for a made-up customer, "Sample Family Rivera." It adds a new car to personal auto policy SAMPLE-AU-2002, effective 2026-06-15. Write a file description using the pattern "Date, LOB, Document type, Detail," and say where it should be filed.

### Suggested answer

Description: "2026-06-15 Auto Endorsement Add Vehicle." File it to the Rivera customer record, linked to auto policy SAMPLE-AU-2002 in the term that includes June 15, 2026, and link it to the related change-request activity if one exists.

## Key takeaways

- Documents prove what was requested and agreed, so careful filing matters.
- Always confirm the customer, policy, and term before attaching.
- Use your agency''s naming convention; a date-first format sorts well.
- Avoid vague names, wrong terms, duplicates, and saving files to personal devices.', 9, 7),
      (c, 'Basic Data Entry', 'Data entry is the work of typing or updating information in a system. It may sound simple, but in insurance a single wrong digit can cause big problems, like a wrong VIN on an ID card or a premium entered as $1,200 instead of $120. This lesson covers how to enter data accurately.

## Why accuracy matters

- Carriers price and issue policies based on the information entered.
- Wrong information can lead to wrong documents, wrong bills, or delays.
- Customers lose trust when their details are wrong.
- Errors can create problems for the agency, including errors and omissions (E&O) claims, which are claims that the agency made a mistake.

## Common formats

Each system has its own rules, but these are common in US insurance:

- **Dates**: often MM/DD/YYYY (month first). For example, March 4, 2026 is 03/04/2026. This is different from the day-first format used in many other countries, so be very careful.
- **Phone numbers**: ten digits, such as (555) 555-0123 or 555-555-0123.
- **ZIP codes**: five digits, sometimes followed by four more (12345-6789).
- **States**: two-letter abbreviations, such as TX, FL, or CA.
- **Names**: follow the agency''s rules for capitalization and order (last name first or first name first).
- **VINs**: 17 characters; never the letters I, O, or Q.
- **Money**: check the decimal point carefully.

## Good data entry habits

1. **Read the source carefully.** Use the actual document (application, dec page, email) as your source, not memory.
2. **Enter one field at a time.** Do not rush.
3. **Double-check before saving.** Compare what you typed with the source, especially numbers.
4. **Do not guess.** If something is unclear or missing, leave it blank if allowed and ask, or follow the agency''s process for missing information.
5. **Use consistent formats.** Follow the agency''s standards for abbreviations and capitalization.
6. **Note what you changed.** Add a short note or activity explaining the update.

> Tip: For important numbers like policy numbers and VINs, check them in small groups of three or four characters. This makes mistakes easier to spot.

## Practice exercise

You are entering a made-up driver''s information from an application: date of birth written as "4 March 1990," phone "5555550142," and state "Texas." Write each field in the common US system format.

### Suggested answer

- Date of birth: 03/04/1990 (month first)
- Phone: (555) 555-0142 or 555-555-0142, depending on the system
- State: TX

## Key takeaways

- Small data entry errors can cause wrong documents, bills, and coverage problems.
- US systems commonly use MM/DD/YYYY dates, ten-digit phone numbers, and two-letter state codes.
- Always work from the source document and double-check numbers before saving.
- Never guess; ask or follow agency procedure when information is missing.', 8, 8),
      (c, 'System Navigation and Workflow: Activities, Tasks, Notes, and Follow-ups', 'Agency systems do more than store data. They also help the team remember what was done and what still needs to happen. This is done with activities, tasks, notes, and follow-ups. Using them well is what makes a VA reliable and easy to work with.

## Activities and tasks

An **activity** is a record of work related to a customer or policy. Different systems use different words, such as activity, task, or action item, but the idea is similar. An activity usually includes:

- **Type or description**: what the work is, such as "Add vehicle request"
- **Customer and policy**: what it relates to
- **Owner**: the person responsible
- **Due date**: when it should be done
- **Status**: open or closed
- **Notes**: the details and history

When a request comes in, a new activity is often created. When the work is finished, the activity is closed with a final note.

## Notes

A **note** is a written record of what happened. Good notes help anyone on the team understand the situation without asking you. A good note answers:

- **Who** contacted or was contacted
- **What** was requested or done
- **When** it happened
- **What is next**

Example of a weak note: "Called customer."

Example of a strong note: "2026-05-10: Called Sample Customer Chen at 555-555-0188 to request the signed application. Left voicemail. Will follow up 2026-05-13."

Keep notes factual and professional. Do not include personal opinions about customers, because notes are part of the business record.

## Follow-ups and diaries

A **follow-up** is a reminder to check on something later. In insurance agencies this is often called a **diary**, as in "diary it for three days." For example, if you request a document from a carrier, you might set a follow-up for two business days later to check whether it arrived.

Good follow-up habits:

1. Set a follow-up whenever you are waiting on someone else.
2. Choose a realistic date based on agency guidelines.
3. Check your follow-up list at the start of each day.
4. When you complete a follow-up, add a note and either close it or set the next one.
5. Never let a follow-up stay overdue without action.

> Tip: A simple rule: if it is not written in the system, it did not happen. Always record your work.

## Putting it together

A typical flow looks like this: a request arrives, you create or update an activity, you do the work, you write a clear note, you set a follow-up if you are waiting on something, and you close the activity when everything is complete.

## Practice exercise

A made-up customer, "Sample Business Co.," emails asking for a certificate of insurance for a new client. Your agency requires a licensed account manager to approve certificates. Write a short note and say what follow-up you would set.

### Suggested answer

Note: "2026-07-01: Received email from Sample Business Co. requesting COI for new certificate holder (details attached). Sent to account manager for approval per procedure." Follow-up: set a reminder for the next business day to confirm the certificate was approved and sent, then close the activity with a final note.

## Key takeaways

- Activities and tasks track work with an owner, due date, and status.
- Good notes explain who, what, when, and what is next.
- Follow-ups (diaries) make sure nothing is forgotten while waiting on others.
- If it is not recorded in the system, the team cannot rely on it.', 10, 9);
  else
    select id into c from public.lava_courses where slug = 'insurance-navigation-tools';
  end if;
  if not exists (select 1 from public.lava_assessments where slug = 'insurance-navigation-tools-quiz') then
    insert into public.lava_assessments (slug, course_id, kind, title, description, pass_percent, status, sort_order)
      values ('insurance-navigation-tools-quiz', c, 'quiz', 'Insurance Navigation Tools Quiz', 'Check your understanding of agency systems, records, policy information, documents, data entry, and follow-ups.', 70, 'published', 4) returning id into a;
    insert into public.lava_questions (assessment_id, prompt, scenario, context, options, answer, explanation, sort_order) values
      (a, 'What is the main purpose of an Agency Management System (AMS)?', null, null, '["To provide coverage and pay claims","To replace licensed agents in giving coverage advice","To send marketing emails only","To serve as the agency’s main system of record for customers, policies, documents, and activities"]'::jsonb, 3, 'An AMS is the agency’s central record-keeping system. Carriers pay claims, and licensed staff give coverage advice.', 1),
      (a, 'Which statement best describes the difference between a CRM and an AMS?', null, null, '["They are exactly the same thing","A CRM is only used by carriers; an AMS is only used by customers","A CRM stores policy forms; an AMS stores marketing campaigns","A CRM focuses on relationships, leads, and communication; an AMS focuses on the official policy and accounting record"]'::jsonb, 3, 'CRMs focus on sales, relationships, and engagement, while an AMS holds the official policy, document, and accounting records.', 2),
      (a, 'What should you do next?', 'A caller says, "I need my ID cards." You search the name "Maria Santos" and find four matching records.', null, '["Pick the first record in the list","Send ID cards for all four records","Confirm at least one more detail, such as date of birth, address, or policy number","Create a new record to be safe"]'::jsonb, 2, 'Names are often shared, so confirm at least two details before working on a record or sending private information.', 3),
      (a, 'Which search is usually the most exact way to find a specific policy?', null, null, '["First name only","City","Line of business","Policy number"]'::jsonb, 3, 'A policy number is unique to the policy, so it usually gives the most exact result.', 4),
      (a, 'What is the best action before creating a new record?', 'You searched by name and could not find a customer, so you are about to create a new record. The customer recently got married and changed her last name.', null, '["Delete any old records with similar names","Create the new record right away to save time","Search by phone number, email, and former name to check for an existing record","Ask the customer to call back tomorrow"]'::jsonb, 2, 'Searching several ways, including former names, helps avoid duplicate records.', 5),
      (a, 'What is the policy term?', 'A sample policy shows: Effective 01/15/2026, Expiration 07/15/2026, Status: Active.', null, '["Twelve days","Three months","One year","Six months"]'::jsonb, 3, 'From January 15 to July 15 is a six-month term, which is common for personal auto policies.', 6),
      (a, 'Which file description best follows a clear, date-first naming convention?', null, null, '["new doc from carrier","Endorsement","scan001","2026-04-12 Home Endorsement Mortgagee Change"]'::jsonb, 3, 'A clear description with the date, line of business, document type, and detail helps coworkers find and understand the file.', 7),
      (a, 'How should you enter it?', 'An application shows a driver’s date of birth as "7 August 1988." Your agency’s system uses the common US date format.', null, '["08/07/1988","07/08/1988","1988/07/08","7.8.88"]'::jsonb, 0, 'The common US format is MM/DD/YYYY, so August 7, 1988 is entered as 08/07/1988.', 8),
      (a, 'What should you do in the agency system?', 'You emailed a carrier asking for a copy of a dec page. The carrier said it may take a few days.', null, '["Nothing until the document arrives","Write a note about the request and set a follow-up (diary) to check on it","Ask the customer to contact the carrier directly","Close the activity because you sent the email"]'::jsonb, 1, 'Recording the request and setting a follow-up makes sure the item is not forgotten while you wait.', 9),
      (a, 'Which statement about third-party tools like Applied Epic, AMS360, EZLynx, HubSpot, and InsuredMine is true for this course?', null, null, '["Every learner automatically receives logins to all of them","They are required by law in every state","They are all carrier claim systems","They are general industry examples, and access is provided only if your administrator gives it"]'::jsonb, 3, 'This course describes these tools as general examples only. Learners do not receive access through the course unless their administrator provides it.', 10);
  end if;
end $seed$;

do $seed$
declare c uuid; a uuid;
begin
  if not exists (select 1 from public.lava_courses where slug = 'acord-forms') then
    insert into public.lava_courses (slug, title, summary, status, sort_order)
      values ('acord-forms', 'ACORD Forms', 'Learn what ACORD forms are, how to navigate the ACORD 25, 24, 27, and 28, and how to review certificates of insurance for common errors. This course teaches purpose and navigation only and does not authorize regulated insurance activities.', 'published', 5) returning id into c;
    insert into public.lava_lessons (course_id, title, body, minutes, sort_order) values
      (c, 'What ACORD Forms Are', 'Every day, insurance agencies send and receive information about policies, coverage, and proof of insurance. To make this information easy to read and share, the industry uses standard forms. The most common family of standard forms is called ACORD. In this lesson you will learn what ACORD forms are, who creates them, and what this course will and will not prepare you to do.

## Important scope statement

> This course teaches the purpose of ACORD forms and how to navigate them. Completing this course does not license, certify, or authorize anyone to perform regulated insurance activities. Certificates of insurance and other forms must be issued, approved, and signed according to your agency''s procedures by authorized, properly licensed staff.

As a virtual assistant (VA), you may help prepare drafts, gather information, check details, and route requests. Final decisions about coverage and the issuing of certificates belong to licensed staff who follow agency rules.

## What does ACORD mean?

**ACORD** stands for **Association for Cooperative Operations Research and Development**. It is a nonprofit organization that creates data standards and standardized forms for the insurance industry. Agencies, carriers (insurance companies), and other businesses use these forms so that everyone sees the same information in the same place.

Think of ACORD forms like a standard template. When a building owner receives a certificate from any agency in the country, the policy number, dates, and limits are in the same boxes. This saves time and reduces mistakes.

## Types of ACORD forms

ACORD publishes many forms. They fall into a few main groups:

- **Certificates and evidence forms:** documents that show proof of insurance to another party. Examples: ACORD 25, ACORD 24, ACORD 27, ACORD 28.
- **Applications:** forms used to collect information for a new policy quote. Example: the ACORD 125 Commercial Insurance Application.
- **Claims and loss notices:** forms used to report a loss to a carrier.
- **Supplements and schedules:** extra pages that add details, such as the ACORD 101 Additional Remarks Schedule.

This course focuses on the certificate and evidence forms, because these are the forms VAs see most often.

## Form numbers and editions

Each ACORD form has a **number** (for example, 25) and an **edition date** printed at the bottom (for example, a year and month). ACORD updates forms from time to time. Your agency may use a specific edition, and some requesters or contracts may ask for a certain edition. Always use the version that your agency management system (AMS) or supervisor tells you to use.

> Form editions, layouts, and requirements can vary. When something on a form looks different from this course, ask your supervisor rather than guessing.

## Where you will see ACORD forms

- Inside the agency management system (AMS), where certificates are generated from policy data
- In emails from clients, contractors, landlords, and lenders asking for proof of insurance
- In carrier documents and new business submissions

## Key takeaways

- ACORD stands for Association for Cooperative Operations Research and Development.
- ACORD forms are standardized industry forms, so information appears in the same place every time.
- Certificate and evidence forms (25, 24, 27, 28) are the forms VAs see most.
- Form editions can change; follow your agency''s approved version.
- This course teaches purpose and navigation only. It does not authorize you to perform licensed insurance activities.', 8, 1),
      (c, 'Why Agencies Use ACORD Forms', 'Before learning each form, it helps to understand why agencies rely on ACORD forms so much. When you know the reason behind a process, you make fewer mistakes and you can explain things clearly to clients.

## Reason 1: One common language

Agencies work with many carriers, and clients work with many vendors, landlords, and lenders. If each company created its own proof-of-insurance document, every reader would have to learn a new layout. ACORD forms give everyone one common layout. A general contractor, a property manager, or a bank can read any agency''s ACORD 25 because the boxes are always in the same place.

## Reason 2: Speed and efficiency

Most agency management systems (AMS) can fill ACORD forms automatically using the policy information already saved in the system. This means staff do not have to type the policy number, dates, and limits each time. A request that might take 30 minutes by hand can take a few minutes.

## Reason 3: Fewer errors

Because fields are standard and often filled from system data, there is less chance of typing mistakes. Standard fields also make it easier to review a form, because you know exactly where to look for each detail.

## Reason 4: Clear limits on what the document means

ACORD certificates include a printed disclaimer that explains the certificate is issued for information only. It does not change, extend, or add to the coverage of the policy. This protects the client, the agency, and the carrier, because everyone understands that the policy itself is the real contract.

## Reason 5: Meeting contract requirements

Many business contracts require one party to show proof of insurance. For example, a property manager may require a cleaning company to show general liability coverage before it can work in the building. An ACORD certificate is the usual way to provide this proof.

## Who asks for ACORD forms?

- **Clients (insureds)** who need proof for a job, a lease, or a contract
- **Certificate holders** such as general contractors, landlords, event venues, and property managers
- **Lenders and mortgage companies** that need evidence of property insurance
- **Carriers and underwriters** who receive ACORD applications for new business

## Practice exercise

Read each situation and decide which reason for using ACORD forms it shows best: common language, speed, fewer errors, clear limits, or contract requirements.

1. A landlord says a new tenant cannot move into a store until the landlord receives proof of liability insurance.
2. A VA generates a certificate in the AMS and the policy dates fill in automatically.
3. A certificate holder asks if the certificate means they are now covered by the policy. The agency points to the disclaimer at the top of the form.
4. A general contractor reviews certificates from 20 subcontractors, each from a different agency, and finds the limits in the same place on every form.

### Suggested answer

1. Contract requirements: the lease requires proof of insurance.
2. Speed and fewer errors: the AMS fills data from the saved policy.
3. Clear limits: the disclaimer explains the certificate is for information only.
4. Common language: the standard layout makes forms from different agencies easy to compare.

## Key takeaways

- ACORD forms create one common language across agencies, carriers, and clients.
- AMS systems fill ACORD forms from policy data, which saves time and reduces errors.
- The disclaimer makes clear that a certificate is for information only.
- Contracts, leases, and lenders often require proof of insurance, usually on an ACORD form.', 8, 2),
      (c, 'ACORD 25: Header, Producer, Insured, and Insurers', 'The **ACORD 25 Certificate of Liability Insurance** is the most requested form in most commercial insurance agencies. It shows proof of liability coverages such as general liability, auto liability, umbrella or excess liability, and workers'' compensation. In this lesson, you will learn the top part of the form. The next lessons cover the coverages table and the bottom of the form.

## The header

At the top of the ACORD 25 you will find:

- **Form title:** Certificate of Liability Insurance
- **Date (MM/DD/YYYY):** the date the certificate was issued or prepared. This should be the current date when the certificate is created.
- **Disclaimer box:** printed text explaining that the certificate is issued as a matter of information only, confers no rights upon the certificate holder, and does not amend, extend, or alter the coverage of the policies. It also explains that if the holder is an additional insured, the policy must have the proper endorsement.

> Never edit or remove the printed disclaimer. It is part of the standard form.

## Producer section

The **producer** is the insurance agency (or broker) that placed the policy. This section shows:

- Agency name and mailing address
- **Contact name**, phone number, fax (if used), and email address

Requesters use this section to know who to call with questions. Make sure the contact details match your agency''s current information.

## Insured section

The **insured** is the person or business that owns the policy. This box should show the **named insured** exactly as it appears on the policy declarations page, plus the mailing address. Small differences matter. For example, "Sunrise Bakery LLC" and "Sunrise Bakeries Inc." may be two different legal entities.

## Insurers affording coverage (A through F)

On the right side of the form there is a list of insurers labeled **Insurer A** through **Insurer F**. Each line shows:

- The **name of the carrier** (insurance company) providing a policy
- The carrier''s **NAIC number**, an identification number assigned to insurance companies

Each letter is then used in the coverages table below, in the column called **INSR LTR** (insurer letter). For example, if Insurer A is the general liability carrier and Insurer B is the workers'' compensation carrier, the GL row will show "A" and the WC row will show "B". This is how the form connects each policy to the right company.

## Certificate number and revision number

Below the header area you will usually see a **certificate number** and a **revision number**. Many AMS systems fill these automatically. They help the agency track different versions of a certificate sent to the same holder.

## Practice exercise

Review this sample (made-up) header information and find the problems.

- Date: 03/14/2019 (today is in the current year)
- Producer: Bright Path Insurance Agency, contact phone left blank
- Insured: "Coastal Paint Co." but the declarations page says "Coastal Painting Company LLC"
- Insurer A: Example Mutual Insurance Co., NAIC 12345
- In the coverages table, the GL row shows insurer letter "C", but no Insurer C is listed

### Suggested answer

1. The date is old. A new certificate should show the current date.
2. The producer contact phone is missing. Requesters need a way to reach the agency.
3. The insured name does not match the declarations page. It must match the named insured exactly.
4. The GL row points to Insurer C, but no Insurer C exists. The insurer letter must match a listed carrier.

## Key takeaways

- The ACORD 25 shows proof of liability coverages.
- The date should be current, and the disclaimer must not be changed.
- The producer is the agency; the insured is the policy owner, named exactly as on the policy.
- Insurers A through F list the carriers and NAIC numbers, and the INSR LTR column links each policy to its carrier.', 10, 3),
      (c, 'ACORD 25: The Coverages Table', 'The middle of the ACORD 25 is the **coverages table**. This is where the reader learns which policies the insured has, the policy numbers, the dates, and the limits. It is the most important part of the form to review carefully.

## The columns

From left to right, each row of the table has these columns:

- **INSR LTR:** the insurer letter (A to F) that matches the carrier list at the top
- **TYPE OF INSURANCE:** the kind of coverage, with checkboxes for details
- **ADDL INSD:** marked "Y" if the certificate holder or others are additional insureds (covered in a later lesson)
- **SUBR WVD:** marked "Y" if a waiver of subrogation applies (covered in a later lesson)
- **POLICY NUMBER**
- **POLICY EFF (MM/DD/YYYY):** policy effective (start) date
- **POLICY EXP (MM/DD/YYYY):** policy expiration (end) date
- **LIMITS:** the dollar amounts of coverage

## Commercial General Liability (GL)

General liability protects a business against claims of bodily injury or property damage to others, and certain other injuries. On the form you will see checkboxes for **Claims-Made** or **Occur** (occurrence), and for how the general aggregate applies (per **Policy**, **Project**, or **Location**). Typical limit boxes:

- Each Occurrence
- Damage to Rented Premises (each occurrence)
- Med Exp (any one person)
- Personal and Adv Injury
- General Aggregate
- Products - Comp/Op Agg

## Automobile Liability

Auto liability covers injury or damage to others caused by vehicles used for the business. Checkboxes show which autos are covered, such as **Any Auto**, **Owned Autos Only**, **Scheduled Autos**, **Hired Autos Only**, and **Non-Owned Autos Only**. Limits may show a **Combined Single Limit** or separate amounts for bodily injury and property damage.

## Umbrella or Excess Liability

An umbrella or excess policy gives extra limits above the underlying policies (such as GL and auto). Boxes show **Umbrella Liab** or **Excess Liab**, **Occur** or **Claims-Made**, and limits for **Each Occurrence** and **Aggregate**. There may also be a deductible or retention amount.

## Workers'' Compensation and Employers'' Liability

Workers'' compensation pays benefits to employees who are hurt on the job, following state law. The row includes a box for **Per Statute** and three employers'' liability limits:

- E.L. Each Accident
- E.L. Disease - Each Employee
- E.L. Disease - Policy Limit

There is also a Y/N question asking whether any proprietor, partner, or executive officer is excluded.

## Other row

A blank row allows other coverages to be listed, such as professional liability or inland marine, when the agency decides it is appropriate.

> The dates and limits on the certificate must match the actual policy. Never type a limit or date that is not on the policy in the AMS or declarations page.

## Practice exercise

Review this sample (made-up) coverages table for "Green Leaf Landscaping LLC". Today is 06/10 of the current year.

- GL: Occur, policy GL-555, eff 07/01 last year, exp 07/01 this year, Each Occurrence $1,000,000, General Aggregate $500,000
- Auto: policy number left blank, eff 01/15 this year, exp 01/15 next year, Combined Single Limit $1,000,000
- Umbrella: policy UMB-777, eff 07/01 this year, exp 07/01 next year, Each Occurrence $2,000,000
- WC: policy WC-321, eff 02/01 this year, exp 02/01 next year, E.L. limits filled in

### Suggested answer

1. The GL general aggregate ($500,000) is lower than the each occurrence limit ($1,000,000). This is unusual and should be checked against the policy.
2. The auto policy number is missing.
3. The umbrella effective date (07/01 this year) is in the future. Check whether the policy is bound yet and follow agency procedure before showing it.
4. The GL policy expires soon (07/01). Not an error by itself, but the holder may need an updated certificate after renewal.

## Key takeaways

- The coverages table shows insurer letter, type of insurance, ADDL INSD, SUBR WVD, policy number, dates, and limits.
- The four main rows are GL, auto liability, umbrella or excess, and workers'' compensation.
- Every date and limit must match the actual policy.
- Check for missing policy numbers, future or expired dates, and limits that look unusual.', 12, 4),
      (c, 'ACORD 25: Description, Holder, Cancellation, and Signature', 'The bottom part of the ACORD 25 tells the reader who the certificate is for, any extra details about the work or location, what happens if a policy is cancelled, and who authorized the certificate.

## Description of operations / locations / vehicles

This large box is used to add details. Common examples:

- The project name or job address, such as "Re: Renovation at 100 Main Street"
- The type of work the insured does
- A statement that the certificate holder is an additional insured, when the policy has an endorsement that supports it
- Vehicle details or location numbers

If there is not enough space, the agency may attach the **ACORD 101 Additional Remarks Schedule**.

> The description box can only describe coverage that already exists on the policy. Wording such as "additional insured" or "waiver of subrogation" must be supported by an endorsement on the policy. A VA should never add special wording without approval from licensed staff.

## Certificate holder

The **certificate holder** is the person or company that requested proof of insurance, such as a landlord, general contractor, or event venue. This box shows their full legal name and mailing address. Because many holders receive certificates by mail or keep them in compliance systems, the name and address must be correct and complete.

A certificate holder is not automatically an additional insured. Being listed as the holder only means they receive the certificate.

## Cancellation

This box contains standard printed wording. It explains that if any of the described policies are cancelled before the expiration date, notice will be delivered in accordance with the policy provisions. In simple terms, the certificate does not promise extra notice to the holder beyond what the policy itself provides.

Sometimes a holder asks for wording like "30 days notice of cancellation will be given to the certificate holder." Do not type this into the form. Any notice promise must come from the policy, and requests like this must go to licensed staff.

## Authorized representative

At the bottom right is the signature line for the **authorized representative**. This is a person at the agency who is authorized by the agency (and the carriers it represents) to issue certificates. Many AMS systems apply an electronic signature for approved users.

> Never sign, paste a signature, or issue a certificate under someone else''s name. Only authorized staff may sign, according to agency procedures.

## Practice exercise

Review this sample (made-up) bottom section and list any concerns.

- Description: "Certificate holder is additional insured and primary and non-contributory. 60 days notice of cancellation will be provided." (No endorsements found on the GL policy.)
- Certificate holder: "Harbor Point Properties" with no street address
- Cancellation box: printed wording has been deleted
- Authorized representative: blank

### Suggested answer

1. The description includes additional insured and primary and non-contributory wording, but the policy has no endorsements to support it. This must be reviewed by licensed staff before anything is issued.
2. The 60-day notice promise is not supported by the policy and should not be added by a VA.
3. The certificate holder address is missing.
4. The standard cancellation wording was deleted. The standard form wording must stay.
5. The authorized representative signature is blank. Only authorized staff may sign.

## Key takeaways

- The description box adds details about the job, location, or vehicles, but cannot add coverage.
- The certificate holder receives the certificate; they are not automatically an additional insured.
- The cancellation box uses standard wording; do not add notice promises.
- Only an authorized representative may sign, following agency procedures.', 10, 5),
      (c, 'Property Forms: ACORD 24, 27, and 28', 'The ACORD 25 is for liability coverage. When someone needs proof of property insurance, agencies use different forms. The three you will see most are the ACORD 24, ACORD 27, and ACORD 28. Each has a different purpose, and it is easy to mix them up, so this lesson compares them side by side.

## ACORD 24: Certificate of Property Insurance

The **ACORD 24** shows that property insurance is in force. It looks similar to the ACORD 25, but the coverages section is about property, such as buildings, business personal property, business income, and other property coverages. It includes:

- Producer, insured, and insurers (with NAIC numbers)
- Location or description of property
- Policy numbers, effective and expiration dates
- Coverage types, causes of loss, limits, and deductibles
- Certificate holder, cancellation wording, and authorized representative

Like the ACORD 25, the ACORD 24 is for information only. It confers no rights on the certificate holder.

## ACORD 27: Evidence of Property Insurance

The **ACORD 27** is used to give evidence of property insurance to an **additional interest**, often a mortgage company or lender. It is commonly used for personal lines property, such as a home, though use can vary by agency. It shows:

- Agency, insured, and company information
- Loan number and the property location or description
- Policy number, effective and expiration dates, and whether coverage is continuous or for a set term
- Coverage information, such as limits and deductibles
- **Additional interest** section: the lender''s name and address and how it is listed, such as **mortgagee** or **loss payee**

## ACORD 28: Evidence of Commercial Property Insurance

The **ACORD 28** is similar in purpose to the ACORD 27, but it is designed for **commercial property**. Lenders and landlords of business properties often request it. It has more detail, such as:

- Building and business personal property coverage
- Causes of loss form and coinsurance
- Business income and other commercial property coverages
- Additional interest (for example, mortgagee, lender''s loss payable, or lessor)

## Certificate versus evidence

The words matter. A **certificate** (ACORD 24, ACORD 25) is proof given to a holder for information. An **evidence** form (ACORD 27, ACORD 28) is usually sent to an additional interest such as a lender, and any rights that interest has come from the policy itself (for example, a mortgagee clause), not from the form.

> Which form to use depends on the request, the type of property, and agency procedure. If you are unsure, ask your supervisor which form is correct.

## Practice exercise

Choose the most likely form for each request, then check the sample data for errors.

1. A bank asks for evidence of homeowners insurance listing the bank as mortgagee with the loan number.
2. A landlord of a restaurant building asks for evidence of commercial property insurance listing the landlord as lessor.
3. A sample (made-up) ACORD 27 shows: Insured "Maria Santos", property "45 Oak Lane", loan number blank, mortgagee "First Example Bank" with no address, policy expiration date before the effective date.

### Suggested answer

1. ACORD 27, Evidence of Property Insurance.
2. ACORD 28, Evidence of Commercial Property Insurance.
3. Errors: the loan number is missing, the mortgagee address is missing, and the expiration date is before the effective date, which is not possible. All must be checked against the policy before the form is sent.

## Key takeaways

- ACORD 24 is a Certificate of Property Insurance, for information only.
- ACORD 27 is Evidence of Property Insurance, often for homes and lenders.
- ACORD 28 is Evidence of Commercial Property Insurance, for business properties.
- Evidence forms list an additional interest such as a mortgagee, loss payee, or lessor.
- Choose the form based on the request and agency procedure.', 12, 6),
      (c, 'Common Fields and Terminology', 'Certificate requests often include special words. Holders copy these words from contracts and ask the agency to "add" them. To handle these requests correctly, you need to understand what each term means and where it shows on the form.

## Certificate holder

The **certificate holder** is the party that receives the certificate as proof of insurance. Being a holder gives no coverage. It only means the holder is informed that coverage exists.

## Additional insured (AI)

An **additional insured** is a person or company, other than the named insured, that receives certain protection under the insured''s policy. This status is created by an **endorsement** on the policy. For example, a general contractor may require a subcontractor''s GL policy to include the contractor as an additional insured.

## ADDL INSD column

On the ACORD 25, the **ADDL INSD** column is marked "Y" on a coverage row when additional insured status applies to that policy. A "Y" should only appear when the policy actually has an additional insured endorsement that applies.

## Waiver of subrogation

**Subrogation** is the right of an insurance company, after paying a claim, to try to recover the money from the party that caused the loss. A **waiver of subrogation** means the carrier gives up that right against a specific party. Many contracts ask for this. It must be provided by an endorsement or policy wording.

## SUBR WVD column

The **SUBR WVD** (subrogation waived) column is marked "Y" when a waiver of subrogation applies on that policy. Again, it must be supported by the policy.

## Primary and non-contributory

**Primary** means the insured''s policy pays first, before the additional insured''s own policy. **Non-contributory** means the insured''s policy will not ask the additional insured''s policy to share the loss. This wording usually appears in the description box and must be supported by an endorsement.

## Other common terms

- **Blanket endorsement:** an endorsement that automatically applies to anyone the insured agreed to cover in a written contract, instead of naming each party.
- **Scheduled (or designated) endorsement:** an endorsement that names a specific person or company.
- **NAIC number:** an identification number for an insurance company.
- **Per project aggregate:** a GL limit that applies separately to each project.

> If a holder''s request includes any of these terms and you cannot confirm an endorsement on the policy, send the request to licensed staff. Do not mark Y or add wording on your own.

## Practice exercise

Read each sample (made-up) situation and decide what should happen.

1. The GL policy has a blanket additional insured endorsement for written contracts. The holder sent a signed contract requiring AI status. The draft shows ADDL INSD blank.
2. The WC policy has no waiver of subrogation endorsement. The holder asks for SUBR WVD "Y" on WC.
3. A holder thinks being listed as certificate holder means they are covered.

### Suggested answer

1. Flag the draft for licensed staff review. The policy appears to support AI status, so the ADDL INSD column may need a "Y" after staff confirm.
2. Do not mark "Y". Send the request to licensed staff, who may contact the carrier about adding an endorsement.
3. Explain politely that being a certificate holder only means they receive proof of insurance. Additional insured status requires an endorsement.

## Key takeaways

- Certificate holder means "receives the certificate," not "has coverage."
- Additional insured status and waivers of subrogation come from endorsements.
- ADDL INSD and SUBR WVD columns show "Y" only when the policy supports it.
- Primary and non-contributory wording must be supported by the policy.', 10, 7),
      (c, 'Understanding Certificates of Insurance', 'A **certificate of insurance (COI)** is one of the most common documents an agency produces. Many people misunderstand what it does. In this lesson you will learn the most important rule about COIs and the typical workflow for handling a holder request.

## A COI is evidence only

The number one rule: **a certificate of insurance is evidence of coverage only. It does not change the coverage.** The policy is the contract. The certificate is a summary of some information from the policy at a moment in time.

This means:

- A COI cannot add a coverage that the policy does not have.
- A COI cannot raise a limit higher than the policy limit.
- A COI cannot make someone an additional insured if the policy has no endorsement for it.
- A COI cannot extend a policy past its expiration date.

The printed disclaimer on the ACORD 25 and ACORD 24 says this directly. In many places, laws or regulations also restrict what can be stated on a certificate, and these rules vary by state. That is one more reason to follow agency procedures exactly.

## Who requests certificates?

Requests usually come from the insured (the client) or directly from a third party, such as a general contractor, landlord, event venue, or property manager. Some holders use online compliance systems that send automated requests.

## Typical holder request workflow

Agencies have their own procedures, but most follow steps similar to these:

1. **Receive the request.** Save the email or request in the AMS under the correct client.
2. **Confirm who is asking.** Make sure the request is from the client or an authorized party, according to agency rules.
3. **Gather details.** Holder full legal name and address, project or location, and any requirements (limits, AI, waiver, primary and non-contributory). Ask for the contract section if wording is requested.
4. **Compare requirements to the policy.** Check coverages, limits, dates, and endorsements in the AMS or policy documents.
5. **Prepare a draft** in the AMS using the correct form.
6. **Route for review.** If anything is unusual, or if special wording is requested, send it to licensed staff. Follow agency rules on who approves.
7. **Issue and send** only after approval by authorized staff.
8. **Document.** Save a copy of the issued certificate and note the activity in the AMS.

> If the policy does not meet the holder''s requirements, the certificate cannot fix it. Licensed staff must discuss options with the client, such as asking the carrier for an endorsement.

## Practice exercise

A sample (made-up) email arrives: "We need a COI showing $2,000,000 each occurrence GL and our company as additional insured. Please send today." The client''s GL policy has a $1,000,000 each occurrence limit, no umbrella, and no additional insured endorsement.

What should happen?

### Suggested answer

1. Save the request in the AMS under the correct client.
2. Recognize that the policy does not meet the requirements: the limit is lower than requested and there is no AI endorsement.
3. Do not type $2,000,000 or add AI wording. A COI cannot change coverage.
4. Route the request to licensed staff right away, noting the gaps, so they can talk with the client about options.
5. Document the activity in the AMS.

## Key takeaways

- A COI is evidence of coverage only and does not change the policy.
- Certificates cannot add coverage, raise limits, or add additional insureds.
- Follow the workflow: receive, confirm, gather, compare, draft, route, issue after approval, document.
- When the policy does not meet the request, send it to licensed staff.', 10, 8),
      (c, 'Basic Document Review Checklist', 'Careful review is one of the most valuable skills a VA can bring to an agency. A small mistake on a certificate, such as a misspelled name or an old date, can cause a client to lose a job or delay a project. This lesson gives you a simple checklist to use every time you prepare or review a certificate draft.

## The review checklist

Use these steps before sending any draft to licensed staff for approval.

1. **Correct form.** Is this the right form for the request (ACORD 25 for liability, ACORD 24, 27, or 28 for property)?
2. **Date.** Is the certificate date current?
3. **Producer.** Are the agency name, contact, phone, and email correct?
4. **Insured name.** Is the named insured spelled exactly as on the declarations page, including LLC, Inc., or DBA?
5. **Insured address.** Is the mailing address complete and current?
6. **Insurers.** Is each carrier name and NAIC number correct, and does each INSR LTR match a listed insurer?
7. **Policy numbers.** Does each policy number match the policy?
8. **Dates.** Are effective and expiration dates correct and current? Is any policy expired?
9. **Limits.** Do all limits match the policy exactly?
10. **ADDL INSD and SUBR WVD.** Is each "Y" supported by an endorsement on that policy?
11. **Description box.** Is all requested wording supported by an endorsement, and approved by licensed staff?
12. **Certificate holder.** Is the holder''s full legal name and complete address correct?
13. **Standard wording.** Are the disclaimer and cancellation wording unchanged?
14. **Signature.** Will it be signed by an authorized representative according to agency procedure?

> Compare the draft to the source (AMS policy record or declarations page), not to your memory or to an old certificate.

## Common mistakes to watch for

- Copying an old certificate that shows expired policies
- Typos in the holder name, such as "Smiht Construction"
- A missing suite number or ZIP code in an address
- Limits that do not match after a policy change or renewal
- A "Y" in ADDL INSD with no endorsement on the policy
- Special wording pasted from the holder''s email without approval

## Practice exercise

Review this sample (made-up) ACORD 25 draft. Today is 09/20 of the current year. The policy record shows: Named insured "Blue River Plumbing Inc.", GL policy BRP-1001, 04/01 this year to 04/01 next year, $1,000,000 each occurrence, $2,000,000 general aggregate, blanket AI endorsement for written contracts, no waiver of subrogation endorsement.

Draft shows:

- Date: 09/20 this year
- Insured: "Blue River Plumbing LLC"
- GL policy BRP-1010, 04/01 this year to 04/01 next year
- Each occurrence $1,000,000, general aggregate $3,000,000
- ADDL INSD: Y, SUBR WVD: Y
- Holder: "Westgate Mall Managment", address with no ZIP code

### Suggested answer

1. Insured name is wrong: "LLC" should be "Inc."
2. Policy number is wrong: BRP-1010 should be BRP-1001.
3. General aggregate is wrong: $3,000,000 should be $2,000,000.
4. SUBR WVD "Y" is not supported, because there is no waiver of subrogation endorsement. Flag for licensed staff.
5. ADDL INSD "Y" may be supported by the blanket endorsement only if a written contract requires it. Confirm with licensed staff.
6. Holder name is misspelled ("Managment") and the ZIP code is missing.
7. The date and policy dates are correct.

## Key takeaways

- Use the same checklist every time.
- Always compare the draft against the policy record or declarations page.
- Check names, dates, limits, holder address, and that all requested wording is supported by an endorsement.
- Flag anything unusual for licensed staff; never fix coverage problems on the certificate.', 12, 9);
  else
    select id into c from public.lava_courses where slug = 'acord-forms';
  end if;
  if not exists (select 1 from public.lava_assessments where slug = 'acord-forms-quiz') then
    insert into public.lava_assessments (slug, course_id, kind, title, description, pass_percent, status, sort_order)
      values ('acord-forms-quiz', c, 'quiz', 'ACORD Forms Quiz', 'Check your understanding of ACORD form purposes, sections, and basic certificate review.', 70, 'published', 5) returning id into a;
    insert into public.lava_questions (assessment_id, prompt, scenario, context, options, answer, explanation, sort_order) values
      (a, 'What does ACORD stand for?', null, null, '["American Council of Registered Directors","Agency Certificate and Online Records Database","Association of Commercial Operations and Risk Documents","Association for Cooperative Operations Research and Development"]'::jsonb, 3, 'ACORD is the Association for Cooperative Operations Research and Development, a nonprofit that creates standard insurance forms and data standards.', 1),
      (a, 'Which form is used to show proof of liability coverages such as GL, auto, umbrella, and workers'' compensation?', null, null, '["ACORD 25","ACORD 27","ACORD 28","ACORD 24"]'::jsonb, 0, 'The ACORD 25 is the Certificate of Liability Insurance. ACORD 24, 27, and 28 are property forms.', 2),
      (a, 'What is the error?', 'A sample draft ACORD 25 lists Insurer A (GL carrier) and Insurer B (WC carrier). In the coverages table, the GL row shows INSR LTR "B" and the WC row shows "B".', null, '["Insurer letters are optional and can be left as is","The GL row should show \"A\" to match the GL carrier","The NAIC numbers must be moved into the INSR LTR column","The WC row should show \"A\""]'::jsonb, 1, 'The INSR LTR column links each policy to its carrier. Since Insurer A is the GL carrier, the GL row must show "A".', 3),
      (a, 'What should the VA do?', 'A holder emails: "Please add that we will receive 30 days notice of cancellation." The policy has no endorsement providing notice to this holder.', null, '["Delete the standard cancellation wording to make room","Add the wording to the description box instead","Type the 30-day wording into the cancellation box","Do not add the wording; route the request to licensed staff"]'::jsonb, 3, 'A certificate cannot promise notice the policy does not provide. Special requests like this go to licensed staff, and the standard wording stays unchanged.', 4),
      (a, 'What is the best action?', 'Draft certificate: Named insured on the declarations page is "Rivera Roofing LLC". The draft shows "Rivera Roofing Inc." All dates and limits match the policy.', null, '["Send it, because the dates and limits are correct","Correct the insured name to match the declarations page exactly before review","Add both names in the description box","Leave it, because LLC and Inc. mean the same thing"]'::jsonb, 1, 'The insured name must match the policy exactly. LLC and Inc. are different types of legal entities.', 5),
      (a, 'A bank needs evidence of homeowners insurance listing it as mortgagee with a loan number. Which form is most commonly used?', null, null, '["ACORD 101","ACORD 27","ACORD 25","ACORD 28"]'::jsonb, 1, 'The ACORD 27 Evidence of Property Insurance is commonly used to show property coverage to a lender listed as an additional interest.', 6),
      (a, 'Which statement is correct?', 'A general contractor asks for ADDL INSD "Y" on the GL row. The VA checks the policy and finds no additional insured endorsement of any kind.', null, '["Mark \"Y\" but add a note in the description box","Do not mark \"Y\"; flag the request for licensed staff, since AI status requires an endorsement","Mark \"Y\" because the certificate will create the coverage","List the contractor as Insurer F instead"]'::jsonb, 1, 'Additional insured status comes from an endorsement on the policy. A certificate cannot create it, so the request must go to licensed staff.', 7),
      (a, 'What is wrong with the draft?', 'Today is 05/02 of the current year. A draft shows the auto policy effective 04/15 last year and expiring 04/15 this year. The AMS shows a renewal policy with a new number starting 04/15 this year.', null, '["Auto policies cannot appear on an ACORD 25","Nothing is wrong; old policies are fine to show","It shows the expired auto policy instead of the current renewal","The effective date should always be the certificate date"]'::jsonb, 2, 'The certificate should show the current, in-force policy. The draft shows a policy that already expired.', 8),
      (a, 'Which statement about a certificate of insurance (COI) is true?', null, null, '["It can raise policy limits if the holder needs higher limits","It is evidence of coverage only and does not change the policy","It extends coverage until the holder receives a new certificate","It makes the certificate holder an additional insured"]'::jsonb, 1, 'A COI is for information only. The policy is the contract, and the certificate cannot add, extend, or change coverage.', 9),
      (a, 'Which item most needs to be fixed before the draft goes for approval?', 'Sample draft: Holder "Lakeside Event Center", address "200 Shore Rd" with no city, state, or ZIP. GL limits match the policy. SUBR WVD shows "Y" on GL, and the policy has a blanket waiver of subrogation endorsement for written contracts, which the holder''s contract requires.', null, '["The GL limits must be increased","The SUBR WVD \"Y\" must be removed","The holder must be moved to the insured box","The holder address is incomplete"]'::jsonb, 3, 'The waiver appears supported by the blanket endorsement and contract, but the holder address is missing the city, state, and ZIP code.', 10);
  end if;
end $seed$;

do $seed$
declare c uuid; a uuid;
begin
  if not exists (select 1 from public.lava_courses where slug = 'insurance-terminology') then
    insert into public.lava_courses (slug, title, summary, status, sort_order)
      values ('insurance-terminology', 'Insurance Terminologies and Abbreviations', 'Learn the most common insurance terms and abbreviations used in property and casualty agencies, each with a simple explanation and a real-world example.', 'published', 6) returning id into c;
    insert into public.lava_lessons (course_id, title, body, minutes, sort_order) values
      (c, 'Policy Basics', 'These are the words you will hear in almost every conversation at an insurance agency. Learn them first, because the other lessons build on them. Read each term slowly and try to think of your own example.

### Premium
- **Full meaning:** The amount of money the policyholder pays the insurance company for coverage.
- **Simple explanation:** The price of the insurance policy.
- **Example:** A bakery pays a $1,200 yearly premium for its business owners policy.
- **How it''s used in an agency:** Staff quote premiums, explain payment options, and note premium changes at renewal in the AMS.

### Deductible
- **Full meaning:** The amount the insured must pay out of pocket on a covered loss before the insurance company pays.
- **Simple explanation:** The part of a loss you pay yourself first.
- **Example:** A homeowner with a $1,000 deductible has a $6,000 covered loss. The carrier pays $5,000.
- **How it''s used in an agency:** Deductibles appear on quotes and declarations pages. VAs often confirm the deductible amount when preparing documents or answering basic client questions, following agency guidance.

### Coverage
- **Full meaning:** The protection a policy provides against specific losses, up to stated limits and subject to its terms.
- **Simple explanation:** What the insurance will pay for.
- **Example:** A renters policy includes coverage for the tenant''s furniture and clothing.
- **How it''s used in an agency:** Staff review what coverages a client has before issuing certificates or answering questions. Only licensed staff should give coverage advice.

### Liability
- **Full meaning:** Legal responsibility for injury to other people or damage to their property. Liability insurance pays for these claims, including legal defense, up to the limit.
- **Simple explanation:** Insurance that protects you when you are responsible for hurting someone or damaging their property.
- **Example:** A customer slips on a wet floor in a shop. The shop''s liability coverage may respond to the injury claim.
- **How it''s used in an agency:** Many certificate requests are about liability coverage, such as general liability and auto liability.

### Limit
- **Full meaning:** The maximum amount an insurance policy will pay for a covered loss, per occurrence, per person, or in total (aggregate).
- **Simple explanation:** The most the insurance company will pay.
- **Example:** A GL policy has a $1,000,000 each occurrence limit and a $2,000,000 general aggregate limit.
- **How it''s used in an agency:** Limits are shown on declarations pages and certificates. VAs check that limits on documents match the policy exactly.

### Exclusion
- **Full meaning:** A policy provision that removes certain risks, losses, or property from coverage.
- **Simple explanation:** Something the policy does not cover.
- **Example:** Many homeowners policies exclude flood damage, so a separate flood policy is needed.
- **How it''s used in an agency:** Licensed staff explain exclusions to clients. VAs should know exclusions exist and never promise a loss is covered.

### Endorsement
- **Full meaning:** A written change added to a policy that adds, removes, or modifies coverage.
- **Simple explanation:** An add-on or change to the policy.
- **Example:** An additional insured endorsement is added to a contractor''s GL policy so a general contractor gets certain protection.
- **How it''s used in an agency:** Endorsement requests are sent to the carrier by licensed staff. VAs check for endorsements before certificate wording like additional insured is used.

### Declarations Page (Dec page)
- **Full meaning:** The page, usually at the front of a policy, that summarizes the key details: named insured, policy number, policy period, coverages, limits, deductibles, and premium.
- **Simple explanation:** The summary page of the policy.
- **Example:** A client asks for proof of their home coverage limits. Staff send the current dec page.
- **How it''s used in an agency:** VAs use the dec page as a source document to check names, dates, and limits on certificates and in the AMS.

## Key takeaways
- Premium is the price; deductible is what the insured pays first on a loss.
- Coverage is what is protected; a limit is the most the policy pays; an exclusion is what is not covered.
- An endorsement changes the policy.
- The declarations page summarizes the policy and is a key source for checking documents.', 12, 1),
      (c, 'Parties to the Policy', 'An insurance policy involves several people and companies. Knowing who is who helps you file documents correctly, address emails to the right party, and read certificates with confidence.

### Policyholder
- **Full meaning:** The person or organization that owns the insurance policy and is responsible for paying the premium.
- **Simple explanation:** The owner of the policy.
- **Example:** Jose buys an auto policy for his car. Jose is the policyholder.
- **How it''s used in an agency:** The policyholder is the client in the AMS. Agencies usually make policy changes only when requested by the policyholder or an authorized person.

### Insured
- **Full meaning:** Any person or organization protected by the policy. This can include the named insured and others the policy defines as insureds.
- **Simple explanation:** Anyone the policy covers.
- **Example:** On a personal auto policy, family members living in the household may also be insureds.
- **How it''s used in an agency:** Staff read the policy definitions to understand who is an insured. VAs should not guess who is covered.

### Named Insured
- **Full meaning:** The person or business specifically named on the declarations page as the insured.
- **Simple explanation:** The exact name printed on the policy.
- **Example:** The dec page shows "Lopez Family Dental PLLC" as the named insured.
- **How it''s used in an agency:** Certificates, ID cards, and forms must show the named insured exactly as on the policy, including LLC, Inc., or DBA.

### Carrier
- **Full meaning:** The insurance company that issues the policy and pays covered claims. Also called the insurer or company.
- **Simple explanation:** The insurance company.
- **Example:** An agency places a client''s GL policy with Example Mutual Insurance Company. That company is the carrier.
- **How it''s used in an agency:** Agencies work with many carriers. VAs log in to carrier portals, download documents, and send requests according to agency procedures.

### Producer
- **Full meaning:** A licensed insurance agent or agency that sells insurance and places policies with carriers. On ACORD forms, the producer section shows the agency.
- **Simple explanation:** The licensed agent or agency that sold the policy.
- **Example:** The producer box on a certificate lists the agency''s name, address, and contact.
- **How it''s used in an agency:** Producers handle quoting and coverage advice. VAs support producers with paperwork, follow-ups, and data entry.

## Key takeaways
- The policyholder owns the policy; insureds are everyone the policy protects.
- The named insured must be written exactly as on the dec page.
- The carrier is the insurance company; the producer is the licensed agency or agent.', 10, 2),
      (c, 'Policy Dates and the Policy Lifecycle', 'Every policy has a beginning, an end, and a process before and after. These terms describe that lifecycle. Many daily VA tasks, such as renewal reminders and document checks, depend on understanding them.

### Underwriting
- **Full meaning:** The process the carrier uses to review a risk and decide whether to offer coverage, on what terms, and at what price.
- **Simple explanation:** How the insurance company decides to accept a client and sets the price.
- **Example:** An underwriter asks for three years of loss history before quoting a restaurant.
- **How it''s used in an agency:** VAs help gather underwriting information, such as applications and loss runs, and send it to the carrier for licensed staff.

### Binder
- **Full meaning:** A temporary written agreement that provides coverage until the formal policy is issued.
- **Simple explanation:** Temporary proof that coverage has started.
- **Example:** A homebuyer''s lender needs proof of insurance before closing. The agency issues a binder while the policy is being processed.
- **How it''s used in an agency:** Binders are issued only by authorized staff following carrier and agency rules. VAs track binders and follow up for the final policy.

### Effective Date
- **Full meaning:** The date and time a policy, or a change to it, begins.
- **Simple explanation:** The start date of coverage.
- **Example:** A policy is effective 03/01 this year at 12:01 a.m.
- **How it''s used in an agency:** VAs check effective dates on certificates and in the AMS and enter policy changes with the correct effective date.

### Expiration Date
- **Full meaning:** The date and time a policy ends, unless it is renewed.
- **Simple explanation:** The end date of coverage.
- **Example:** A policy effective 03/01 this year expires 03/01 next year.
- **How it''s used in an agency:** VAs track upcoming expiration dates to start renewal work and make sure certificates show current policies.

### Renewal
- **Full meaning:** Continuing a policy for a new policy period after the current one expires, often with updated terms and premium.
- **Simple explanation:** Starting a new policy term when the old one ends.
- **Example:** A business owners policy renews every year on 07/01 with a new premium.
- **How it''s used in an agency:** Agencies run renewal lists in the AMS. VAs send reminders, request updated information, and update certificates after renewal.

### Cancellation
- **Full meaning:** Ending a policy before its expiration date, either by the policyholder or the carrier, under the policy terms and applicable law.
- **Simple explanation:** Ending the policy early.
- **Example:** A client sells their car and asks to cancel the auto policy mid-term.
- **How it''s used in an agency:** Cancellation requests are documented carefully and handled per agency procedures. Notice rules vary by state and policy.

### Non-renewal
- **Full meaning:** A decision by the carrier, or the insured, not to continue a policy for another term at expiration.
- **Simple explanation:** The policy is not continued after it ends.
- **Example:** A carrier sends a notice that it will not renew a home policy because of roof condition.
- **How it''s used in an agency:** When a non-renewal notice arrives, VAs log it in the AMS and alert licensed staff so they can look for other options in time.

## Key takeaways
- Underwriting is how carriers decide on coverage and price.
- A binder is temporary proof of coverage.
- Effective and expiration dates mark the start and end of coverage.
- Renewal continues a policy; cancellation ends it early; non-renewal means it will not continue after expiration.', 12, 3),
      (c, 'Certificates and Proof of Insurance', 'Proof-of-insurance requests are among the most common VA tasks. These terms appear in emails, contracts, and on ACORD forms. Remember that a certificate only shows coverage; it never changes it.

### Certificate of Insurance (COI)
- **Full meaning:** A document that summarizes key policy information as evidence that coverage exists at a point in time.
- **Simple explanation:** Proof of insurance on one page.
- **Example:** A cleaning company needs a COI before it can work in an office building.
- **How it''s used in an agency:** VAs often prepare COI drafts in the AMS for review. Certificates are issued only by authorized staff following agency procedures.

### ACORD
- **Full meaning:** Association for Cooperative Operations Research and Development, a nonprofit that creates standard insurance forms and data standards.
- **Simple explanation:** The organization that makes standard insurance forms.
- **Example:** The ACORD 25 is the standard Certificate of Liability Insurance.
- **How it''s used in an agency:** Agencies use ACORD forms for certificates, applications, and loss notices, usually generated from the AMS.

### Certificate Holder
- **Full meaning:** The person or organization that requests and receives a certificate of insurance.
- **Simple explanation:** The party who gets the certificate.
- **Example:** A landlord asks for a certificate from a tenant''s agency. The landlord is the certificate holder.
- **How it''s used in an agency:** VAs enter the holder''s full legal name and address. Being a holder does not give coverage.

### Additional Insured (AI)
- **Full meaning:** A person or organization added to someone else''s policy by endorsement, giving them certain protection under that policy.
- **Simple explanation:** Someone added to another party''s policy for certain protection.
- **Example:** A general contractor requires a subcontractor to add it as an additional insured on the subcontractor''s GL policy.
- **How it''s used in an agency:** AI status must be supported by an endorsement. VAs check the policy and route AI requests to licensed staff.

### Waiver of Subrogation
- **Full meaning:** An agreement, provided by endorsement or policy wording, in which the carrier gives up its right to recover claim payments from a specific party.
- **Simple explanation:** The insurance company agrees not to go after a certain party to get its money back.
- **Example:** A contract requires a waiver of subrogation in favor of the property owner on a contractor''s workers'' compensation policy.
- **How it''s used in an agency:** This appears as SUBR WVD on the ACORD 25. It must be supported by the policy, and requests go to licensed staff.

## Key takeaways
- A COI is evidence of coverage only.
- ACORD creates the standard forms used for certificates.
- A certificate holder receives proof; an additional insured has certain coverage by endorsement.
- A waiver of subrogation must be supported by the policy.', 10, 4),
      (c, 'Policy Types and Lines of Business', 'Agencies sell many kinds of insurance. Each kind is a line of business. This lesson covers the common policy types and abbreviations you will see in the AMS, on certificates, and in emails. Coverage details always depend on the specific policy and carrier forms.

### Line of Business (LOB)
- **Full meaning:** A category of insurance, such as personal auto, homeowners, general liability, or workers'' compensation.
- **Simple explanation:** A type of insurance.
- **Example:** A client has three LOBs with the agency: GL, commercial auto, and WC.
- **How it''s used in an agency:** The AMS organizes policies by LOB. VAs pick the right LOB when filing documents or creating activities.

### General Liability (GL or CGL)
- **Full meaning:** Commercial General Liability insurance, which protects a business against claims of bodily injury, property damage, and personal and advertising injury to others.
- **Simple explanation:** Business insurance for injuries or damage to other people.
- **Example:** A painter accidentally damages a client''s floor. The painter''s GL policy may respond.
- **How it''s used in an agency:** GL is the most common coverage on ACORD 25 certificates.

### Business Owners Policy (BOP)
- **Full meaning:** A package policy for small to mid-size businesses that combines property and general liability coverage, often with business income coverage.
- **Simple explanation:** A bundle of property and liability insurance for small businesses.
- **Example:** A small coffee shop buys a BOP to cover its equipment and its liability.
- **How it''s used in an agency:** VAs see BOPs often for small business clients. On a certificate, the liability part of a BOP is shown in the GL row.

### HO3
- **Full meaning:** Homeowners Special Form. It generally covers the dwelling on an open-perils basis and personal property on a named-perils basis, subject to exclusions.
- **Simple explanation:** The most common homeowners policy for a house the owner lives in.
- **Example:** A family that owns their house has an HO3 policy.
- **How it''s used in an agency:** VAs see HO3 on quotes and dec pages for personal lines clients and may prepare evidence of insurance for lenders, following agency procedures.

### HO4
- **Full meaning:** Renters or Tenant Form. It covers the renter''s personal property and personal liability, but not the building.
- **Simple explanation:** Renters insurance.
- **Example:** An apartment tenant buys an HO4 to cover their furniture and electronics.
- **How it''s used in an agency:** Landlords often ask tenants for proof of renters insurance, which VAs may help send.

### HO6
- **Full meaning:** Condominium Unit Owners Form. It covers the owner''s personal property, liability, and parts of the unit not covered by the condo association''s master policy.
- **Simple explanation:** Insurance for condo owners.
- **Example:** A condo owner buys an HO6 to cover interior walls, cabinets, and belongings.
- **How it''s used in an agency:** VAs may request the association''s master policy information when supporting HO6 quotes.

### Umbrella
- **Full meaning:** A policy that provides extra liability limits above underlying policies such as GL, auto, or homeowners, and sometimes broader coverage. Excess liability is similar but usually follows the underlying policy terms.
- **Simple explanation:** Extra liability protection on top of other policies.
- **Example:** A contractor with a $1,000,000 GL policy adds a $2,000,000 umbrella to meet a contract requirement.
- **How it''s used in an agency:** Umbrella policies appear in their own row on the ACORD 25. VAs check that underlying policies are in place and dates line up.

### Workers'' Compensation (WC)
- **Full meaning:** Insurance that pays medical costs and lost wages for employees injured on the job, according to state law. It usually includes employers'' liability coverage.
- **Simple explanation:** Insurance for employees hurt at work.
- **Example:** A warehouse worker hurts their back lifting boxes. The employer''s WC policy pays benefits.
- **How it''s used in an agency:** WC rules vary by state. VAs help collect payroll and employee information for audits and renewals.

### Errors and Omissions (E&O)
- **Full meaning:** Professional liability insurance that protects against claims of mistakes, negligence, or failure to perform professional services.
- **Simple explanation:** Insurance for professional mistakes.
- **Example:** An accountant is sued for a tax filing error. The accountant''s E&O policy may respond.
- **How it''s used in an agency:** Agencies sell E&O to professionals and also carry their own E&O. Careful documentation in the AMS helps protect the agency.

## Key takeaways
- LOB means line of business, a type of insurance.
- GL and BOP are common business policies; HO3, HO4, and HO6 are home, renters, and condo forms.
- Umbrella adds extra liability limits; WC covers injured employees; E&O covers professional mistakes.
- Coverage details depend on the specific policy and can vary by carrier and state.', 14, 5),
      (c, 'Auto Insurance Terms', 'Auto insurance has its own vocabulary. These terms appear on auto applications, ID cards, and policy changes. Some auto coverages and requirements are different from state to state, so always follow the policy and agency guidance.

### Motor Vehicle Record (MVR)
- **Full meaning:** A driving history report from a state motor vehicle agency showing violations, accidents, and license status.
- **Simple explanation:** A driver''s driving record.
- **Example:** An MVR shows a driver had a speeding ticket last year.
- **How it''s used in an agency:** Carriers and agencies order MVRs during underwriting, following privacy rules. VAs may help collect driver license details for this process.

### Vehicle Identification Number (VIN)
- **Full meaning:** A unique 17-character code that identifies a specific vehicle.
- **Simple explanation:** The vehicle''s unique ID number.
- **Example:** A client adds a new truck, and the agency needs the VIN to add it to the policy.
- **How it''s used in an agency:** VAs enter and double-check VINs carefully. One wrong character can mean the wrong vehicle is listed.

### Personal Injury Protection (PIP)
- **Full meaning:** Auto coverage that pays medical expenses and sometimes lost wages for the driver and passengers after an accident, regardless of fault, in states that offer or require it.
- **Simple explanation:** Medical coverage for you and your passengers after a car accident, no matter who caused it.
- **Example:** After a crash, PIP helps pay the driver''s hospital bills.
- **How it''s used in an agency:** PIP availability and requirements vary by state. VAs should not explain PIP rules; they route questions to licensed staff.

### Uninsured / Underinsured Motorist (UM/UIM)
- **Full meaning:** Auto coverage that protects the insured when the at-fault driver has no insurance (uninsured) or not enough insurance (underinsured).
- **Simple explanation:** Protection when the other driver has no insurance or too little.
- **Example:** A client is hit by a driver with no insurance. The client''s UM coverage may help pay for injuries.
- **How it''s used in an agency:** UM/UIM options and forms vary by state. Signed selection or rejection forms are saved in the AMS according to agency procedures.

## Key takeaways
- MVR is a driving record; VIN is a vehicle''s unique ID.
- PIP pays medical costs regardless of fault where available.
- UM/UIM protects when the other driver has no or too little insurance.
- Auto rules vary by state, so route coverage questions to licensed staff.', 10, 6),
      (c, 'Agency Systems, Claims, and Billing', 'This lesson covers the tools agencies use every day and the words related to claims and billing. Knowing these terms helps you work faster in agency software and communicate clearly with clients and carriers.

### Agency Management System (AMS)
- **Full meaning:** Software that stores client records, policies, documents, activities, and accounting for an insurance agency.
- **Simple explanation:** The main computer system where the agency keeps all client and policy information.
- **Example:** A VA opens the AMS to find a client''s policy number and generate a certificate.
- **How it''s used in an agency:** VAs use the AMS for data entry, document filing, certificates, renewals, and activity notes. Accurate entries are very important.

### Customer Relationship Management (CRM)
- **Full meaning:** Software used to track contacts, leads, communication, and follow-ups with clients and prospects.
- **Simple explanation:** A system for managing relationships and follow-ups with customers.
- **Example:** The CRM reminds a VA to follow up with a prospect who asked for a quote.
- **How it''s used in an agency:** Some agencies use a separate CRM; others use CRM features inside the AMS. VAs log calls and emails and set follow-up tasks.

### Claim
- **Full meaning:** A request by an insured or a third party for payment under an insurance policy after a loss.
- **Simple explanation:** Asking the insurance company to pay for a loss.
- **Example:** A client''s delivery van is damaged in an accident, so a claim is filed with the carrier.
- **How it''s used in an agency:** VAs may help report a claim to the carrier, collect details, and track claim status, following agency procedures. They do not decide whether a claim is covered.

### Loss Run
- **Full meaning:** A report from a carrier showing the claim history on a policy over a period of time, including dates, amounts paid, and open or closed status.
- **Simple explanation:** A list of past claims on a policy.
- **Example:** A new carrier asks for five years of loss runs before quoting a trucking company.
- **How it''s used in an agency:** VAs request loss runs from carriers, often for renewals or new quotes, and save them in the AMS.

### Direct Bill and Agency Bill
- **Full meaning:** Two billing methods. With direct bill, the carrier bills and collects premium from the insured. With agency bill, the agency bills the insured and pays the carrier.
- **Simple explanation:** Who sends the bill: the insurance company or the agency.
- **Example:** A homeowner receives invoices directly from the carrier, so the policy is direct bill.
- **How it''s used in an agency:** VAs check the billing method in the AMS before answering payment questions or sending reminders.

## Key takeaways
- The AMS is the main agency system; a CRM tracks relationships and follow-ups.
- A claim is a request for payment after a loss; VAs support but do not decide coverage.
- A loss run is a claim history report used for renewals and new quotes.
- Direct bill means the carrier bills the client; agency bill means the agency does.', 12, 7);
  else
    select id into c from public.lava_courses where slug = 'insurance-terminology';
  end if;
  if not exists (select 1 from public.lava_assessments where slug = 'insurance-terminology-quiz') then
    insert into public.lava_assessments (slug, course_id, kind, title, description, pass_percent, status, sort_order)
      values ('insurance-terminology-quiz', c, 'quiz', 'Insurance Terminology Quiz', 'Test your knowledge of common insurance terms and abbreviations used in agencies.', 70, 'published', 6) returning id into a;
    insert into public.lava_questions (assessment_id, prompt, scenario, context, options, answer, explanation, sort_order) values
      (a, 'What is a premium?', null, null, '["The most a policy will pay for a loss","The price paid for an insurance policy","The amount the insured pays first on a loss","A written change to the policy"]'::jsonb, 1, 'The premium is the price of the policy. The deductible is what the insured pays first, and the limit is the most the policy pays.', 1),
      (a, 'How much would the carrier generally pay?', 'A client has a $500 deductible on their auto physical damage coverage. A covered accident causes $3,000 in damage.', null, '["$500","$2,500","$3,500","$3,000"]'::jsonb, 1, 'The insured pays the $500 deductible, so the carrier generally pays the remaining $2,500 of the covered loss.', 2),
      (a, 'Which document is the summary page showing the named insured, policy period, coverages, limits, and premium?', null, null, '["MVR","Declarations page","Binder","Loss run"]'::jsonb, 1, 'The declarations (dec) page summarizes the key details of the policy.', 3),
      (a, 'What does HO4 refer to?', null, null, '["Condominium unit owners insurance","Homeowners special form for a house","Renters (tenant) insurance","Workers'' compensation for home workers"]'::jsonb, 2, 'HO4 is the renters or tenant form. HO3 is the homeowners special form and HO6 is for condo unit owners.', 4),
      (a, 'What does being the certificate holder mean?', 'A landlord receives a certificate of insurance from a tenant''s agency and is listed in the certificate holder box.', null, '["The landlord receives proof of insurance but gets no coverage from being listed","The landlord can cancel the policy","The landlord must pay part of the premium","The landlord is now an additional insured"]'::jsonb, 0, 'A certificate holder only receives evidence of coverage. Additional insured status requires an endorsement on the policy.', 5),
      (a, 'A new carrier asks for a report showing the client''s past claims over five years. What document is this?', null, null, '["Endorsement","Loss run","Binder","Declarations page"]'::jsonb, 1, 'A loss run is a carrier report of claim history, often needed for renewals and new quotes.', 6),
      (a, 'What does AMS stand for in an insurance agency?', null, null, '["Automated Mortgage Service","Additional Member Schedule","Annual Minimum Surcharge","Agency Management System"]'::jsonb, 3, 'The AMS is the Agency Management System, the main software for client, policy, and document records.', 7),
      (a, 'Which term describes this?', 'A carrier sends a notice saying it will not continue a client''s home policy when the current term ends next month.', null, '["Renewal","Non-renewal","Cancellation","Endorsement"]'::jsonb, 1, 'Non-renewal means the policy will not continue after expiration. Cancellation ends a policy before its expiration date.', 8),
      (a, 'Which coverage protects the insured when the at-fault driver has no insurance or not enough insurance?', null, null, '["PIP","WC","E&O","UM/UIM"]'::jsonb, 3, 'Uninsured/Underinsured Motorist (UM/UIM) coverage applies when the other driver has no or too little insurance.', 9),
      (a, 'Which document provides temporary coverage until the policy is issued?', 'A homebuyer''s lender needs proof of insurance today, but the formal policy will not be issued for a few weeks.', null, '["Binder","Exclusion","Loss run","MVR"]'::jsonb, 0, 'A binder is a temporary agreement providing coverage until the formal policy is issued, and only authorized staff may issue it.', 10);
  end if;
end $seed$;

do $seed$
declare a uuid;
begin
  if not exists (select 1 from public.lava_assessments where slug = 'simulator-coi-request-desk') then
    insert into public.lava_assessments (slug, kind, title, description, pass_percent, status, sort_order)
      values ('simulator-coi-request-desk', 'simulator', 'Certificate Request Desk', 'Work through a certificate of insurance request from a commercial client, from the first email to the hand-off for approval.', 70, 'published', 101) returning id into a;
    insert into public.lava_questions (assessment_id, prompt, scenario, context, options, answer, explanation, sort_order) values
      (a, 'Which form is normally used to provide this proof of liability coverage?', null, '{"kind":"email","title":"Inbox","fields":[["From","Dana Ruiz <dana@brightpathlandscaping.example>"],["Subject","Need a COI for the Oakridge project"],["Received","Mon 9:12 AM"]],"body":"Hi team,\n\nThe general contractor on our Oakridge Mall job needs proof of our liability insurance before we can start next Monday. They want to be listed as additional insured.\n\nCertificate holder: Summit Builders LLC, 400 Commerce Way, Austin, TX 78701.\n\nThanks!\nDana"}'::jsonb, '["ACORD 25 – Certificate of Liability Insurance","ACORD 27 – Evidence of Property Insurance","ACORD 28 – Evidence of Commercial Property Insurance","An auto ID card"]'::jsonb, 0, 'The request is for proof of liability coverage for a certificate holder, which is what the ACORD 25 is designed for.', 1),
      (a, 'Before preparing the certificate, what is the most important thing to confirm about the additional insured request?', null, '{"kind":"record","title":"Agency system · Client: Brightpath Landscaping LLC","fields":[["Client code","BRIGLAN-01"],["General Liability","Policy GL-448120 · 03/01/2026 – 03/01/2027 · Active"],["Commercial Auto","Policy CA-77215 · 01/15/2026 – 01/15/2027 · Active"],["Workers Comp","Policy WC-30981 · 11/01/2025 – 11/01/2026 · Active"],["Endorsements on GL","CG 20 10 – Additional Insured (blanket, written contract)"]]}'::jsonb, '["That the client has paid this month’s invoice","That the policy actually includes an additional insured endorsement that applies to this holder","That the holder’s address is in the same state as the client","That the certificate is printed on letterhead"]'::jsonb, 1, 'A certificate cannot add coverage. Additional insured status must come from an endorsement on the policy, so you check the endorsement first.', 2),
      (a, 'Compare the draft with the agency system record from the previous screen. What needs to be corrected?', null, '{"kind":"form","title":"ACORD 25 draft · Coverages section","fields":[["INSR LTR A","Commercial General Liability · GL-448120 · 03/01/2026 – 03/01/2027"],["INSR LTR B","Automobile Liability · CA-77215 · 01/15/2025 – 01/15/2026"],["INSR LTR C","Workers Compensation · WC-30981 · 11/01/2025 – 11/01/2026"]]}'::jsonb, '["The GL policy number is wrong","The auto policy dates show last year’s term instead of the current 01/15/2026 – 01/15/2027 term","Workers compensation should never appear on an ACORD 25","Nothing, the draft matches the record"]'::jsonb, 1, 'The commercial auto line shows the expired 2025–2026 term. Certificates must show the current policy term from the system record.', 3),
      (a, 'What is the correct way to handle this request?', null, '{"kind":"email","title":"Follow-up email","fields":[["From","Dana Ruiz"],["Subject","RE: Need a COI for the Oakridge project"]],"body":"One more thing: Summit says their contract requires \"primary and non-contributory\" wording and a 30-day notice of cancellation. Can you just type that into the description box?"}'::jsonb, '["Type the wording exactly as requested so the client can start on Monday","Refuse the request and tell the client it is impossible","Check whether the policy has endorsements that support the wording, and route the request to the licensed account manager to decide","Remove the additional insured box so the wording is not needed"]'::jsonb, 2, 'Wording on a certificate must be supported by the policy. A VA checks the endorsements and escalates to licensed staff instead of adding unsupported wording.', 4),
      (a, 'Compare the holder box with Dana’s first email. What is wrong?', null, '{"kind":"form","title":"ACORD 25 draft · Certificate holder","fields":[["Certificate holder","Summit Builders, 400 Commerce Way, Austin, TX 78701"],["Description of operations","Landscaping services at Oakridge Mall project"]]}'::jsonb, '["The legal name is incomplete: it should be “Summit Builders LLC”","The ZIP code should be removed","The description of operations must be blank","The holder should be Brightpath Landscaping LLC"]'::jsonb, 0, 'The certificate holder’s legal name must match the request exactly, including “LLC”.', 5),
      (a, 'The draft is corrected. What is the right next step for the VA?', null, '{"kind":"note","title":"Agency procedure","body":"Certificates with additional insured or special wording requests must be reviewed and released by a licensed account manager. Save the draft and request to the client file and create an activity for review."}'::jsonb, '["Email the certificate to the holder immediately","Save the draft and the client’s emails to the client file, then create a review activity for the licensed account manager","Delete the draft and start over","Ask the client to sign the certificate"]'::jsonb, 1, 'Following agency procedure, the VA documents the request and routes it to licensed staff for review and release.', 6);
  end if;
end $seed$;

do $seed$
declare a uuid;
begin
  if not exists (select 1 from public.lava_assessments where slug = 'simulator-agency-system-navigation') then
    insert into public.lava_assessments (slug, kind, title, description, pass_percent, status, sort_order)
      values ('simulator-agency-system-navigation', 'simulator', 'Agency System Navigation', 'Practice finding the right customer record, avoiding duplicates, filing documents and leaving clear notes in a simulated agency management system.', 70, 'published', 102) returning id into a;
    insert into public.lava_questions (assessment_id, prompt, scenario, context, options, answer, explanation, sort_order) values
      (a, 'What is the most reliable first search to find her record?', null, '{"kind":"note","title":"Phone message","body":"Caller: Maria Gomez. Says she received a renewal notice for her home policy and wants to know the new premium. Callback: (512) 555-0148."}'::jsonb, '["Search only by first name “Maria”","Search by her phone number or full name, then confirm with a second detail such as address or policy number","Create a new client record to save time","Search the carrier’s website instead"]'::jsonb, 1, 'Searching by a unique detail and confirming with a second one avoids opening the wrong customer’s record.', 1),
      (a, 'Which record belongs to the caller?', null, '{"kind":"record","title":"Search results for “Gomez”","fields":[["1","Maria Gomez · 18 Pine St, Austin TX · (512) 555-0148 · HO3 policy HO-221907"],["2","Maria L. Gomez · 2201 Oak Ave, Dallas TX · (214) 555-0190 · Auto policy PA-55102"],["3","Mario Gomez · 18 Pine St, Austin TX · (512) 555-0148 · Auto policy PA-60411"]]}'::jsonb, '["Result 1","Result 2","Result 3","None of them; create a new record"]'::jsonb, 0, 'Result 1 matches her name, phone number and the home (HO3) policy she called about.', 2),
      (a, 'Maria asks why her premium went up and whether she should raise her deductible. What should the VA do?', null, '{"kind":"record","title":"Policy HO-221907 · Maria Gomez","fields":[["Carrier","Lone Star Mutual (fictional)"],["Line of business","Homeowners (HO3)"],["Term","12/05/2025 – 12/05/2026"],["Status","Renewal offered"],["Renewal premium","$2,184 (current term: $1,962)"],["Note","Renewal questions about coverage changes go to licensed agent"]]}'::jsonb, '["Tell her the renewal premium shown in the system, and route her coverage and deductible questions to a licensed agent","Recommend a higher deductible to lower her premium","Tell her premiums never change at renewal","Cancel the renewal so she can shop around"]'::jsonb, 0, 'A VA can share factual information from the record, but advice about coverage or deductibles must come from a licensed agent.', 3),
      (a, 'How should these attachments be filed?', null, '{"kind":"email","title":"Inbox","fields":[["From","Maria Gomez"],["Subject","Photos of new roof"],["Attachment","IMG_4471.jpg, IMG_4472.jpg"]],"body":"Hi, here are the photos of our new roof that the insurance company asked for."}'::jsonb, '["Save them to your own computer’s Downloads folder","Attach them to Maria’s HO3 policy in the system with a clear description such as “Roof photos – new roof – received from insured”","Attach them to Mario Gomez’s auto policy because the address matches","Forward them to all agency staff"]'::jsonb, 1, 'Documents belong in the correct client and policy, with a clear description so anyone can find them later.', 4),
      (a, 'Which activity note best follows good documentation practice?', null, '{"kind":"form","title":"New activity note","fields":[["Client","Maria Gomez"],["Policy","HO-221907"],["Draft note","called"]]}'::jsonb, '["“called”","“Spoke with insured, all good”","“Insured called 11/03 re renewal premium. Gave renewal premium $2,184. Deductible question routed to licensed agent J. Park; follow-up due 11/05. Roof photos received and attached to policy.”","“Customer was upset, see me”"]'::jsonb, 2, 'A good note says who, when, what was discussed, what was done and what happens next.', 5),
      (a, 'What is the best way to make sure this follow-up is not forgotten?', null, '{"kind":"note","title":"Task list","body":"The licensed agent asked you to make sure Maria gets a call back in two days if she has not heard from the agency."}'::jsonb, '["Try to remember it","Write it on a sticky note","Create a follow-up task (diary/activity) on her record, due in two days and assigned to the right person","Ask Maria to call back if nobody calls her"]'::jsonb, 2, 'Follow-ups belong in the system as dated, assigned tasks so they are tracked even if you are away.', 6);
  end if;
end $seed$;

do $seed$
declare a uuid;
begin
  if not exists (select 1 from public.lava_assessments where slug = 'simulator-policy-service-workflow') then
    insert into public.lava_assessments (slug, kind, title, description, pass_percent, status, sort_order)
      values ('simulator-policy-service-workflow', 'simulator', 'Policy Service Workflow', 'Handle everyday service requests (adding a vehicle, an ID card, a cancellation and a loss run) and decide what a VA can do and what needs a licensed professional.', 70, 'published', 103) returning id into a;
    insert into public.lava_questions (assessment_id, prompt, scenario, context, options, answer, explanation, sort_order) values
      (a, 'Which detail do you most need from Kevin before a policy change request can be prepared?', null, '{"kind":"email","title":"Inbox","fields":[["From","Kevin Tran"],["Subject","Add my new car"]],"body":"Hi! I just bought a 2024 Honda CR-V and want to add it to my auto policy today. Thanks!"}'::jsonb, '["His favorite color","The vehicle identification number (VIN), purchase date, and any lienholder or lender information","His employer’s phone number","A photo of his driver’s license only"]'::jsonb, 1, 'The VIN identifies the exact vehicle, and the purchase date and lienholder details are needed for the change and for the ID card or lender proof.', 1),
      (a, 'A VIN is 17 characters. The VIN in the draft has 16. What should you do?', null, '{"kind":"record","title":"Endorsement request draft","fields":[["Policy","PA-60411"],["Change","Add vehicle"],["Vehicle","2024 Honda CR-V"],["VIN","7FARW2H8XRE01234"],["Coverages","Copy from current vehicle?"]]}'::jsonb, '["Submit it anyway; the carrier will fix it","Guess the missing character","Contact the customer (or check the purchase documents) to confirm the full 17-character VIN before submitting","Delete the request"]'::jsonb, 2, 'Accurate data entry matters: an incorrect VIN can cause the wrong vehicle to be rated or insured. Confirm it with the source.', 2),
      (a, 'How should the VA respond?', null, '{"kind":"note","title":"Phone message","body":"Kevin asks which coverages he should choose for the new car and whether he needs collision."}'::jsonb, '["Recommend full coverage because the car is new","Tell him collision is never worth it","Explain that a licensed agent will review coverage options with him, and route the question with a note","Copy the coverages of his oldest car without asking"]'::jsonb, 2, 'Recommending coverages is advice that must come from a licensed agent. The VA routes the question with clear notes.', 3),
      (a, 'What is the correct VA action for a cancellation request?', null, '{"kind":"email","title":"Inbox","fields":[["From","Priya Shah"],["Subject","Cancel my renters policy"]],"body":"Please cancel my renters insurance effective today. I moved in with my sister."}'::jsonb, '["Cancel it immediately in the system","Ignore the email","Acknowledge the request, record it in her file, and route it to licensed staff following agency procedure (a signed cancellation request may be required)","Tell her renters policies cannot be cancelled"]'::jsonb, 2, 'Cancellations have rules (signatures, effective dates, refunds) and are handled per agency procedure by authorized staff. The VA acknowledges, documents and routes the request.', 4),
      (a, 'What is a loss run?', null, '{"kind":"email","title":"Inbox","fields":[["From","Lisa Park, Northside Bakery LLC"],["Subject","Loss runs"]],"body":"We are shopping our insurance and a new agent asked for our loss runs for the last 5 years."}'::jsonb, '["A list of payments the client missed","A report from the carrier showing the claims history of a policy over a period of time","A form to cancel a policy","A certificate of insurance"]'::jsonb, 1, 'Loss runs are carrier reports of claims history. They are commonly requested when a business is quoting with other insurers.', 5),
      (a, 'Kevin emails asking for a new ID card right away, but the vehicle change has not been processed yet. What should the VA say?', null, '{"kind":"record","title":"Client file · Kevin Tran","fields":[["Requests today","Add vehicle (pending VIN) · Coverage question (routed to licensed agent) · ID card for new vehicle (after change is processed)"]]}'::jsonb, '["Send the old ID card with the new car’s details typed in","Let him know the ID card will be sent as soon as the change is processed, and give him a realistic follow-up time","Tell him he does not need an ID card","Make up a temporary policy number"]'::jsonb, 1, 'Never alter or invent insurance documents. Set clear expectations and follow up when the change is processed.', 6);
  end if;
end $seed$;

