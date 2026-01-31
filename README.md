# VoiceMeet - Product Requirements Document (PRD)

## Overview

**Product Name:** VoiceMeet
**Version:** 1.0 (MVP)
**Last Updated:** January 2026
**Status:** Technical Decisions Complete - Ready for Implementation

---

## Problem Statement

SMB (Small-Medium Business) owners are constantly moving between meetings. After finishing one meeting, they often need to quickly schedule the next one. Currently, this requires:
- Pulling out their phone or laptop
- Opening a calendar app
- Manually typing all meeting details
- Navigating through multiple screens

This process is slow, requires hands, and interrupts their flow.

---

## Solution

**VoiceMeet** is a voice-first web application that allows SMB owners to schedule meetings on their Google Calendar using natural voice commands. The app engages in a brief, friendly conversation to collect meeting details and creates the calendar event with one confirmation.

---

## Target User

| Attribute | Description |
|-----------|-------------|
| **Who** | SMB owners and busy professionals |
| **Context** | Just finished a meeting, on-the-go, hands occupied |
| **Need** | Quick, hands-free scheduling |
| **Tech comfort** | Basic - not technical users |

### User Persona

> **"David"** - A 42-year-old owner of a marketing agency with 15 employees. He has 6-8 meetings daily and often walks between conference rooms or drives between client sites. He needs to schedule follow-ups immediately while details are fresh, but hates typing on his phone.

---

## Core Value Proposition

**"Schedule your next meeting in 30 seconds, hands-free."**

---

## MVP Scope (v1.0)

### Functional Requirements

#### 1. Voice Input
| Requirement | Details |
|-------------|---------|
| **Input method** | Natural language via device microphone |
| **Language** | English, Hebrew |
| **Style** | User speaks in their own words |
| **Example** | "Schedule a meeting with john@acme.com tomorrow at 3pm about the new project proposal" |

#### 2. Conversational Guidance
If the user doesn't provide all required information, the app will ask follow-up questions via voice:

| Missing Info | App Response |
|--------------|--------------|
| Date/Time | "When would you like to schedule this meeting?" |
| Attendees | "Who should I invite? Please provide their email." |
| Duration (optional) | Uses default (30 min) - no prompt needed |
| Title (optional) | Auto-generates - no prompt needed |

#### 3. Meeting Fields

| Field | Required by User? | System Behavior |
|-------|-------------------|-----------------|
| **Title** | No | If not provided → "Meeting with [attendee name/email]" |
| **Date & Time** | Yes | Must be provided by user |
| **Duration** | No | Default: 30 minutes |
| **Attendees** | Yes | Email address required (MVP) |
| **Location** | No | Ask only: "Is there a specific location?" - skip if none |

#### 4. Confirmation Flow
Before creating the event, display/read back:
```
"Got it! Here's what I have:
- Meeting with John about Project Proposal
- Tomorrow at 3:00 PM
- 30 minutes
- Attendee: john@acme.com

Should I schedule this?"
```

User confirms with "Yes" / "Confirm" / "Schedule it"

#### 5. Google Calendar Integration
| Requirement | Details |
|-------------|---------|
| **Authentication** | OAuth 2.0 with Google |
| **Permission** | Calendar read/write access |
| **Session** | Stay connected after initial auth |
| **Action** | Create calendar event with all details |

#### 6. Voice Response Style
| Attribute | Guideline |
|-----------|-----------|
| **Tone** | Friendly |
| **Length** | As brief as possible |
| **Examples** | "Got it!", "When's the meeting?", "Done! You're all set." |

#### 7. UI Design Principles
| Principle | Implementation |
|-----------|----------------|
| **Conversational** | The app IS a conversation, not a form |
| **Minimal copy** | As few words on screen as possible |
| **UI language** | English |
| **Voice input language** | Hebrew + English supported |
| **Visual focus** | Microphone button, conversation transcript |
| **No clutter** | No unnecessary buttons, menus, or options |

### Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| **Platform** | Web-based (mobile-responsive) |
| **Browser support** | Chrome, Safari, Edge (with mic access) |
| **Response time** | Voice recognition < 2 seconds |
| **Availability** | 99% uptime |

---

## User Flow (MVP)

```
┌─────────────────────────────────────────────────────────────────┐
│                         USER JOURNEY                            │
└─────────────────────────────────────────────────────────────────┘

1. [User] Opens VoiceMeet web app
                    │
                    ▼
2. [System] "Hi! Ready to schedule a meeting. What do you have?"
                    │
                    ▼
3. [User] "Meeting with sarah@company.com tomorrow 2pm
           about quarterly review"
                    │
                    ▼
4. [System] Parses input, identifies:
           ✓ Attendee: sarah@company.com
           ✓ Date/Time: Tomorrow 2:00 PM
           ✓ Title: Quarterly review
           ✗ Duration: Not provided → Default 30 min
           ✗ Location: Not provided
                    │
                    ▼
5. [System] "Any specific location for this meeting?"
                    │
                    ▼
6. [User] "No, it's on Zoom"
                    │
                    ▼
7. [System] "Got it! Scheduling:
            - Quarterly review with Sarah
            - Tomorrow at 2:00 PM, 30 minutes
            - sarah@company.com
            Confirm?"
                    │
                    ▼
8. [User] "Yes"
                    │
                    ▼
9. [System] Creates Google Calendar event
                    │
                    ▼
10. [System] "Done! Meeting scheduled."
```

---

## Future Scope (v2.0+)

### Phase 2: Enhanced Contacts
| Feature | Description |
|---------|-------------|
| **Contact lookup** | "Schedule with Sarah" → App finds sarah@company.com from Google Contacts |
| **Frequent contacts** | Suggest recent attendees |
| **Contact nicknames** | User can set "Sarah = sarah@company.com" |

### Phase 3: User Preferences
| Feature | Description |
|---------|-------------|
| **Custom default duration** | User sets their preferred default (15/30/45/60 min) |
| **Skip confirmation** | Power users can opt-out of confirmation step |
| **Default location** | "All my meetings are on Zoom" - auto-add link |
| **Working hours** | Warn if scheduling outside working hours |

### Phase 4: Smart Features
| Feature | Description |
|---------|-------------|
| **Conflict detection** | "You have another meeting at that time. Reschedule?" |
| **Suggested times** | "You're free tomorrow at 10am, 2pm, or 4pm" |
| **Recurring meetings** | "Schedule weekly sync every Monday at 9am" |
| **Multiple calendars** | Support Outlook, Apple Calendar |

### Phase 5: Advanced
| Feature | Description |
|---------|-------------|
| **Meeting prep** | Auto-send agenda to attendees |
| **Follow-up reminders** | "Remind me to send notes after meeting" |
| **Voice notes** | "Add note: discuss budget concerns" |
| **Team features** | Shared scheduling for teams |

---

## Technical Decisions

### Confirmed Stack
| Component | Technology | Rationale | Cost |
|-----------|------------|-----------|------|
| **Frontend** | HTML/CSS/JavaScript | Simple, no build required | Free |
| **Speech-to-Text** | Web Speech API | Browser-native, supports Hebrew, good accuracy | Free |
| **NLP/Understanding** | Gemini (Google AI Studio) | Strong Hebrew support, natural language understanding, existing account | Free tier (60 req/min) |
| **Calendar** | Google Calendar API | Target integration, same Google ecosystem | Free |
| **Hosting** | Vercel | Industry standard, auto-deploy from GitHub, professional | Free tier |

### Why These Choices?

**Web Speech API** over paid alternatives:
- Free and built into browsers (Chrome, Edge, Safari)
- Uses Google's speech recognition under the hood in Chrome
- Supports Hebrew language
- No API key or account setup required

