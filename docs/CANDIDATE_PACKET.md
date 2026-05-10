# Recover Systems — Candidate Packet — Beacon Fire & Safety

> Industry: Fire & Life Safety Inspection, Testing & Maintenance (ITM)
> Jurisdiction: City of Hartwell, Massachusetts (fictional, modeled on real city dynamics)
> Time expectation: 5–7 days, evening/weekend work assumed

## How to use this packet

The scenario, the company, and the people are fictional. The dynamics are not. Fire and life safety inspection compliance is a real industry with a real regulatory stack and real software gaps that we face in our industry.

You are encouraged to use AI tools throughout this exercise. You are encouraged to research the real-world parallels.

## Sequence

- **Step 1** — Read the packet. Cross-reference. The artifacts contradict each other in places. Some contradictions are obvious. Some are not.
- **Step 2** — Identify the failure point. Not the fire. The failure point in the operational system that allowed the fire's aftermath to play out the way it did. There is more than one defensible answer.
- **Step 3** — Define a wedge product or just a feature or a whole platform. A wedge is the smallest thing you could build first that creates real leverage and unlocks expansion. "A platform for fire inspection contractors" is not a wedge. "The impairment management workflow that produces audit-ready records the moment a system goes offline" is closer.
- **Step 4** — Build a prototype. We care about whether you can express your thinking through a build, not whether you can ship production code in five days.
- **Step 5** — Submit it with a breakdown and an argument.

## What we are looking for

Someone who can sit across the table from a stakeholder in a complicated regulated industry, walk away with the actual workflow in their head, and design and build the smallest possible product that compresses six broken tools into one screen the field operator actually wants to use. We are looking for the rare candidate who treats messy domains as design problems rather than requirements to transcribe.

## Industry primer

Fire and life safety inspection, testing, and maintenance (ITM) is a regulated trade at the intersection of fire codes, building codes, and property insurance. Every commercial building, multi-family residential, school, hospital, and most warehouses in the U.S. is subject to mandatory inspection of its fire protection systems on cadences ranging from monthly to every five years. The work is governed primarily by NFPA standards — most importantly NFPA 25 (water-based systems), NFPA 72 (fire alarm), NFPA 80 (fire doors), NFPA 96 (cooking equipment), and NFPA 10 (extinguishers).

Inspections are performed by licensed contractors. Verification is done by the local Authority Having Jurisdiction (AHJ) — usually the city or county fire marshal. Documentation is consumed by AHJs, by property insurance carriers as a condition of underwriting, and by building owners and their property managers.

### The three-layer regulatory stack

Compliance is determined by three overlapping authorities, not one.

**Layer 1 — NFPA standards.** NFPA publishes the technical standards. Editions are revised on rolling cycles, typically every three to five years.

**Layer 2 — AHJ adoption and interpretation.** Cities and states do not automatically follow the latest NFPA standard. Each jurisdiction adopts a specific edition through legislative or administrative action. A contractor working across three cities may be held to NFPA 25-2014 in one, NFPA 25-2017 in another, and NFPA 25-2020 in a third — at the same address, on the same day, depending on which line on the map they crossed. AHJs also have explicit authority to interpret requirements. Interpretations rarely live in any centralized database. They live in PDFs on city websites and in the heads of veteran inspectors.

**Layer 3 — Insurance carrier requirements.** Property insurance carriers underwrite buildings against fire loss and impose their own documentation requirements as a condition of coverage. Recommendations are technically advisory but functionally mandatory: ignoring them affects premium, can trigger non-renewal, and can be used against the insured during a claim.

A building can be 100% code-compliant, signed off by the AHJ, and still have its insurance non-renewed. An inspection contractor's records have to satisfy three audiences with three different standards, often using one report.

### Stakeholders

