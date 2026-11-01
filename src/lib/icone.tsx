import { ImageResponse } from "next/og";

// Icône BRSN OPS : « BRSN » orange brûlé et « OPS » blanc sur fond encre.
export function dessinerIcone(taille: number) {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#141414",
          color: "#CC5500",
          fontWeight: 900,
          fontSize: taille * 0.26,
          letterSpacing: taille * -0.01,
        }}
      >
        BRSN
        <div style={{ color: "#ffffff", fontSize: taille * 0.11, letterSpacing: taille * 0.02 }}>
          OPS
        </div>
      </div>
    ),
    { width: taille, height: taille },
  );
}
