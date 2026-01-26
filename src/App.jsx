import { useState } from "react";

const STARTING_BANKROLL = 100;

const ADMIN_KEY = "wedding-admin-2026"; // change before deploying

const americanToMultiplier = (odds) => {
  const num = parseInt(odds);
  if (isNaN(num)) return 1;
  return num > 0 ? 1 + num / 100 : 1 + 100 / Math.abs(num);
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
  }).format(amount);
};

export default function WeddingBettingOdds() {
  const [bets, setBets] = useState([
    {
      question: "Who will cry first?",
      optionA: "Nikesh",
      optionB: "Richa",
      oddsA: "+150",
      oddsB: "+250",
      winner: null,
    },
  ]);

  const [guestName, setGuestName] = useState("");
  const [picks, setPicks] = useState({});
  const [stake, setStake] = useState(10);
  const [submissions, setSubmissions] = useState([]);
  const [locked, setLocked] = useState(false);
  const [adminView, setAdminView] = useState(false);
  const [adminInput, setAdminInput] = useState("");

  const [newBet, setNewBet] = useState({
    question: "",
    optionA: "",
    optionB: "",
    oddsA: "+100",
    oddsB: "+100",
  });

  const remaining = STARTING_BANKROLL - stake * Object.keys(picks).length;

  const togglePick = (betIndex, option) => {
    if (locked) return;
    setPicks({ ...picks, [betIndex]: option });
  };

  const submitBet = () => {
    if (!guestName.trim()) {
      alert("Please enter your name");
      return;
    }
    if (remaining < 0) {
      alert("Not enough bankroll. Please adjust your bets.");
      return;
    }
    if (Object.keys(picks).length === 0) {
      alert("Please make at least one pick");
      return;
    }

    setSubmissions([
      ...submissions,
      { name: guestName, picks, bankroll: STARTING_BANKROLL },
    ]);
    setLocked(true);
  };

  const setWinner = (index, option) => {
    const updated = [...bets];
    updated[index].winner = option;
    setBets(updated);

    const recalculated = submissions.map((s) => {
      let bankroll = STARTING_BANKROLL;
      Object.entries(s.picks).forEach(([i, pick]) => {
        bankroll -= stake;
        if (updated[i].winner === pick) {
          const odds = pick === "A" ? updated[i].oddsA : updated[i].oddsB;
          bankroll += stake * americanToMultiplier(odds);
        }
      });
      return { ...s, bankroll: Math.round(bankroll) };
    });

    setSubmissions(recalculated);
  };

  const addQuestion = () => {
    if (!newBet.question || !newBet.optionA || !newBet.optionB) {
      return alert("Fill out all fields");
    }

    setBets([...bets, { ...newBet, winner: null }]);
    setNewBet({ question: "", optionA: "", optionB: "", oddsA: "+100", oddsB: "+100" });
  };

  const siteUrl = "https://your-wedding-bets.com"; // replace when hosted

  return (
    <div className="min-h-screen bg-gradient-to-br from-rose-50 via-amber-50 to-orange-50 p-4 max-w-md mx-auto">
      {/* Branding */}
      <div className="text-center animate-fade-in ">
        <div className="mb-4 transform hover:scale-105 transition-transform duration-300">
          <img 
            src="/logo-w-names.png" 
            alt="Wedding Logo" 
            className="mx-auto w-28 h-28 rounded-full shadow-lg border-4 border-white object-cover" 
          />
        </div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent mb-2">
          Nikesh & Richa's Wedding Bets
        </h1>
        <p className="text-rose-700 text-sm font-medium mt-1">
          {formatCurrency(STARTING_BANKROLL)} bankroll • bragging rights only
        </p>
      </div>

      {/* Admin Access */}
      {!adminView && (
        <div className="mb-6 animate-slide-up">
          <input
            className="w-full border-2 border-rose-200 rounded-2xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-white/80 backdrop-blur-sm shadow-sm"
            placeholder="🔐 Admin access code"
            value={adminInput}
            onChange={(e) => setAdminInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && adminInput === ADMIN_KEY) {
                setAdminView(true);
                setAdminInput("");
              }
            }}
          />
        </div>
      )}

      {/* Guest View */}
      {!adminView && (
        <>
          <div className="mb-6 animate-slide-up">
            <input
              className="w-full border-2 border-rose-200 rounded-2xl p-4 text-base focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-white/90 backdrop-blur-sm shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
              placeholder="✨ Enter your name"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              disabled={locked}
            />
          </div>

          <div className="space-y-5 mb-6">
            {bets.map((bet, i) => (
              <div 
                key={i} 
                className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-lg border border-rose-100 p-5 space-y-4 animate-slide-up"
                style={{ animationDelay: `${i * 0.1}s` }}
              >
                <div className="font-semibold text-base text-gray-800 mb-1">
                  {bet.question}
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {["A", "B"].map((opt) => {
                    const isSelected = picks[i] === opt;
                    const optionText = opt === "A" ? bet.optionA : bet.optionB;
                    const odds = opt === "A" ? bet.oddsA : bet.oddsB;
                    const isPositive = odds.startsWith('+');
                    
                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => togglePick(i, opt)}
                        disabled={locked}
                        className={`
                          relative border-2 rounded-2xl p-4 text-sm font-medium
                          transform transition-all duration-200 active:scale-95
                          disabled:opacity-50 disabled:cursor-not-allowed
                          ${isSelected 
                            ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white border-rose-500 shadow-lg shadow-rose-200 scale-105" 
                            : "bg-gradient-to-br from-white to-rose-50 text-gray-700 border-rose-200 hover:border-rose-300 hover:shadow-md"
                          }
                        `}
                      >
                        <div className="font-semibold mb-2">{optionText}</div>
                        <div className={`
                          text-xs font-bold px-2 py-1 rounded-lg inline-block
                          ${isSelected 
                            ? "bg-white/20 text-white" 
                            : isPositive 
                              ? "bg-green-100 text-green-700" 
                              : "bg-red-100 text-red-700"
                          }
                        `}>
                          {odds}
                        </div>
                        {isSelected && (
                          <div className="absolute top-2 right-2 text-lg">✓</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>

          {/* Bankroll Controls */}
          <div className="mb-6 bg-white/90 backdrop-blur-sm rounded-3xl shadow-lg border border-rose-100 p-5 space-y-4">
            <div className="text-center">
              <div className="text-xs text-gray-500 mb-1">Remaining Bankroll</div>
              <div className={`text-3xl font-bold ${remaining < 0 ? 'text-red-500' : remaining < 20 ? 'text-amber-500' : 'text-green-600'}`}>
                {formatCurrency(remaining)}
              </div>
              <div className="mt-2 w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                <div 
                  className={`h-full transition-all duration-500 ${
                    remaining < 0 ? 'bg-red-500' : 
                    remaining < 20 ? 'bg-amber-500' : 
                    remaining < 50 ? 'bg-yellow-500' : 'bg-green-500'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, (remaining / STARTING_BANKROLL) * 100))}%` }}
                />
              </div>
            </div>
            
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span className="text-sm font-medium text-gray-700">Bet per pick:</span>
                <input
                  type="number"
                  min="1"
                  max={STARTING_BANKROLL}
                  value={stake}
                  onChange={(e) => setStake(Number(e.target.value))}
                  className="w-24 border-2 border-rose-200 rounded-xl p-2 text-center font-semibold focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent"
                  disabled={locked}
                />
              </div>
              <div className="flex flex-wrap gap-2 justify-center">
                {[5, 10, 25].map((amt) => (
                  <button 
                    key={amt} 
                    type="button" 
                    onClick={() => setStake(amt)} 
                    disabled={locked}
                    className={`
                      px-4 py-2 rounded-xl border-2 font-semibold text-sm
                      transform transition-all duration-200 active:scale-95
                      disabled:opacity-50 disabled:cursor-not-allowed
                      ${stake === amt
                        ? "bg-rose-500 text-white border-rose-500 shadow-md"
                        : "bg-white text-gray-700 border-rose-200 hover:border-rose-300 hover:bg-rose-50"
                      }
                    `}
                  >
                    ${amt}
                  </button>
                ))}
                <button 
                  type="button" 
                  onClick={() => setStake(remaining > 0 ? remaining : stake)} 
                  disabled={locked}
                  className={`
                    px-4 py-2 rounded-xl border-2 font-semibold text-sm
                    transform transition-all duration-200 active:scale-95
                    disabled:opacity-50 disabled:cursor-not-allowed
                    ${stake === remaining && remaining > 0
                      ? "bg-amber-500 text-white border-amber-500 shadow-md"
                      : "bg-white text-gray-700 border-amber-200 hover:border-amber-300 hover:bg-amber-50"
                    }
                  `}
                >
                  All-in
                </button>
              </div>
            </div>
          </div>

          <button 
            onClick={submitBet} 
            disabled={locked || remaining < 0 || Object.keys(picks).length === 0}
            className={`
              w-full py-4 rounded-2xl font-bold text-lg shadow-lg
              transform transition-all duration-200 active:scale-95
              disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
              ${locked 
                ? "bg-gradient-to-r from-gray-400 to-gray-500 text-white" 
                : "bg-gradient-to-r from-rose-500 to-rose-600 text-white hover:from-rose-600 hover:to-rose-700 hover:shadow-xl"
              }
            `}
          >
            {locked ? "✓ Picks Locked In" : "🎲 Lock In Your Picks"}
          </button>
          
          {locked && (
            <div className="mt-4 p-4 bg-green-50 border-2 border-green-200 rounded-2xl text-center animate-bounce-in">
              <p className="text-green-700 font-semibold">🎉 Your picks are locked!</p>
              <p className="text-green-600 text-sm mt-1">Good luck!</p>
            </div>
          )}
        </>
      )}

      {/* Admin Panel */}
      {adminView && (
        <div className="mt-4 space-y-6 animate-fade-in">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold bg-gradient-to-r from-rose-600 to-amber-600 bg-clip-text text-transparent mb-2">
              Admin Control Panel
            </h2>
            <button
              onClick={() => setAdminView(false)}
              className="text-sm text-gray-500 hover:text-gray-700 underline"
            >
              Exit Admin Mode
            </button>
          </div>

          {/* Add Question */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-lg border border-rose-100 p-5 space-y-4">
            <h3 className="font-bold text-lg text-gray-800">➕ Add New Question</h3>
            <input 
              className="w-full border-2 border-rose-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-white" 
              placeholder="Enter your question..." 
              value={newBet.question} 
              onChange={(e) => setNewBet({ ...newBet, question: e.target.value })} 
            />
            <div className="grid grid-cols-2 gap-3">
              <input 
                className="border-2 border-rose-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-white" 
                placeholder="Option A" 
                value={newBet.optionA} 
                onChange={(e) => setNewBet({ ...newBet, optionA: e.target.value })} 
              />
              <input 
                className="border-2 border-rose-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-white" 
                placeholder="Odds A (+150)" 
                value={newBet.oddsA} 
                onChange={(e) => setNewBet({ ...newBet, oddsA: e.target.value })} 
              />
              <input 
                className="border-2 border-rose-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-white" 
                placeholder="Option B" 
                value={newBet.optionB} 
                onChange={(e) => setNewBet({ ...newBet, optionB: e.target.value })} 
              />
              <input 
                className="border-2 border-rose-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 focus:border-transparent bg-white" 
                placeholder="Odds B (+250)" 
                value={newBet.oddsB} 
                onChange={(e) => setNewBet({ ...newBet, oddsB: e.target.value })} 
              />
            </div>
            <button 
              type="button" 
              onClick={addQuestion} 
              className="w-full bg-gradient-to-r from-rose-500 to-rose-600 text-white py-3 rounded-xl font-semibold shadow-md hover:from-rose-600 hover:to-rose-700 transform transition-all duration-200 active:scale-95"
            >
              Add Question
            </button>
          </div>

          {/* Set Winners */}
          {bets.map((bet, i) => (
            <div key={i} className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-lg border border-rose-100 p-5 space-y-3">
              <div className="font-semibold text-base text-gray-800 mb-3">{bet.question}</div>
              <div className="flex gap-3">
                <button 
                  type="button" 
                  onClick={() => setWinner(i, "A")} 
                  className={`
                    flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold
                    shadow-md hover:from-green-600 hover:to-green-700 transform transition-all duration-200 active:scale-95
                    ${bet.winner === "A" ? "ring-4 ring-green-300" : ""}
                  `}
                >
                  {bet.optionA} 🏆
                </button>
                <button 
                  type="button" 
                  onClick={() => setWinner(i, "B")} 
                  className={`
                    flex-1 bg-gradient-to-r from-green-500 to-green-600 text-white py-3 rounded-xl font-semibold
                    shadow-md hover:from-green-600 hover:to-green-700 transform transition-all duration-200 active:scale-95
                    ${bet.winner === "B" ? "ring-4 ring-green-300" : ""}
                  `}
                >
                  {bet.optionB} 🏆
                </button>
              </div>
              {bet.winner && (
                <div className="text-center text-sm text-green-600 font-medium mt-2">
                  ✓ Winner set: {bet.winner === "A" ? bet.optionA : bet.optionB}
                </div>
              )}
            </div>
          ))}

          {/* Leaderboard */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-lg border border-rose-100 p-5">
            <h3 className="font-bold text-lg text-gray-800 mb-4">🏆 Leaderboard</h3>
            {submissions.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No submissions yet</p>
            ) : (
              <div className="space-y-2">
                {submissions.sort((a, b) => b.bankroll - a.bankroll).map((s, i) => (
                  <div 
                    key={i} 
                    className={`
                      flex justify-between items-center p-3 rounded-xl
                      ${i === 0 ? "bg-gradient-to-r from-amber-100 to-yellow-100 border-2 border-amber-300" : "bg-gray-50"}
                      transform transition-all duration-200
                    `}
                  >
                    <div className="flex items-center gap-2">
                      {i === 0 && <span className="text-2xl">👑</span>}
                      <span className={`font-semibold ${i === 0 ? "text-amber-700" : "text-gray-700"}`}>
                        {i + 1}. {s.name}
                      </span>
                    </div>
                    <span className={`font-bold ${i === 0 ? "text-amber-700 text-lg" : "text-gray-700"}`}>
                      {formatCurrency(s.bankroll)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* QR */}
          <div className="bg-white/95 backdrop-blur-sm rounded-3xl shadow-lg border border-rose-100 p-5 text-center">
            <h3 className="font-bold text-lg text-gray-800 mb-4">📱 QR Code for Guests</h3>
            <div className="bg-white p-4 rounded-2xl inline-block shadow-inner">
              <img 
                className="mx-auto rounded-lg" 
                src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${siteUrl}`} 
                alt="QR Code" 
              />
            </div>
            <p className="text-sm text-gray-600 mt-4 font-mono bg-gray-50 p-2 rounded-lg">{siteUrl}</p>
          </div>
        </div>
      )}
    </div>
  );
}

