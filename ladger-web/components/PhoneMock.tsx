const rows = [
  { name: "Groceries", amount: "−₹1,580", bg: "#FBEBDD", color: "var(--exp)" },
  { name: "Salary", amount: "+₹42,000", bg: "#E1F3EE", color: "var(--primary)" },
  { name: "SIP", amount: "₹2,000", bg: "#E5EDF9", color: "var(--sav)" },
  { name: "Mobile EMI", amount: "−₹5,000", bg: "#FBEBDD", color: "var(--exp)" },
];

export function PhoneMock() {
  return (
    <div className="phone" role="img" aria-label="Preview of the home screen showing balance, planned versus actual, and recent entries">
      <div className="screen">
        <small>November 2026</small>
        <div className="bal">
          <div className="row"><span>Balance</span><span className="up">▲ ₹6,200 this month</span></div>
          <b>₹1,84,300</b>
          <div className="row"><span>Expenses vs plan</span><span className="up">▼ ₹1,200 · 4%</span></div>
          <div className="row"><span>Savings vs plan</span><span className="down">▼ ₹800 · 8%</span></div>
        </div>
        <small>RECENT</small>
        {rows.map((r) => (
          <div className="item" key={r.name}>
            <i style={{ background: r.bg }} />
            <span>{r.name}</span>
            <span style={{ color: r.color }}>{r.amount}</span>
          </div>
        ))}
        <div className="tabbar"><i /><i /><b /><i /><i /></div>
      </div>
    </div>
  );
}