- **Building owner** — pays for the inspection, holds the property insurance, carries the liability.
- **Property management company** — the day-to-day customer for an inspection contractor; schedules inspections, receives reports, follows up on deficiencies (or doesn't).
- **Inspection contractor** — performs ITM, generates reports, identifies deficiencies, often performs the repairs.
- **AHJ** — performs separate routine inspections, responds to complaints, issues notices of violation.
- **Insurance carrier** — underwrites the property, performs loss control surveys, demands documentation.
- **State fire marshal's office** — separate from city AHJs, with its own authority around licensing and fire investigation.
- **Tenants** — a tenant complaint can trigger an AHJ inspection; post-incident, tenants are aggressive plaintiffs.
- **Subrogation attorneys** — the carriers' lawyers, whose job after a fire is to find someone to recover from. The inspection contractor is a frequent target.

### How money and time actually move

Inspection contracts are usually annual, with quarterly or monthly visits depending on system type. Contractors price low on the inspection itself and make their margin on the repair work generated by the deficiencies they find. This creates a soft conflict of interest the industry has never resolved: the contractor identifying the problem is often the contractor profiting from the fix.

Deficiencies fall into two categories: critical and non-critical. Critical deficiencies require immediate corrective action and AHJ notification; non-critical deficiencies have remediation timelines defined by code or local rule. When a system is taken out of service for repair, the building enters "impairment" — a defined regulatory state with strict procedural requirements: AHJ notification, fire watch posting, documentation of start and end time, re-inspection upon restoration. **Impairments are where the most expensive failures happen, and where the documentation is weakest.**

### Why software is bad here

The current ITM software landscape is dominated by aging compliance-document-generators (BuildingReports, InspectPoint, and competitors). These tools were built for inspection report generation and have grown into broader workflow tools without being redesigned for modern operational reality. They handle the routine 80% adequately. They handle the regulated, high-stakes 20% — impairments, deficiency-to-repair lifecycle, multi-jurisdiction complexity, insurance carrier evidence preparation, post-incident records production — poorly or not at all. **That gap is what this exercise asks you to reason about.**

## The scenario

Twelve days ago, a fire occurred at Cedar Heights Apartments — a 12-story, 142-unit residential building in Hartwell, Massachusetts. The fire originated on the 9th floor (cause presumed kitchen-related), spread to one neighboring unit, and triggered the wet sprinkler system on that floor. The sprinklers performed; the fire was suppressed before the fire department arrived. Two units are uninhabitable, several have water damage, and one resident sustained minor smoke inhalation injuries. No fatalities.

The investigation is just starting. What is already underway, before any cause has been determined, is a coordinated demand for inspection records from every direction at once.

### Beacon Fire & Safety

Beacon is a regional fire protection contractor headquartered in Hartwell. They perform ITM on water-based systems (sprinklers, standpipes, fire pumps), fire alarms, fire doors, kitchen suppression, and emergency lighting. They operate across three jurisdictions: Hartwell (largest), Wessex, and Dunmoor. Beacon has held the Cedar Heights inspection contract for four years.

In the twelve days since the fire, the following have contacted Beacon:

- The **City of Hartwell Fire Marshal**, requesting three years of ITM records and issuing a Notice of Violation pending review
- **Continental Mutual Property** (the building's insurer), requesting the same records via their loss control engineer with a 21-day response window
- **Worth, Patel & Associates**, the law firm handling Continental Mutual's subrogation, demanding 19 specific documents under preservation hold
- **Halberd Realty Holdings** (the building owner), demanding records and threatening to terminate
- **Steeplechase Property Management**, asking what to tell residents and press
- **Beacon's own E&O carrier**, requesting Beacon's complete file
- The **Massachusetts State Fire Marshal**, opening a parallel inquiry separate from the city's
- **Two other property managers** Beacon works with, politely asking to see their own records to confirm they're not in the same situation

### Where you come in

You are a product builder who has been given access to the company's records and stakeholders, and asked to look at how this business actually operates and where software could compress, structure, or prevent the kind of failure cascade now unfolding.

The fire is the forcing event but it is not your problem to solve. Your problem is the operational system the fire revealed. **Your wedge does not need to prevent fires.**

## Stakeholder cast (key voices)

### Beacon

- **Tom Beacon — Owner.** Second-generation. Mid-fifties. Runs the business out of his head and his truck. Has resisted modernizing back-office systems for years. Trusted by AHJs who have known him for decades. Carries a low-grade, permanent anxiety about liability that he doesn't often name out loud.
- **Mike DiSalvo — Lead Technician.** Thirty-one years in the trade. Knows code better than anyone in the office. Hates paperwork. Believes — correctly, in many cases — that the inspection report formats provided by software vendors don't reflect what's actually important to look at. Has developed his own shorthand and his own informal triage system over three decades. Trains the younger techs through ride-alongs rather than documentation. The institutional knowledge of Beacon Fire & Safety lives mostly in his head.
- **Linda Park — Office Manager.** Joined Beacon in 2014. The de facto compliance officer, scheduler, customer-service manager, accounts receivable clerk, and document coordinator. Drowning. Is the only person at Beacon who has a clear-eyed view of what the company can and cannot prove from its records, and that view is not reassuring.

### Cedar Heights ownership

- **Robert Halberd — Building Owner.** Halberd Realty Holdings. Largely absentee. Cost-conscious and litigious. Got out of bed for this fire.
- **Jenna Cortez — Compliance Lead, Steeplechase.** Manages compliance across 47 properties. Maintains her own tracking spreadsheet because none of the contractor portals are good enough. Will be asked under oath whether she knew about deficiencies that were never closed.

### AHJ

- **Marshal Elena Reyes — City of Hartwell Fire Marshal.** Twenty-five years in the fire service. Took the office in a more documentation-heavy direction than her predecessor. Knows Tom Beacon by name. The relationship will not survive much more.
- **Marshal Frank Donnelly — Retired predecessor.** Old-school. Issued informal interpretation letters that the city now treats as informally binding even though some of his interpretations conflict with Reyes's. A ghost in this exercise but a relevant one.

### Insurance / counsel

- **Karen Fielding — Loss Control Engineer, Continental Mutual.** Engineer by training. Issued a survey on Cedar Heights fourteen months pre-incident with several open recommendations. Will not be the one accusing Beacon of anything, but her survey is going to get cited by people who will be.
- **James Worth — Subrogation counsel for Continental Mutual.** Aggressive but not unprofessional. The records request he sent Beacon is not a fishing expedition; it is targeted.

### State

- **Investigator Sarah Chen — Massachusetts State Fire Prevention Bureau.** Wildcard. Her involvement is what would convert a localized problem into a broader regulatory matter.

## The artifacts (summarized)

### Artifact 1 — Notice of Violation, Day +12

Marshal Reyes cites five deficiencies on Day +6 post-incident inspection, several appearing to be pre-existing and not in Beacon's reports:

1. **Fire pump performance** — Annual NFPA 25 §8.3.3 records on file reflect satisfactory performance; independent testing on Day +6 indicates a 18% churn pressure differential below original certification — outside tolerance, **critical deficiency**.
2. **Main drain test** — NFPA 25 §13.2.5 requires main drain test annually and following any impairment lasting >4 hours. **No record of a main drain test following the documented impairment of the 9th-floor zone on Day −116.** Most recent main drain on file is Day −387.
3. **Standpipe hose connection** — 9th-floor west stairwell exhibits visible corrosion consistent with progressive deterioration over months. **Not in any ITM report submitted in the last 24 months.**
4. **Fire alarm battery backup** — Manufacturer plate on installed batteries does not match manufacturer specs in Beacon's ITM reports of record.
5. **Impairment notification** — Documented impairment Day −116. **No record of impairment notification to AHJ as required under Hartwell Fire Code §17-4.7.**

30-day deadline; failure may result in license suspension and referral to State Fire Marshal.

### Artifact 2 — Routine AHJ inspection, Day −243

Lt. Halloran, Hartwell Bureau of Fire Prevention. Sprinkler PASS upon visual inspection; fire pump DEFICIENCY (test certificate not posted in pump room). Substantial compliance pending follow-up.

### Artifact 3 — Beacon's quarterly NFPA 25 ITM, Day −211

Mike DiSalvo, lead technician. Wet sprinkler, fire pump, standpipe, FDC, alarm valve all SATISFACTORY. Fire pump section notes "most recent annual performance test on file (dated Day −387)". **Deficiencies noted: None this cycle.** Customer signed: B. Rivera, Steeplechase resident manager.

### Artifact 4 — Beacon's handwritten impairment log, Day −116

> Day −116 Cedar Hts. 9th flr zone OOS for repair. Frozen pipe at vert riser, replacing 6 ft section. Started 7:40am. Restored ~1:30pm. Talked to Bryan @ Steeplechase, fire watch was their guy Carlos starting 8:00. Main drain test on restoration — pressure good.
> 
> [Linda, later] Mike — was AHJ notified on this one? Don't see anything in the file. — L
> 
> [Mike, response] 4 hr or under is what I always go off — under 4 don't need to call. Was 5 hr 50 min ish. Will ck file.
> 
> [Linda, later] Carlos — fire watch hours? Need invoice. — L
> 
> [no further entry]

### Artifact 5 — Internal email thread, Cedar standpipe corrosion, Day −78 to −47

- **Day −78, Linda → Tom**: Mike flagged corrosion on 9W standpipe hose connection. He says "it was probably already like that last quarter and he didn't catch it." No deficiency entry on the last report. Should I add one and resend, or write it as a separate service proposal?
- **Day −77, Tom → Linda**: "Don't go back and amend the report, just write it up as an additional service proposal and send it over."
- **Day −62, Linda → Tom**: Sent proposal Day −74. No response. Followed up Day −68. No response. Should I keep pushing or let it sit?
- **Day −62, Tom → Linda**: "Let it sit. They'll come back to us when they want it done. We made the recommendation."
- **Day −47, Linda → Tom**: Cedar quarterly is up next week. What do I tell Mike? Still open in our system. Close as customer-declined, or leave open? **[no reply on file]**

### Artifact 6 — Marshal Reyes voicemail to Tom, Day +3

> "I'm not in any kind of rush to make this adversarial, but I need your records and I need them clean and I need the originals not whatever you printed out yesterday … get me what you have, all of it, including impairment notifications you may not have sent. If you didn't send them I need to know that too."

### Artifact 7 — Continental Mutual loss control survey, Day −416

Karen Fielding. Fire pump "approaching the upper end of its expected service life" — Recommendation 5.2-A (Open) to consider replacement/overhaul within 36 months. Battery backup observed: **Eagle-Picher Carefree CFM12V18**. ITM records "appear in order." Recommendation 5.5-A (Open): "Property management to request and retain impairment records from the ITM contractor going forward, for redundancy."

### Artifact 8 — Mike DiSalvo training transcript, Day −198

> "The form has like fifty things. Half of those things you're going to look at every quarter, and half of them you're really only checking once a year … Are you really pulling the cover off and looking at the alarm valve clapper every quarter? Nobody is. The form's also gonna ask … the form is the form."
> 
> "In practice I do the main drain on the annual visit and a partial check on the quarterlies and I write up the report the same way for both. Nobody has ever come back at me on it."
> 
> "If a system is going to be down for more than four hours, I call it in. AHJ wants to know. Under four, I don't bother them … We have customers that don't want a notification on file because their insurance is going to ask, so we, you know, we work with them. Discreet."
> 
> "If it's a five-hour fix, we did the fire watch, the building's covered, nobody got hurt, it's fine. The point of the rule is the building is protected. We protect the building. The notification is — look, the notification is paperwork. The protection is the protection."

### Artifact 9 — Halberd to Tom, Day +4

> "I have an insurance carrier asking me questions I do not have answers to because the answers are in YOUR records. I have a fire marshal sending me letters about my own building that I cannot intelligently respond to because the relevant facts are sitting in YOUR office, in YOUR file cabinet, possibly in YOUR head … I want it on a thumb drive at my office by end of business Friday."

## What to submit

A short report and a working prototype. **Recover hopes this takes under 6 hours.** They are not looking for a dissertation. They are looking for a builder who can show their work.

### The report (keep it tight)

A single document, four sections, no required length.

**1. The industry, in your words.** What is actually going on in fire and life safety inspection compliance? Not a Wikipedia summary — your read on it after spending time with the packet. Where is the money, who's in control, where is the friction, who has leverage over whom, and what could software in this space be missing? Strong answers have a point of view.

**2. The failure point.** One specific failure you identified in the packet. Where, why, and what does it affect? We are not asking what Beacon should have done differently — we are asking what is broken about the *system* such that any company operating this way would eventually produce this outcome.

**3. How your product or feature works.** A short, plain explanation of the thing you built. What it does, what it deliberately does *not* do, and what might be difficulties in adoption?

**4. Two honest answers.**

- What in the system comes close to covering this and why is your design better?
- Who in the system is incentivized to resist your solution, and how do you address that?

### The prototype

Acceptable: live link, short video (under three minutes), or screenshots with captions. The prototype should reflect the workflow described, enforce some form of state-based progression, and demonstrate the wedge in a way that a stakeholder from the packet would recognize as solving their problem.

## A closing note

If, after reading this packet, you find yourself thinking the failure point is somewhere we did not steer you toward, that is interesting to us. Tell us about it.
