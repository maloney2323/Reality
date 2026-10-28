export function proposeOriginalRepair(input) {
  const file = "test/reality-personal-discovered-work-handoff-v0.1.test.js";
  const expectedWorkId = "work:24cda9611404e9bcb47909976067605c";
  const title =
    "Home checks signed-in goal before preparing source work and never silently executes";

  if (!input || input.workId !== expectedWorkId) {
    throw new Error("Unexpected work ID");
  }
  if (typeof input.source !== "string") {
    throw new Error("Source must be a string");
  }

  const source = input.source;
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const titlePattern = new RegExp(
    "\\btest\\s*\\(\\s*(['\"])" + escapedTitle + "\\1\\s*,",
    "g"
  );
  const titleMatches = Array.from(source.matchAll(titlePattern));

  if (titleMatches.length !== 1) {
    throw new Error("Legacy test is absent or ambiguous");
  }

  const testMatch = titleMatches[0];
  const callbackStart = source.indexOf("=>", testMatch.index + testMatch[0].length);
  if (callbackStart < 0) {
    throw new Error("Legacy test block is malformed");
  }

  const openBrace = source.indexOf("{", callbackStart + 2);
  if (openBrace < 0) {
    throw new Error("Legacy test block is malformed");
  }

  const closingPattern = /\r?\n[ \t]*\}\);/g;
  closingPattern.lastIndex = openBrace + 1;
  const closingCandidates = Array.from(source.matchAll(closingPattern));
  const declarationPattern =
    /^[ \t]*const[ \t]+(sign|goal|prepare|approval|consent)[ \t]*=[ \t]*(html|guided)[ \t]*\.indexOf[ \t]*\(/gm;
  const names = ["sign", "goal", "prepare", "approval", "consent"];

  let selectedClose = null;
  let selectedDeclarations = null;

  for (const candidate of closingCandidates) {
    const body = source.slice(openBrace + 1, candidate.index);
    const declarations = Array.from(body.matchAll(declarationPattern)).map((match) => ({
      name: match[1],
      receiver: match[2],
      relativeStart: match.index,
      receiverOffset: match[0].indexOf(match[2])
    }));

    const counts = {};
    for (const declaration of declarations) {
      counts[declaration.name] = (counts[declaration.name] || 0) + 1;
    }

    if (
      declarations.length === names.length &&
      names.every((name) => counts[name] === 1)
    ) {
      selectedClose = candidate;
      selectedDeclarations = declarations;
      break;
    }
  }

  if (!selectedClose || !selectedDeclarations) {
    throw new Error("Legacy handler-order assertions are absent or ambiguous");
  }

  const bodyStart = openBrace + 1;
  const bodyEnd = selectedClose.index;
  const body = source.slice(bodyStart, bodyEnd);
  const orderedDeclarations = names.map((name) =>
    selectedDeclarations.find((declaration) => declaration.name === name)
  );

  if (
    orderedDeclarations.some((declaration) => !declaration) ||
    orderedDeclarations.some(
      (declaration, index) =>
        index > 0 &&
        declaration.relativeStart <= orderedDeclarations[index - 1].relativeStart
    )
  ) {
    throw new Error("Handler-order assertions are absent or ambiguous");
  }

  const guidedStartPattern =
    /^[ \t]*const guidedStart=html\.indexOf\(" \$\('attentionQueue'\)\.querySelectorAll\('\[data-auth\]'\)\.forEach"\);[ \t]*$/gm;
  const guidedEndPattern =
    /^[ \t]*const guidedEnd=html\.indexOf\('async function refreshPreparedHomeWork',guidedStart\);[ \t]*$/gm;
  const guidedBoundsPattern =
    /^[ \t]*assert\.ok\(guidedStart>=0&&guidedEnd>guidedStart\);[ \t]*$/gm;
  const guidedSlicePattern =
    /^[ \t]*const guided=html\.slice\(guidedStart,guidedEnd\);[ \t]*$/gm;

  const guidedStarts = Array.from(body.matchAll(guidedStartPattern));
  const guidedEnds = Array.from(body.matchAll(guidedEndPattern));
  const guidedBounds = Array.from(body.matchAll(guidedBoundsPattern));
  const guidedSlices = Array.from(body.matchAll(guidedSlicePattern));
  const allGuided = orderedDeclarations.every(
    (declaration) => declaration.receiver === "guided"
  );
  const allHtml = orderedDeclarations.every(
    (declaration) => declaration.receiver === "html"
  );

  if (
    guidedStarts.length === 1 &&
    guidedEnds.length === 1 &&
    guidedBounds.length === 1 &&
    guidedSlices.length === 1 &&
    allGuided &&
    guidedStarts[0].index < orderedDeclarations[0].relativeStart &&
    guidedEnds[0].index > guidedStarts[0].index &&
    guidedBounds[0].index > guidedEnds[0].index &&
    guidedSlices[0].index > guidedBounds[0].index
  ) {
    return { status: "ALREADY_FIXED", file, patchedSource: source };
  }

  if (
    !allHtml ||
    guidedStarts.length !== 0 ||
    guidedEnds.length !== 0 ||
    guidedBounds.length !== 0 ||
    guidedSlices.length !== 0 ||
    /\bguided\.indexOf\b/.test(body)
  ) {
    throw new Error("Guided handler scoping is incomplete or ambiguous");
  }

  const sign = orderedDeclarations[0];
  const signAbsoluteStart = bodyStart + sign.relativeStart;
  const signLineStart = source.lastIndexOf("\n", signAbsoluteStart) + 1;
  const indentation = source.slice(signLineStart, signAbsoluteStart);

  const setup =
    indentation +
    "// Scope the ordering assertion to the guided Attention handler, not the\n" +
    indentation +
    "// separate direct-start handler added earlier in the same page.\n" +
    indentation +
    "const guidedStart=html.indexOf(\" $('attentionQueue').querySelectorAll('[data-auth]').forEach\");\n" +
    indentation +
    "const guidedEnd=html.indexOf('async function refreshPreparedHomeWork',guidedStart);\n" +
    indentation +
    "assert.ok(guidedStart>=0&&guidedEnd>guidedStart);\n" +
    indentation +
    "const guided=html.slice(guidedStart,guidedEnd);\n";

  const edits = [
    {
      start: signLineStart,
      end: signLineStart,
      text: setup
    }
  ];

  for (const declaration of orderedDeclarations) {
    const receiverStart =
      bodyStart + declaration.relativeStart + declaration.receiverOffset;
    edits.push({
      start: receiverStart,
      end: receiverStart + "html".length,
      text: "guided"
    });
  }

  edits.sort((a, b) => b.start - a.start);
  let patchedSource = source;
  for (const edit of edits) {
    patchedSource =
      patchedSource.slice(0, edit.start) +
      edit.text +
      patchedSource.slice(edit.end);
  }

  return { status: "PATCH_PROPOSED", file, patchedSource };
}
