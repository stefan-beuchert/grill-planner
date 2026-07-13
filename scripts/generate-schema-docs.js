#!/usr/bin/env node
// Regenerates the "Data Model" section of ARCHITECTURE.md from
// prisma/schema.prisma's own `///` doc-comments — so that section can never
// drift from the real schema; it's derived, not hand-transcribed.
//
// Usage: node scripts/generate-schema-docs.js
// (run after editing prisma/schema.prisma, alongside `prisma migrate dev`)

const fs = require("fs");
const path = require("path");

const SCHEMA_PATH = path.join(__dirname, "..", "prisma", "schema.prisma");
const ARCHITECTURE_PATH = path.join(__dirname, "..", "ARCHITECTURE.md");
const START_MARKER = "<!-- BEGIN GENERATED: data-model (via scripts/generate-schema-docs.js) -->";
const END_MARKER = "<!-- END GENERATED: data-model -->";

function parseSchema(source) {
  const lines = source.split("\n");
  const enums = [];
  const models = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    const enumMatch = line.match(/^enum\s+(\w+)\s*\{/);
    const modelMatch = line.match(/^model\s+(\w+)\s*\{/);

    if (enumMatch || modelMatch) {
      const name = (enumMatch || modelMatch)[1];
      const isEnum = Boolean(enumMatch);

      // Doc comment: contiguous `///` lines immediately above this block.
      const docLines = [];
      let j = i - 1;
      while (j >= 0 && lines[j].trim().startsWith("///")) {
        docLines.unshift(lines[j].trim().replace(/^\/\/\/\s?/, ""));
        j--;
      }
      const description = docLines.join(" ").trim();

      // Collect the block body.
      const body = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("}")) {
        body.push(lines[i]);
        i++;
      }

      if (isEnum) {
        const values = body
          .map((l) => l.trim())
          .filter((l) => l && !l.startsWith("//"));
        enums.push({ name, description, values });
      } else {
        const fields = [];
        const constraints = [];
        let pendingDoc = [];

        for (const raw of body) {
          const trimmed = raw.trim();
          if (!trimmed) continue;

          if (trimmed.startsWith("///")) {
            pendingDoc.push(trimmed.replace(/^\/\/\/\s?/, ""));
            continue;
          }
          if (trimmed.startsWith("//")) continue; // plain (non-doc) comment
          if (trimmed.startsWith("@@")) {
            constraints.push(trimmed);
            pendingDoc = [];
            continue;
          }

          // Field line: `name  Type[?]  attrs...`
          const fieldMatch = trimmed.match(/^(\w+)\s+([\w[\]?]+)(.*)$/);
          if (fieldMatch) {
            const [, fname, ftype, attrs] = fieldMatch;
            fields.push({
              name: fname,
              type: ftype,
              attrs: attrs.trim(),
              description: pendingDoc.join(" ").trim(),
            });
          }
          pendingDoc = [];
        }

        models.push({ name, description, fields, constraints });
      }
    }
    i++;
  }

  return { enums, models };
}

function renderMarkdown({ enums, models }) {
  const parts = [];

  parts.push(
    "_This section is generated from `prisma/schema.prisma`'s own `///` doc-comments — do not hand-edit it. Run `node scripts/generate-schema-docs.js` after changing the schema (via `docker compose exec app node scripts/generate-schema-docs.js`)._",
  );

  for (const model of models) {
    parts.push(`\n### ${model.name}`);
    if (model.description) parts.push(`\n${model.description}`);

    parts.push("\n| Field | Type | Notes |");
    parts.push("|---|---|---|");
    for (const f of model.fields) {
      const notes = [f.description, f.attrs].filter(Boolean).join(" — ");
      parts.push(`| \`${f.name}\` | \`${f.type}\` | ${notes || "—"} |`);
    }

    if (model.constraints.length > 0) {
      parts.push(`\n**Constraints:** ${model.constraints.map((c) => `\`${c}\``).join(", ")}`);
    }
  }

  if (enums.length > 0) {
    parts.push("\n### Enums");
    for (const e of enums) {
      const desc = e.description ? ` — ${e.description}` : "";
      parts.push(`- **${e.name}**${desc}: ${e.values.map((v) => `\`${v}\``).join(", ")}`);
    }
  }

  return parts.join("\n") + "\n";
}

function main() {
  const schema = fs.readFileSync(SCHEMA_PATH, "utf8");
  const parsed = parseSchema(schema);
  const generated = renderMarkdown(parsed);

  const architecture = fs.readFileSync(ARCHITECTURE_PATH, "utf8");
  const startIdx = architecture.indexOf(START_MARKER);
  const endIdx = architecture.indexOf(END_MARKER);

  if (startIdx === -1 || endIdx === -1) {
    console.error(
      `Could not find ${START_MARKER} / ${END_MARKER} markers in ARCHITECTURE.md — nothing regenerated.`,
    );
    process.exit(1);
  }

  const before = architecture.slice(0, startIdx + START_MARKER.length);
  const after = architecture.slice(endIdx);
  const updated = `${before}\n${generated}\n${after}`;

  fs.writeFileSync(ARCHITECTURE_PATH, updated);
  console.log(`Regenerated Data Model section in ARCHITECTURE.md (${parsed.models.length} models, ${parsed.enums.length} enums).`);
}

main();