**Gemini** over OpenAI/Claude:
- Strong Hebrew language support
- Already have Google AI Studio access
- Same ecosystem as Google Calendar
- Generous free tier for MVP usage

**Vercel** over alternatives:
- Industry standard for web apps
- Auto-deploys when we push code to GitHub
- Free tier handles MVP traffic easily
- Easy to add custom domain later

### Architecture (MVP)
```
┌──────────────────────────────────────────────────────────────────┐
│                           BROWSER                                │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │  Microphone │───▶│ Web Speech  │───▶│    Text     │          │
│  │   Input     │    │    API      │    │   Output    │          │
│  └─────────────┘    └─────────────┘    └──────┬──────┘          │
│                                               │                  │
└───────────────────────────────────────────────┼──────────────────┘
                                                │
                                                ▼
┌──────────────────────────────────────────────────────────────────┐
│                         BACKEND/APIs                             │
├──────────────────────────────────────────────────────────────────┤
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐          │
│  │   Gemini    │───▶│  App Logic  │───▶│   Google    │          │
│  │  (Parse &   │    │ (Validate & │    │  Calendar   │          │
│  │ Understand) │    │  Confirm)   │    │    API      │          │
│  └─────────────┘    └─────────────┘    └─────────────┘          │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### Data Flow
```
1. User speaks → "פגישה עם דוד מחר בשלוש על התקציב"
                         │
                         ▼
2. Web Speech API → "פגישה עם דוד מחר בשלוש על התקציב" (text)
                         │
                         ▼
3. Gemini parses → {
                     attendee: "דוד" (need email),
                     date: "tomorrow",
                     time: "15:00",
                     title: "התקציב"
                   }
                         │
                         ▼
4. App Logic → Missing email, ask user
                         │
                         ▼
5. Confirm → User says "yes"
                         │
                         ▼
6. Google Calendar → Event created ✓
```

---

## Success Metrics

| Metric | Target (MVP) |
|--------|--------------|
| **Time to schedule** | < 45 seconds from open to confirmed |
| **Voice recognition accuracy** | > 90% first-try success |
| **Task completion rate** | > 80% of attempts result in scheduled meeting |
| **User satisfaction** | Qualitative feedback positive |

---

## Assumptions (MVP)

1. ✅ User provides valid date/time (no validation)
2. ✅ Time slot is free (no conflict checking)
3. ✅ Email addresses are valid (no verification)
4. ✅ User has Google account
5. ✅ User grants calendar permissions
6. ✅ Device has working microphone
7. ✅ Stable internet connection

---

## Out of Scope (MVP)

- ❌ Calendar conflict detection
- ❌ Date/time validation
- ❌ Contact name lookup (email only)
- ❌ Multiple calendar providers
- ❌ Recurring meetings
- ❌ Mobile native apps
- ❌ Team/enterprise features
- ❌ Offline support

---

## Open Questions

| Question | Status |
|----------|--------|
| Which NLP service to use for parsing? | ✅ Decided: Gemini (Google AI Studio) |
| How to handle ambiguous dates ("next Friday")? | Let Gemini interpret, confirm with user |
| Hebrew voice recognition quality? | ✅ Web Speech API supports Hebrew in Chrome |
| Hosting platform? | ✅ Decided: Vercel |
| UI language vs voice language? | ✅ Decided: English UI, Hebrew+English voice |

---

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 0.1 | Jan 2026 | Initial PRD draft |
| 0.2 | Jan 2026 | Added technical decisions: Vercel, Web Speech API, Gemini, UI principles |

---

## Next Steps

1. ✅ Complete PRD (this document)
2. 🔲 Set up project structure
3. 🔲 Implement voice input (Web Speech API)
4. 🔲 Build NLP parsing for meeting details
5. 🔲 Create confirmation UI
6. 🔲 Integrate Google Calendar API
7. 🔲 Test end-to-end flow
8. 🔲 Deploy MVP
