# Review sessions

A review session has its viewpoints held by members, each reviewing alone in its own subagent context; the agent that runs the command chairs; the user decides. It is used by f3 tres-amigos and f3 design-review. The command gives what is specific to it: the record file and its title, the validation file, the files of the following steps, the members, the meaning of "high", the natures of the rows, how a row is applied, the checks, and the content of the validation.

## Record

~~~markdown
# <title given by the command>

## Session <number>: <date as YYYY-MM-DD>

### <member>

<report returned by the member, unchanged>

### Grid and decisions

| No. | Severity | Members | Subject | Nature | Decision |
|---|---|---|---|---|---|

### Dismissed points

- <number>: <reason given by the user, or "no reason given">; <backlog entry B-<number>, or "not kept">
~~~

One section per member, in the order the reports arrive. A section without content contains the single line "None.".

## Convocation prompt

Built from the member's line in the command and this common part:

"You are a member of <review named by the command>. Your viewpoint: <viewpoint>. Read: <reading>. Modify no file. Only raise an objection if you can tie it to a precise passage and to a concrete consequence for your viewpoint, as the command says. No style preference, no objection of principle. For each objection, give: its severity (critical: prevents implementing, or exposes to a security or data loss risk; high: <meaning given by the command>; minor: without effect on the result; information: calls for no action), the passage concerned with a short quotation, the finding in one sentence, then either the correction if it requires no choice, or the question to decide, without proposing options. Answer only with this list. If there is no objection, answer 'No objection.'."

## Steps

1. **Opening.**
   - If the validation file exists, the step is closed: start no session. Say so, with the date of the validation, list the files of the following steps that exist, and ask whether the user wants to reopen the step, knowing those files will have to be reviewed. If what they want to change concerns a few requirements of the specs, propose an amendment instead. Go on only on an explicit answer.
   - If the record does not exist, create it with its title. Then look at its last session: rows still "pending", resume at step 5 for those rows; every report but no grid, step 3; missing reports and no grid, step 2 for the missing members; otherwise, or without session, a new session, numbered next and dated today, then step 2.
2. **Convening.** Convene the members whose report is missing, one after the other, never two at the same time, through your subagent tool (the Agent tool under Claude Code, the subagent tool under OpenCode) with the built-in exploration subagent: `Explore` under Claude Code, `explore` under OpenCode. As soon as a report arrives, write it unchanged in the session, under the title of its member. Go on only when every report is written. If the exploration subagent is not available, or a call fails, stop and report it: never play a member, never review in place of a member.
3. **Sorting.** Merge the objections about the same point, keeping the names of the members who raise them. Set the information items apart. Order the rest by severity, then by dependency: a point others depend on comes first. For each point that requires a choice, prepare two or three options, each with its consequence, and your recommendation.
4. **Grid.** Present one row per point: number, severity, members, subject, nature, your recommendation with a short reason, the other options, and "depends on" with the number concerned. Then the information items, as a short list. Write the grid in the session with "pending" in the Decision column. If no point is to be decided, write "None." in the grid section and go to step 7.
5. **Arbitration.** The user validates the grid as a whole, or changes rows. Re-evaluate and present again the rows that depend on a changed row. A critical or high point dismissed without a reason is defended once, saying what would have to be guessed or redone without it, then the user's choice is accepted. Each dismissed point goes to the Dismissed points section, with "dismissed" in its row; one the user keeps for later becomes a `BACKLOG.md` entry, with the origin given by the command.
6. **Application.** Apply the validated rows one by one, as the command says. Replace "pending" with the decision taken as soon as the change is written.
7. **Checks.** Run the checks of the command and fix every error. If the Dismissed points section does not exist, write it with "None.".
8. **Summary.** Present the changes made, the dismissed points, and what the command adds. If the step had been reopened, recall the files of the following steps to review.
9. **Closing.** Ask whether the user declares the step finished, or wants a new session on the modified files. If finished, write the validation file following `openspec instructions <artifact> --change <change-id>`, with the content the command gives, replacing the file if it existed, and name the next step. Otherwise, say that the command must be run again in a new session.
