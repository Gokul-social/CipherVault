export default function Home() {
  return (
    <main
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "100vh",
        padding: "2rem",
      }}
    >
      <div
        style={{
          textAlign: "center",
          maxWidth: "640px",
        }}
      >
        <div
          style={{
            fontSize: "0.75rem",
            fontFamily: "'JetBrains Mono', monospace",
            color: "#a78bfa",
            textTransform: "uppercase",
            letterSpacing: "0.15em",
            marginBottom: "1rem",
          }}
        >
          Colosseum Frontier Hackathon
        </div>

        <h1
          style={{
            fontSize: "3rem",
            fontWeight: 700,
            background: "linear-gradient(135deg, #a78bfa 0%, #38bdf8 50%, #34d399 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "1.5rem",
            lineHeight: 1.1,
          }}
        >
          CipherVault
        </h1>

        <p
          style={{
            fontSize: "1.125rem",
            color: "#a1a1aa",
            lineHeight: 1.6,
            marginBottom: "2rem",
          }}
        >
          Confidential institutional prime brokerage on Solana.
          Cross-chain collateral via Ika dWallets.
          Encrypted order book via Encrypt FHE.
        </p>

        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          {[
            { label: "Ika dWallets", desc: "MPC custody" },
            { label: "Encrypt FHE", desc: "Confidential compute" },
            { label: "Solana", desc: "Settlement layer" },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                padding: "1rem 1.5rem",
                borderRadius: "12px",
                border: "1px solid #27272a",
                backgroundColor: "#18181b",
                textAlign: "center",
                minWidth: "140px",
              }}
            >
              <div
                style={{
                  fontSize: "0.875rem",
                  fontWeight: 600,
                  color: "#e4e4e7",
                  marginBottom: "0.25rem",
                }}
              >
                {item.label}
              </div>
              <div
                style={{
                  fontSize: "0.75rem",
                  color: "#71717a",
                  fontFamily: "'JetBrains Mono', monospace",
                }}
              >
                {item.desc}
              </div>
            </div>
          ))}
        </div>

        <div
          style={{
            marginTop: "3rem",
            padding: "1rem",
            borderRadius: "8px",
            backgroundColor: "#1c1c22",
            border: "1px solid #27272a",
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: "0.8rem",
            color: "#71717a",
          }}
        >
          Phase 1: Scaffold ✓ — Dashboard and wallet connection coming in Phase 2
        </div>
      </div>
    </main>
  );
}
