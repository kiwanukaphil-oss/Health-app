# Little Gains private beta runbook

Status: preparation in progress
Calendar integration: deferred
Product stage: quality hardening after approved Phase 4 implementation

## Purpose

Validate that Little Gains is dependable, understandable, accessible, and genuinely helpful for people working from home before any public release. This pilot must not expand into medical monitoring, employer visibility, calendar-content collection, or engagement pressure.

## Entry gates

- [x] TypeScript, lint, unit tests, Expo Doctor, web export, and Android release build pass.
- [x] Existing encrypted data survives an upgrade from the previous approved build.
- [x] Fresh install and onboarding pass on a supported Android target.
- [x] Large text through 150% and reduced-motion behavior are checked on the current Android target.
- [ ] TalkBack, high contrast, touch targets, and one-handed use are checked.
- [ ] Notification permission denial, quiet hours, pause, Later, Bad time, Not today, and restart recovery pass.
- [x] Data export opens a user-controlled share sheet and excludes keys and notification identifiers.
- [x] Confirmed deletion cancels reminders, clears app-owned data, and returns to onboarding.
- [ ] At least one supported iOS device completes the core journey before the pilot includes iOS users.
- [ ] The open Phase 3 one-week reminder trial and Phase 4 five-user usability tasks are recorded, even if they run alongside beta preparation.

## Pilot design

Recruit 10-30 adults who work from home, including varied working hours, caregiving patterns, reminder preferences, mobility needs, Android versions, and at least one supported iOS device when available. Run for two weeks.

Every tester should understand:

- Little Gains provides general wellbeing support, not medical advice or monitoring.
- Participation is voluntary and reminders can be paused or disabled at any time.
- The app does not require an account or calendar access.
- Routine, mobility, habit, and reflection data stays in the encrypted local database.
- Exporting data opens the operating-system share sheet; the tester chooses the destination.
- Deleting local data is irreversible after the final in-app confirmation.

## Core tasks

1. Complete onboarding and explain the resulting three-habit plan in the tester's own words.
2. Change energy to low or very busy and identify the reduced plan.
3. Complete one guided habit using either a standard or seated/minimum option.
4. Enable reminders, inspect quiet hours, pause for today, and turn reminders off again.
5. Edit workdays or routine windows and explain what changes today versus tomorrow.
6. Complete the weekly reflection and explain why the suggested change appeared.
7. Export a data copy and identify what is and is not included.
8. Reach the deletion confirmation screen, but do not confirm unless using a disposable test profile.

## Feedback prompts

- Which prompt or habit felt most useful, and why?
- Did any prompt arrive at a poor time? What was happening?
- Was the minimum version small enough on a difficult day?
- Could you find pause, reminder-off, routine edit, export, and deletion controls without help?
- Did any wording feel medical, judgmental, confusing, or pressuring?
- Did the explanation for a suggested adjustment make sense?
- What would make you stop using the app?

Do not collect free-text health histories, calendar content, employer details, or medical diagnoses.

## Success signals

- Five representative users edit their routine and complete a reflection without guidance.
- Most testers describe reminders as helpful more often than poorly timed.
- Testers can pause or disable reminders and find data controls without assistance.
- At least one small action is feasible on a low-energy or very-busy day.
- No critical accessibility, persistence, notification, privacy, or data-loss defect remains open.
- Continued use is supported by interviews, not by streak pressure or notification volume.

## Device matrix

| Platform | Minimum coverage | Status |
| --- | --- | --- |
| Android current target | Connected Samsung release build, upgrade, restart, notification actions | In progress |
| Android supported floor | Android 7/API 24 fresh install and core journey | Pending |
| Android accessibility | TalkBack, large text, reduced motion, high contrast, one-handed use | In progress; large text and reduced motion pass |
| iOS supported floor | iOS 16.4+ fresh install, VoiceOver, notifications, export | Pending external device/build |
| Web preview | Static export, keyboard navigation, responsive layout, temporary-data messaging | In progress |

## Verification record

On 29 August 2026, an isolated release build using a temporary `.qa` application ID completed all five onboarding steps on the connected Samsung device. Reminders created 10 package-specific scheduled alarms. Confirmed deletion removed every alarm, cleared the disposable profile, returned immediately to onboarding, and remained cleared after restart. The production package and its existing encrypted profile were verified separately and were not modified. The temporary QA package was then uninstalled.

This pass also found and corrected a route-reset defect that had previously left the deleted profile on the You screen until restart.

On 29 August 2026, the production release build passed large-text checks at 130% across Today, You, and the complete Data & Safety flow, including the export and deletion controls. Today also passed a stricter 150% check without clipped or overlapping content. With Android window, transition, and animator scales disabled, the guided-activity screen opened correctly and its timer started and updated without React Native or Android runtime errors. The device's original text and animation settings were restored and verified afterward. TalkBack, high contrast, touch-target measurement, and one-handed-use checks remain open.

## Performance budgets to validate

- Warm app resume: usable content within 1 second on the primary Android test device.
- Cold start: usable Today content within 3 seconds after the encrypted database opens.
- Tab response: visible feedback within 100 ms and settled screen within 500 ms.
- Local data write: normal habit, routine, and reflection actions complete within 500 ms.
- Reminder action: acknowledgement is immediate; persistence completes without duplicate wins.

These are pilot targets, not current performance claims. Record device, build, scenario, and observed time for every failure.

## Privacy and safety inventory

Stored locally: name, priorities, approximate routine windows, mobility preference, habit choices, completions, reflections, reminder preferences, and reminder-response history.

Native protection: SQLCipher database, SecureStore-held device key, secure-delete mode, integrity check at startup, and no cloud sync.

Explicitly absent: password, advertising profile, precise location, contacts, camera, microphone, employer access, calendar event content, health-platform data, diagnosis, and treatment data.

Temporary export: JSON written to the application cache and passed only to the operating-system share sheet after the user taps Export. Encryption keys and operating-system notification identifiers are excluded.

Deletion: requires a second in-app confirmation, cancels scheduled reminders, securely deletes app-owned rows, truncates the write-ahead log, compacts the encrypted database, and returns to onboarding.

## Issue handling

| Severity | Definition | Response |
| --- | --- | --- |
| Critical | Data loss, privacy exposure, unsafe instruction, unusable startup, or reminders outside protected hours | Stop distribution, notify testers, preserve diagnostic facts without sensitive content, prepare rollback |
| High | Core journey blocked with no reasonable workaround | Triage within one working day and pause affected task recruitment |
| Medium | Important confusion or degraded behavior with a workaround | Schedule before beta exit and track affected devices |
| Low | Cosmetic or minor wording issue | Record for the next reviewed batch |

Logs and screenshots must not include exported JSON, names, routine details, reflections, notification bodies, or device identifiers unless the tester knowingly supplies the minimum needed excerpt.

## Distribution checklist

- [ ] Confirm Expo organization/project ownership.
- [ ] Approve Android signing and Apple Developer credential handling.
- [ ] Create the EAS `preview` build only after credential approval.
- [ ] Restrict internal-build access to authorized Expo accounts when feasible.
- [ ] Register iOS tester devices before creating the ad hoc build.
- [ ] Share install links only with approved testers.
- [ ] Record build version, commit, platform, and rollout date.
- [ ] Provide feedback route, expected response time, safety disclaimer, and uninstall/deletion guidance.
- [ ] Keep the previous known-good build available for rollback.

## Exit decision

Approve launch preparation only when critical defects are closed, accessibility and privacy checks pass, the pilot supports continued use, and known limitations are documented. Calendar access remains a separate opt-in decision and is not required for beta or launch.
