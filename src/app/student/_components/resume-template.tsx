import type { ResumeData } from "../_actions"
import type { CSSProperties } from "react"

// All styles inline — no Tailwind — so html2canvas can render after onclone strips global CSS

const page: CSSProperties = {
  fontFamily: 'Georgia, "Times New Roman", Times, serif',
  fontSize: "11pt",
  lineHeight: "1.3",
  color: "#000000",
  backgroundColor: "#ffffff",
  width: "794px",
  padding: "36px 54px 44px",
  boxSizing: "border-box",
}

const nameStyle: CSSProperties = {
  fontSize: "22pt",
  fontWeight: "bold",
  textAlign: "center",
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  lineHeight: "1.1",
  margin: "0 0 4px",
}

const contactStyle: CSSProperties = {
  fontSize: "10pt",
  textAlign: "center",
  lineHeight: "1.5",
  margin: "0 0 2px",
  color: "#000",
}

const sectionHeading: CSSProperties = {
  fontSize: "11pt",
  fontWeight: "bold",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  borderBottom: "1.5px solid #000000",
  paddingBottom: "4px",
  marginTop: "10px",
  marginBottom: "4px",
}

const entryWrap: CSSProperties = { marginBottom: "5px" }

const row: CSSProperties = {
  display: "flex",
  flexDirection: "row",
  justifyContent: "space-between",
  alignItems: "baseline",
  gap: "8px",
  width: "100%",
}

const leftBold: CSSProperties = {
  fontWeight: "bold",
  fontSize: "11pt",
  flex: "1 1 auto",
  minWidth: 0,
}

const leftItalic: CSSProperties = {
  fontStyle: "italic",
  fontSize: "11pt",
  flex: "1 1 auto",
  fontWeight: "normal",
  minWidth: 0,
}

const pinned: CSSProperties = {
  fontSize: "11pt",
  flexShrink: 0,
  whiteSpace: "nowrap",
  fontWeight: "normal",
  fontStyle: "normal",
}

const bullets: CSSProperties = {
  margin: "2px 0 0 0",
  paddingLeft: "16px",
  listStyleType: "disc",
  listStylePosition: "inside",
}

const bullet: CSSProperties = {
  fontSize: "11pt",
  lineHeight: "1.4",
  margin: "0 0 1.5px",
  color: "#000",
}

const skillLine: CSSProperties = {
  fontSize: "11pt",
  lineHeight: "1.55",
}

export function ResumeTemplate({ data }: { data: ResumeData }) {
  const contactParts = [
    data.contact.phone,
    data.contact.email,
    data.contact.linkedin,
    data.contact.github,
  ].filter(Boolean)

  const hasSkills =
    data.skills.languages.length > 0 ||
    data.skills.frameworks.length > 0 ||
    data.skills.tools.length > 0

  return (
    <div style={page}>

      {/* ── HEADER ── */}
      <div style={nameStyle}>{data.name}</div>
      {contactParts.length > 0 && (
        <div style={contactStyle}>{contactParts.join(" | ")}</div>
      )}

      {/* ── EDUCATION ── */}
      {data.education.length > 0 && (
        <>
          <div style={sectionHeading}>Education</div>
          {data.education.map((edu, i) => (
            <div key={i} style={entryWrap}>
              <div style={row}>
                <span style={leftBold}>{edu.university}</span>
                {edu.dates && <span style={pinned}>{edu.dates}</span>}
              </div>
              <div style={row}>
                <span style={leftItalic}>
                  {edu.degree}{edu.gpa ? ` — GPA: ${edu.gpa}` : ""}
                </span>
              </div>
              {edu.details.length > 0 && (
                <ul style={bullets}>
                  {edu.details.map((d, j) => <li key={j} style={bullet}>{d}</li>)}
                </ul>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── EXPERIENCE ── */}
      {data.experience.length > 0 && (
        <>
          <div style={sectionHeading}>Experience</div>
          {data.experience.map((exp, i) => (
            <div key={i} style={entryWrap}>
              <div style={row}>
                <span style={leftBold}>{exp.company}</span>
                {exp.dates && <span style={pinned}>{exp.dates}</span>}
              </div>
              <div style={row}>
                <span style={leftItalic}>{exp.role}</span>
              </div>
              {exp.bullet_points.length > 0 && (
                <ul style={bullets}>
                  {exp.bullet_points.map((bp, j) => <li key={j} style={bullet}>{bp}</li>)}
                </ul>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── PROJECTS ── */}
      {data.projects.length > 0 && (
        <>
          <div style={sectionHeading}>Projects</div>
          {data.projects.map((proj, i) => (
            <div key={i} style={entryWrap}>
              <div style={row}>
                <span style={{ ...leftBold, fontWeight: "normal" }}>
                  <b>{proj.name}</b>
                  {proj.tech_stack && (
                    <span style={{ fontStyle: "italic" }}>{" | "}{proj.tech_stack}</span>
                  )}
                </span>
                {proj.dates && <span style={pinned}>{proj.dates}</span>}
              </div>
              {proj.bullet_points.length > 0 && (
                <ul style={bullets}>
                  {proj.bullet_points.map((bp, j) => <li key={j} style={bullet}>{bp}</li>)}
                </ul>
              )}
            </div>
          ))}
        </>
      )}

      {/* ── TECHNICAL SKILLS ── */}
      {hasSkills && (
        <>
          <div style={sectionHeading}>Technical Skills</div>
          <div style={entryWrap}>
            {data.skills.languages.length > 0 && (
              <div style={skillLine}>
                <b>Languages:</b>{" "}{data.skills.languages.join(", ")}
              </div>
            )}
            {data.skills.frameworks.length > 0 && (
              <div style={skillLine}>
                <b>Frameworks:</b>{" "}{data.skills.frameworks.join(", ")}
              </div>
            )}
            {data.skills.tools.length > 0 && (
              <div style={skillLine}>
                <b>Developer Tools:</b>{" "}{data.skills.tools.join(", ")}
              </div>
            )}
          </div>
        </>
      )}

    </div>
  )
}
