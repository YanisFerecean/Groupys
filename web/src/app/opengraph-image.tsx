import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "Groupys – Music is better together";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#f9f9fb",
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "sans-serif",
          padding: "80px",
        }}
      >
        {/* Red accent bar */}
        <div
          style={{
            width: "80px",
            height: "8px",
            background: "#ba002b",
            borderRadius: "4px",
            marginBottom: "40px",
          }}
        />
        <div
          style={{
            fontSize: "96px",
            fontWeight: 900,
            color: "#ba002b",
            letterSpacing: "-4px",
            lineHeight: 1,
          }}
        >
          Groupys
        </div>
        <div
          style={{
            fontSize: "36px",
            color: "#1a1c1d",
            marginTop: "28px",
            fontWeight: 700,
            letterSpacing: "-1px",
          }}
        >
          Music is better together.
        </div>
        <div
          style={{
            fontSize: "22px",
            color: "#5d3f3f",
            marginTop: "20px",
            textAlign: "center",
            maxWidth: "800px",
            lineHeight: 1.5,
          }}
        >
          Communities · Frequency Match · Weekly Hot Take · Album Ratings
        </div>
      </div>
    ),
    { ...size }
  );
}
