import { ImageResponse } from "next/og";
import { RESUME_DATA } from "@/data/resume-data";

export const alt = `${RESUME_DATA.name} - ${RESUME_DATA.about}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 50%, #16213e 100%)",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Subtle grid pattern overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundImage:
              "linear-gradient(rgba(99, 102, 241, 0.05) 1px, transparent 1px), linear-gradient(90deg, rgba(99, 102, 241, 0.05) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Accent glow */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(99, 102, 241, 0.15) 0%, transparent 70%)",
          }}
        />
        {/* Initials watermark */}
        <div
          style={{
            position: "absolute",
            bottom: "-40px",
            right: "40px",
            fontSize: "280px",
            fontWeight: 900,
            color: "rgba(99, 102, 241, 0.04)",
            lineHeight: 1,
            letterSpacing: "-0.05em",
          }}
        >
          LG
        </div>
        {/* Content */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px", zIndex: 1 }}>
          <div
            style={{
              fontSize: "56px",
              fontWeight: 800,
              color: "#f0f0f5",
              lineHeight: 1.1,
              letterSpacing: "-0.02em",
            }}
          >
            {RESUME_DATA.name}
          </div>
          <div
            style={{
              width: "64px",
              height: "3px",
              background: "linear-gradient(90deg, #6366f1, #818cf8)",
              borderRadius: "2px",
            }}
          />
          <div
            style={{
              fontSize: "24px",
              color: "#a5a5c0",
              lineHeight: 1.4,
              maxWidth: "800px",
            }}
          >
            {RESUME_DATA.about}
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "8px",
            }}
          >
            {RESUME_DATA.skills.slice(0, 6).map((skill) => (
              <div
                key={skill}
                style={{
                  padding: "6px 16px",
                  borderRadius: "20px",
                  border: "1px solid rgba(99, 102, 241, 0.3)",
                  color: "#818cf8",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                {skill}
              </div>
            ))}
          </div>
        </div>
        {/* Bottom bar */}
        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "80px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
            color: "#6b6b85",
            fontSize: "16px",
          }}
        >
          <span>{RESUME_DATA.location}</span>
          <span style={{ margin: "0 4px" }}>|</span>
          <span>{RESUME_DATA.personalWebsiteUrl.replace("https://", "")}</span>
        </div>
      </div>
    ),
    { ...size },
  );
}
